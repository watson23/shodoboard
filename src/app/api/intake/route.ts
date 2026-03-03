import Anthropic from "@anthropic-ai/sdk";
import { getIntakeSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, backlog, goals, images } = await req.json();

  const claudeMessages: Anthropic.MessageParam[] = [];

  if (!messages || messages.length === 0) {
    const content: Anthropic.ContentBlockParam[] = [];

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
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: getIntakeSystemPrompt(),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);
    let boardData = null;
    let displayText = text;

    if (result) {
      const parsed = result.parsed as { type?: string };
      if (parsed.type === "board_ready") {
        boardData = parsed;
        displayText = result.displayText;
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
