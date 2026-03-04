export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getBoardSparSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse } from "@/lib/utils";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, boardState } = await req.json();

  // Build a compact board summary for context
  const boardSummary = buildBoardSummary(boardState);

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

function buildBoardSummary(boardState: Record<string, unknown>): string {
  const goals = (boardState.goals || []) as Array<Record<string, unknown>>;
  const outcomes = (boardState.outcomes || []) as Array<Record<string, unknown>>;
  const items = (boardState.items || []) as Array<Record<string, unknown>>;

  const lines: string[] = [];

  lines.push(`Product: ${boardState.productName || "Unknown"}`);
  lines.push(`${goals.length} goals, ${outcomes.length} outcomes, ${items.length} work items`);
  lines.push("");

  for (const goal of goals) {
    lines.push(`GOAL [${goal.id}]: ${goal.statement}`);
    if (goal.timeframe) lines.push(`  Timeframe: ${goal.timeframe}`);
    if (goal.metrics && (goal.metrics as string[]).length > 0) {
      lines.push(`  Metrics: ${(goal.metrics as string[]).join(", ")}`);
    }

    const goalOutcomes = outcomes.filter((o) => o.goalId === goal.id);
    for (const outcome of goalOutcomes) {
      lines.push(`  OUTCOME [${outcome.id}]: ${outcome.statement}`);
      if (outcome.behaviorChange) lines.push(`    Behavior change: ${outcome.behaviorChange}`);
      if (outcome.measureOfSuccess) lines.push(`    Measure: ${outcome.measureOfSuccess}`);

      const outcomeItems = items.filter((i) => i.outcomeId === outcome.id);
      for (const item of outcomeItems) {
        lines.push(`    ITEM [${item.id}] (${item.type}, ${item.column}): ${item.title}`);
      }
    }
    lines.push("");
  }

  // Unlinked outcomes
  const unlinkedOutcomes = outcomes.filter((o) => !o.goalId);
  if (unlinkedOutcomes.length > 0) {
    lines.push("UNLINKED OUTCOMES:");
    for (const outcome of unlinkedOutcomes) {
      lines.push(`  OUTCOME [${outcome.id}]: ${outcome.statement}`);
      if (outcome.measureOfSuccess) lines.push(`    Measure: ${outcome.measureOfSuccess}`);
    }
    lines.push("");
  }

  // Unlinked items
  const unlinkedItems = items.filter((i) => !i.outcomeId);
  if (unlinkedItems.length > 0) {
    lines.push("UNLINKED ITEMS:");
    for (const item of unlinkedItems) {
      lines.push(`  ITEM [${item.id}] (${item.type}, ${item.column}): ${item.title}`);
    }
  }

  return lines.join("\n");
}
