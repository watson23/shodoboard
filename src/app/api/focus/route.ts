import Anthropic from "@anthropic-ai/sdk";
import { FOCUS_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState, FocusItem } from "@/types/board";

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
      system: FOCUS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nAnalyze the board and generate 3-5 prioritized coaching focus areas.`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse focus JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let analysis = {
      totalItems: 0,
      deliveryItems: 0,
      discoveryItems: 0,
      outcomesWithoutMeasure: 0,
      unlinkedItems: 0,
    };
    let focusItems: FocusItem[] = [];

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        analysis = parsed.analysis;
        focusItems = parsed.focusItems.map(
          (
            f: {
              priority: "high" | "medium" | "low";
              title: string;
              whyItMatters: string;
              antiPattern: string;
              targetType: "goal" | "outcome" | "item";
              targetId: string;
              suggestedAction: string;
            },
            i: number
          ) => ({
            id: `focus-${Date.now()}-${i}`,
            priority: f.priority,
            status: "pending",
            title: f.title,
            whyItMatters: f.whyItMatters,
            antiPattern: f.antiPattern,
            targetType: f.targetType,
            targetId: f.targetId,
            suggestedAction: f.suggestedAction,
          })
        );
      } catch {
        // Parse failed — return empty focus items
      }
    }

    return NextResponse.json({ analysis, focusItems });
  } catch (error) {
    console.error("Focus API error:", error);
    return NextResponse.json(
      { analysis: null, focusItems: [] },
      { status: 500 }
    );
  }
}
