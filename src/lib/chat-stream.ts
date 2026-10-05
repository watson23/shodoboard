/**
 * Runs one streamed coaching turn and forwards text to the browser as it is
 * generated. Tool calls the model makes (board change proposals, the intake
 * board) are collected from the final message and handed back to the caller.
 */
import type { BetaMessageStreamParams, BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { getClient, type StreamEvent } from "./ai";

export interface ChatTurnResult {
  text: string;
  toolUses: BetaToolUseBlock[];
  stopReason: string | null;
}

export async function streamChatTurn(
  params: BetaMessageStreamParams,
  emit: (event: StreamEvent) => void
): Promise<ChatTurnResult> {
  const stream = getClient().beta.messages.stream(params);

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      emit({ type: "text", delta: event.delta.text });
    }
  }

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(`Request declined (${message.stop_details?.category ?? "unknown"})`);
  }

  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const toolUses = message.content.filter(
    (b): b is BetaToolUseBlock => b.type === "tool_use"
  );

  if (message.stop_reason === "max_tokens") {
    console.warn("[chat] reply hit max_tokens; tool input may be truncated");
  }

  return { text, toolUses, stopReason: message.stop_reason };
}
