import Anthropic from "@anthropic-ai/sdk";
import { getFocusSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "@/lib/board-signals";
import { getPlaybooksForSignals, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState, FocusItem } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };

  const signals = analyzeBoardSignals(boardState);
  const structuralFacts = formatSignalsForPrompt(signals);

  const structuralPatternIds = signals.map((s) => s.antiPattern);
  const contentPlaybookIds = [
    "output-not-outcome", "weak-measure", "measure-mismatch",
    "assumption-risk", "goal-framing", "solution-as-problem",
    "missing-who", "vague-goal", "duplicate-intent",
    "timeframe-mismatch", "discovery-quality",
  ];
  const playbooks = getPlaybooksForSignals([...structuralPatternIds, ...contentPlaybookIds]);
  const playbookText = formatPlaybooksForPrompt(playbooks);

  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: getFocusSystemPrompt(structuralFacts, playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Here is the full board content:\n\n${boardDescription}\n\nCreate a prioritized coaching agenda.`,
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
