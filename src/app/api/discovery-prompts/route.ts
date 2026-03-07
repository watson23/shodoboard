export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getDiscoveryPromptSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock, generateId } from "@/lib/utils";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";
import type { WorkItem, Outcome, BusinessGoal, DiscoveryPrompt } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { item, outcome, goal } = (await req.json()) as {
    item: WorkItem;
    outcome: Outcome | null;
    goal: BusinessGoal | null;
  };

  // Build text context showing goal > outcome > item with all fields
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

  const contextText = contextLines.join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: getDiscoveryPromptSystemPrompt(ADMIN_COACHING_INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Generate discovery questions for this work item in its context:\n\n${contextText}`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Discovery prompts API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ prompts: [], parseError: true });
    }

    const questions = result.parsed as string[];

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
