export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  hasApiKey,
  cachedSystem,
  todayLine,
  historyToMessages,
  sseResponse,
  COACH_MODEL,
  EFFORT,
  FALLBACKS,
  FALLBACK_BETAS,
  type ChatTurn,
  type BoardChangeSuggestion,
} from "@/lib/ai";
import { streamChatTurn } from "@/lib/chat-stream";
import { BOARD_CHANGE_TOOLS, toolUseToSuggestion } from "@/lib/board-tools";
import { getSparSystemPrompt } from "@/lib/prompts";
import { PLAYBOOKS, ALL_PLAYBOOKS_TEXT } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import type { BoardState, Nudge } from "@/types/board";

const SYSTEM = getSparSystemPrompt(ALL_PLAYBOOKS_TEXT, ADMIN_COACHING_INSTRUCTIONS);

function buildSubtreeContext(
  boardState: BoardState | undefined,
  targetType: "goal" | "outcome" | "item",
  targetId: string
): string {
  if (!boardState || !Array.isArray(boardState.goals) ||
      !Array.isArray(boardState.outcomes) || !Array.isArray(boardState.items)) {
    return "";
  }

  const { goals, outcomes, items } = boardState;

  if (targetType === "goal") {
    const goal = goals.find((g) => g.id === targetId);
    if (!goal) return "";

    const goalOutcomes = outcomes.filter((o) => o.goalId === goal.id);
    const lines: string[] = [
      `Goal [${goal.id}]: "${goal.statement}"${goal.timeframe ? ` (timeframe: ${goal.timeframe})` : ""}`,
      `  Metrics: ${goal.metrics.length > 0 ? goal.metrics.join(", ") : "(none)"}`,
    ];

    for (const oc of goalOutcomes) {
      lines.push(`  Outcome [${oc.id}]: "${oc.statement}" (measure: ${oc.measureOfSuccess || "(none)"})`);
      const ocItems = items.filter((i) => i.outcomeId === oc.id);
      for (const item of ocItems) {
        lines.push(`    Item [${item.id}]: "${item.title}" [${item.type}, ${item.column}]`);
      }
    }

    return lines.join("\n");
  }

  if (targetType === "outcome") {
    const outcome = outcomes.find((o) => o.id === targetId);
    if (!outcome) return "";

    const parentGoal = outcome.goalId
      ? goals.find((g) => g.id === outcome.goalId)
      : undefined;

    const lines: string[] = [];

    if (parentGoal) {
      lines.push(
        `Parent goal [${parentGoal.id}]: "${parentGoal.statement}"${parentGoal.timeframe ? ` (timeframe: ${parentGoal.timeframe})` : ""}`,
        `  Metrics: ${parentGoal.metrics.length > 0 ? parentGoal.metrics.join(", ") : "(none)"}`
      );

      const siblingOutcomes = outcomes.filter(
        (o) => o.goalId === parentGoal.id && o.id !== outcome.id
      );
      if (siblingOutcomes.length > 0) {
        lines.push(`Sibling outcomes under this goal:`);
        for (const sib of siblingOutcomes) {
          lines.push(`  - [${sib.id}] "${sib.statement}" (measure: ${sib.measureOfSuccess || "(none)"})`);
        }
      }
    }

    const childItems = items.filter((i) => i.outcomeId === outcome.id);
    if (childItems.length > 0) {
      lines.push(`Child items under this outcome:`);
      for (const item of childItems) {
        lines.push(`  - [${item.id}] "${item.title}" [${item.type}, ${item.column}]`);
      }
    }

    return lines.join("\n");
  }

  if (targetType === "item") {
    const item = items.find((i) => i.id === targetId);
    if (!item) return "";

    const lines: string[] = [];

    const parentOutcome = item.outcomeId
      ? outcomes.find((o) => o.id === item.outcomeId)
      : undefined;

    if (parentOutcome) {
      lines.push(
        `Parent outcome [${parentOutcome.id}]: "${parentOutcome.statement}" (behaviorChange: ${parentOutcome.behaviorChange || "(none)"}, measure: ${parentOutcome.measureOfSuccess || "(none)"})`
      );

      const parentGoal = parentOutcome.goalId
        ? goals.find((g) => g.id === parentOutcome.goalId)
        : undefined;

      if (parentGoal) {
        lines.push(`Parent goal [${parentGoal.id}]: "${parentGoal.statement}"`);
      }

      const siblingItems = items.filter(
        (i) => i.outcomeId === parentOutcome.id && i.id !== item.id
      );
      if (siblingItems.length > 0) {
        lines.push(`Sibling items under this outcome:`);
        for (const sib of siblingItems) {
          lines.push(`  - [${sib.id}] "${sib.title}" [${sib.type}, ${sib.column}]`);
        }
      }
    }

    return lines.join("\n");
  }

  return "";
}

interface SparBody {
  messages: ChatTurn[];
  nudgeContext: { nudge: Nudge; target: unknown };
  boardState?: BoardState;
}

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { messages, nudgeContext, boardState } = (await req.json()) as SparBody;
  if (!nudgeContext?.nudge) {
    return NextResponse.json({ error: "Missing nudgeContext" }, { status: 400 });
  }
  const nudge = nudgeContext.nudge;
  const playbook = nudge.antiPattern ? PLAYBOOKS[nudge.antiPattern] : undefined;
  const playbookLine = playbook
    ? `Relevant playbook: "${playbook.name}" (${playbook.id}).`
    : "No specific playbook for this nudge. Use your general coaching expertise.";

  const subtreeContext = buildSubtreeContext(boardState, nudge.targetType, nudge.targetId);

  const contextMessage = `${todayLine()}

[System context — the PM clicked "Think about this" on one of YOUR coaching nudges. They haven't said anything yet. Start by digging into the issue — don't praise them for noticing it, since you generated the nudge.]

Your nudge: "${nudge.message} ${nudge.question}"
${playbookLine}

The ${nudge.targetType} [${nudge.targetId}] it's about:
${JSON.stringify(nudgeContext.target, null, 2)}${
    subtreeContext
      ? `

Board context (related entities):
${subtreeContext}`
      : ""
  }`;

  return sseResponse(async (emit) => {
    const result = await streamChatTurn(
      {
        model: COACH_MODEL,
        max_tokens: 8000,
        output_config: { effort: EFFORT.spar },
        betas: [...FALLBACK_BETAS],
        fallbacks: FALLBACKS,
        system: cachedSystem(SYSTEM),
        tools: BOARD_CHANGE_TOOLS,
        messages: [{ role: "user", content: contextMessage }, ...historyToMessages(messages ?? [])],
      },
      emit
    );

    const suggestions = result.toolUses
      .map((t) => toolUseToSuggestion(t.name, t.input as Record<string, unknown>))
      .filter((s): s is BoardChangeSuggestion => s !== null);

    emit({ type: "done", text: result.text, suggestions });
  });
}
