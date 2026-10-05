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
import { getBoardSparSystemPrompt } from "@/lib/prompts";
import { serializeBoardHierarchical } from "@/lib/utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "@/lib/board-signals";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import type { BoardState } from "@/types/board";

const SYSTEM = getBoardSparSystemPrompt(ADMIN_COACHING_INSTRUCTIONS);

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { messages, boardState } = (await req.json()) as {
    messages: ChatTurn[];
    boardState: BoardState;
  };
  if (!boardState || !Array.isArray(boardState.goals)) {
    return NextResponse.json({ error: "Missing boardState" }, { status: 400 });
  }

  const signals = analyzeBoardSignals(boardState);

  let contextMessage = `${todayLine()}

[System context — the PM clicked "Spar about your board" to start a coaching conversation about their entire board. They haven't said anything yet. Start by asking what's on their mind, and offer 2-3 observations about their board as conversation starters.]

Current board state (IDs in brackets are the ones to use in tool calls):
${serializeBoardHierarchical(boardState)}`;

  if (signals.length > 0) {
    contextMessage += `\n\nStructural analysis (verified facts):\n${formatSignalsForPrompt(signals)}`;
  }

  return sseResponse(async (emit) => {
    const result = await streamChatTurn(
      {
        model: COACH_MODEL,
        max_tokens: 8000,
        output_config: { effort: EFFORT.boardSpar },
        betas: [...FALLBACK_BETAS],
        fallbacks: FALLBACKS,
        system: cachedSystem(SYSTEM),
        tools: BOARD_CHANGE_TOOLS,
        messages: [
          // The board snapshot is reused on every turn of this conversation.
          { role: "user", content: [{ type: "text", text: contextMessage, cache_control: { type: "ephemeral" } }] },
          ...historyToMessages(messages ?? []),
        ],
      },
      emit
    );

    const suggestions = result.toolUses
      .map((t) => toolUseToSuggestion(t.name, t.input as Record<string, unknown>))
      .filter((s): s is BoardChangeSuggestion => s !== null);

    emit({ type: "done", text: result.text, suggestions });
  });
}
