import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, backlog, goals, images } = await req.json();

  // Build conversation for Claude
  const claudeMessages: Anthropic.MessageParam[] = [];

  if (!messages || messages.length === 0) {
    // First request: include backlog context, optionally with images
    const content: Anthropic.ContentBlockParam[] = [];

    // Add images first if present
    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: img.base64,
          },
        });
      }
    }

    // Build text content
    let textContent = "";
    if (backlog && backlog.trim()) {
      textContent += `Here is my team's backlog:\n\n${backlog}`;
    }
    if (images && images.length > 0) {
      textContent += textContent
        ? "\n\nI also attached photos/screenshots of our task board. Please read all visible items from the images and include them in your analysis."
        : "I attached photos/screenshots of our task board. Please read all visible items from the images and analyze them.";
    }
    if (goals && goals.trim()) {
      textContent += `\n\nOur current business goals/OKRs:\n\n${goals}`;
    }
    if (!textContent) {
      textContent = "Please analyze my backlog.";
    }

    content.push({ type: "text", text: textContent });
    claudeMessages.push({ role: "user", content });
  } else {
    // Subsequent requests: reconstruct conversation
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: INTAKE_SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Check for board_ready JSON block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let boardData = null;
    let displayText = text;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.type === "board_ready") {
          boardData = parsed;
          displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
        }
      } catch {
        // JSON parse failed, treat as regular text
      }
    }

    return NextResponse.json({ text: displayText, boardData });
  } catch (error) {
    console.error("Intake API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze backlog" },
      { status: 500 }
    );
  }
}
