import Anthropic from "@anthropic-ai/sdk";
import { NUDGE_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { boardState } = (await req.json()) as { boardState: BoardState };

  // Serialize board state for Claude (only relevant fields)
  const boardDescription = JSON.stringify(
    {
      goals: boardState.goals.map((g) => ({
        id: g.id,
        statement: g.statement,
        timeframe: g.timeframe,
        metrics: g.metrics,
      })),
      outcomes: boardState.outcomes.map((o) => ({
        id: o.id,
        goalId: o.goalId,
        statement: o.statement,
        behaviorChange: o.behaviorChange,
        measureOfSuccess: o.measureOfSuccess,
      })),
      items: boardState.items.map((i) => ({
        id: i.id,
        outcomeId: i.outcomeId,
        title: i.title,
        description: i.description,
        type: i.type,
        column: i.column,
      })),
    },
    null,
    2
  );

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: NUDGE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nGenerate 5 coaching nudges.`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse nudges JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let nudges: Array<{
      id: string;
      targetType: string;
      targetId: string;
      tier: string;
      message: string;
      question: string;
      status: string;
    }> = [];

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        nudges = parsed.map(
          (
            n: {
              targetType: string;
              targetId: string;
              tier: string;
              message: string;
              question: string;
            },
            i: number
          ) => ({
            id: `nudge-${Date.now()}-${i}`,
            targetType: n.targetType,
            targetId: n.targetId,
            tier: n.tier,
            message: n.message,
            question: n.question,
            status: "active",
          })
        );
      } catch {
        // Parse failed — return empty nudges
      }
    }

    return NextResponse.json({ nudges });
  } catch (error) {
    console.error("Nudge API error:", error);
    return NextResponse.json({ nudges: [] }, { status: 500 });
  }
}
