import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, backlog, goals } = await req.json();

  // Build conversation for Claude
  const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];

  if (!messages || messages.length === 0) {
    // First request: include backlog context
    let userContent = `Here is my team's backlog:\n\n${backlog}`;
    if (goals && goals.trim()) {
      userContent += `\n\nOur current business goals/OKRs:\n\n${goals}`;
    }
    claudeMessages.push({ role: "user", content: userContent });
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
