export const maxDuration = 60;

import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextRequest, NextResponse } from "next/server";
import { getClient, hasApiKey, cachedSystem, FAST_MODEL, EFFORT, FALLBACKS, FALLBACK_BETAS } from "@/lib/ai";
import { getDiscoveryPromptSystemPrompt } from "@/lib/prompts";
import { generateId } from "@/lib/utils";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import type { WorkItem, Outcome, BusinessGoal, DiscoveryPrompt } from "@/types/board";

const SYSTEM = getDiscoveryPromptSystemPrompt(ADMIN_COACHING_INSTRUCTIONS);

const Schema = z.object({
  questions: z.array(z.string()).describe("3-5 open-ended discovery questions"),
});

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { item, outcome, goal } = (await req.json()) as {
    item: WorkItem;
    outcome: Outcome | null;
    goal: BusinessGoal | null;
  };

  const contextLines: string[] = [];
  if (goal) {
    contextLines.push(`GOAL: ${goal.statement}`);
    if (goal.timeframe) contextLines.push(`  Timeframe: ${goal.timeframe}`);
    if (goal.metrics && goal.metrics.length > 0) {
      contextLines.push(`  Metrics: ${goal.metrics.join(", ")}`);
    }
  }
  if (outcome) {
    contextLines.push(`OUTCOME: ${outcome.statement}`);
    if (outcome.behaviorChange) contextLines.push(`  Behavior change: ${outcome.behaviorChange}`);
    if (outcome.measureOfSuccess) contextLines.push(`  Measure of success: ${outcome.measureOfSuccess}`);
  }
  contextLines.push(`WORK ITEM: ${item.title}`);
  contextLines.push(`  Type: ${item.type}`);
  contextLines.push(`  Column: ${item.column}`);
  if (item.description) contextLines.push(`  Description: ${item.description}`);

  try {
    const response = await getClient().beta.messages.parse({
      model: FAST_MODEL,
      max_tokens: 4000,
      output_config: { effort: EFFORT.discovery, format: betaZodOutputFormat(Schema) },
      betas: [...FALLBACK_BETAS],
      fallbacks: FALLBACKS,
      system: cachedSystem(SYSTEM),
      messages: [
        {
          role: "user",
          content: `Generate discovery questions for this work item in its context:\n\n${contextLines.join("\n")}`,
        },
      ],
    });

    const questions = response.parsed_output?.questions ?? [];
    if (questions.length === 0) {
      console.error("Discovery prompts API: empty response", response.stop_reason);
      return NextResponse.json({ prompts: [], parseError: true });
    }

    const prompts: DiscoveryPrompt[] = questions.map((question) => ({
      id: generateId("dp"),
      itemId: item.id,
      text: question,
      checked: false,
    }));

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Discovery prompts API error:", error);
    return NextResponse.json({ prompts: [] }, { status: 500 });
  }
}
