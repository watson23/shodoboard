export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getBoardSparSystemPrompt } from "@/lib/prompts";
import { serializeBoardHierarchical, extractTextFromResponse } from "@/lib/utils";
import type { BoardState } from "@/types/board";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, boardState } = await req.json();

  // Build a compact board summary for context
  const boardSummary = serializeBoardHierarchical(boardState as unknown as BoardState);

  const contextMessage = `[System context — the PM clicked "Sparraa taulua" to start a coaching conversation about their entire board. They haven't said anything yet. Start by asking what's on their mind, and offer 2-3 observations about their board as conversation starters.]

Current board state:
${boardSummary}`;

  const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];
  claudeMessages.push({ role: "user", content: contextMessage });

  if (messages && messages.length > 0) {
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
      max_tokens: 1024,
      system: getBoardSparSystemPrompt(ADMIN_COACHING_INSTRUCTIONS),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Board spar API error:", error);
    return NextResponse.json(
      { error: "Failed to get coaching response" },
      { status: 500 }
    );
  }
}
