export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getSparSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { PLAYBOOKS, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, nudgeContext } = await req.json();

  // Look up the playbook for this nudge's anti-pattern (if available)
  const antiPattern = nudgeContext.nudge.antiPattern || "";
  const playbook = PLAYBOOKS[antiPattern];
  const playbookText = playbook
    ? formatPlaybooksForPrompt([playbook])
    : "No specific playbook for this nudge. Use your general coaching expertise.";

  const contextMessage = `[System context — the PM clicked "Think about this" on one of YOUR coaching nudges. They haven't said anything yet. Start by digging into the issue — don't praise them for noticing it, since you generated the nudge.]

Your nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

The ${nudgeContext.nudge.targetType} it's about:
${JSON.stringify(nudgeContext.target, null, 2)}`;

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
