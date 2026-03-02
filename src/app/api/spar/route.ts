import Anthropic from "@anthropic-ai/sdk";
import { SPAR_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, nudgeContext } = await req.json();

  // nudgeContext: { nudge: { message, question, targetType }, target: the goal/outcome/item object }
  const contextMessage = `I'm looking at this coaching nudge on my board:

Nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

About this ${nudgeContext.nudge.targetType}:
${JSON.stringify(nudgeContext.target, null, 2)}

Help me think through this.`;

  const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];

  // First message is always the context
  claudeMessages.push({ role: "user", content: contextMessage });

  // Then append conversation history
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SPAR_SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Check for suggestion JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let suggestion = null;
    let displayText = text;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.type === "suggestion") {
          suggestion = parsed;
          displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
        }
      } catch {
        // Parse failed
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
