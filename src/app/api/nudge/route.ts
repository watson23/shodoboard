import Anthropic from "@anthropic-ai/sdk";
import { getNudgeSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };
  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getNudgeSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nGenerate 5 coaching nudges.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Nudge API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ nudges: [], parseError: true });
    }

    const parsed = result.parsed as Array<{
      targetType: string;
      targetId: string;
      tier: string;
      message: string;
      question: string;
    }>;

    const nudges = parsed.map((n, i) => ({
      id: `nudge-${Date.now()}-${i}`,
      targetType: n.targetType,
      targetId: n.targetId,
      tier: n.tier,
      message: n.message,
      question: n.question,
      status: "active",
    }));

    return NextResponse.json({ nudges });
  } catch (error) {
    console.error("Nudge API error:", error);
    return NextResponse.json({ nudges: [] }, { status: 500 });
  }
}
