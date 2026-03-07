export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getSparSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { PLAYBOOKS, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import type { BoardState } from "@/types/board";
import { NextRequest, NextResponse } from "next/server";

function buildSubtreeContext(
  boardState: BoardState | undefined,
  targetType: "goal" | "outcome" | "item",
  targetId: string
): string {
  if (!boardState) return "";

  const { goals, outcomes, items } = boardState;

  if (targetType === "goal") {
    const goal = goals.find((g) => g.id === targetId);
    if (!goal) return "";

    const goalOutcomes = outcomes.filter((o) => o.goalId === goal.id);
    const lines: string[] = [
      `Goal: "${goal.statement}"${goal.timeframe ? ` (timeframe: ${goal.timeframe})` : ""}`,
      `  Metrics: ${goal.metrics.length > 0 ? goal.metrics.join(", ") : "(none)"}`,
    ];

    for (const oc of goalOutcomes) {
      lines.push(`  Outcome: "${oc.statement}" (measure: ${oc.measureOfSuccess || "(none)"})`);
      const ocItems = items.filter((i) => i.outcomeId === oc.id);
      for (const item of ocItems) {
        lines.push(`    Item: "${item.title}" [${item.type}, ${item.column}]`);
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
        `Parent goal: "${parentGoal.statement}"${parentGoal.timeframe ? ` (timeframe: ${parentGoal.timeframe})` : ""}`,
        `  Metrics: ${parentGoal.metrics.length > 0 ? parentGoal.metrics.join(", ") : "(none)"}`
      );

      const siblingOutcomes = outcomes.filter(
        (o) => o.goalId === parentGoal.id && o.id !== outcome.id
      );
      if (siblingOutcomes.length > 0) {
        lines.push(`Sibling outcomes under this goal:`);
        for (const sib of siblingOutcomes) {
          lines.push(`  - "${sib.statement}" (measure: ${sib.measureOfSuccess || "(none)"})`);
        }
      }
    }

    const childItems = items.filter((i) => i.outcomeId === outcome.id);
    if (childItems.length > 0) {
      lines.push(`Child items under this outcome:`);
      for (const item of childItems) {
        lines.push(`  - "${item.title}" [${item.type}, ${item.column}]`);
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
        `Parent outcome: "${parentOutcome.statement}" (behaviorChange: ${parentOutcome.behaviorChange || "(none)"}, measure: ${parentOutcome.measureOfSuccess || "(none)"})`
      );

      const parentGoal = parentOutcome.goalId
        ? goals.find((g) => g.id === parentOutcome.goalId)
        : undefined;

      if (parentGoal) {
        lines.push(`Parent goal: "${parentGoal.statement}"`);
      }

      const siblingItems = items.filter(
        (i) => i.outcomeId === parentOutcome.id && i.id !== item.id
      );
      if (siblingItems.length > 0) {
        lines.push(`Sibling items under this outcome:`);
        for (const sib of siblingItems) {
          lines.push(`  - "${sib.title}" [${sib.type}, ${sib.column}]`);
        }
      }
    }

    return lines.join("\n");
  }

  return "";
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, nudgeContext, boardState } = await req.json();

  // Look up the playbook for this nudge's anti-pattern (if available)
  const antiPattern = nudgeContext.nudge.antiPattern || "";
  const playbook = PLAYBOOKS[antiPattern];
  const playbookText = playbook
    ? formatPlaybooksForPrompt([playbook])
    : "No specific playbook for this nudge. Use your general coaching expertise.";

  const subtreeContext = buildSubtreeContext(
    boardState,
    nudgeContext.nudge.targetType,
    nudgeContext.nudge.targetId
  );

  const contextMessage = `[System context — the PM clicked "Think about this" on one of YOUR coaching nudges. They haven't said anything yet. Start by digging into the issue — don't praise them for noticing it, since you generated the nudge.]

Your nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

The ${nudgeContext.nudge.targetType} it's about:
${JSON.stringify(nudgeContext.target, null, 2)}${
    subtreeContext
      ? `

Board context (related entities):
${subtreeContext}`
      : ""
  }`;

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
      system: getSparSystemPrompt(playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);
    let suggestion = null;
    let displayText = text;

    if (result) {
      const parsed = result.parsed as { type?: string };
      if (parsed.type === "suggestion") {
        suggestion = parsed;
        displayText = result.displayText;
      }
    }

    return NextResponse.json({ text: displayText, suggestion });
  } catch (error) {
    console.error("Spar API error:", error);
    return NextResponse.json(
      { error: "Failed to get coaching response" },
      { status: 500 }
    );
  }
}
