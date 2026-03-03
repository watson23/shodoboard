import Anthropic from "@anthropic-ai/sdk";
import { getFocusSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState, FocusItem } from "@/types/board";

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
      system: getFocusSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nAnalyze the board and generate 3-5 prioritized coaching focus areas.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Focus API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ focusItems: [], parseError: true });
    }

    const parsed = result.parsed as { focusItems: Array<{
      priority: "high" | "medium" | "low";
      title: string;
      whyItMatters: string;
      antiPattern: string;
      targetType: "goal" | "outcome" | "item";
      targetId: string;
      suggestedAction: string;
    }> };

    const focusItems: FocusItem[] = parsed.focusItems.map((f, i) => ({
      id: `focus-${Date.now()}-${i}`,
      priority: f.priority,
      status: "pending",
      title: f.title,
      whyItMatters: f.whyItMatters,
      antiPattern: f.antiPattern,
      targetType: f.targetType,
      targetId: f.targetId,
      suggestedAction: f.suggestedAction,
    }));

    return NextResponse.json({ focusItems });
  } catch (error) {
    console.error("Focus API error:", error);
    return NextResponse.json({ focusItems: [] }, { status: 500 });
  }
}
