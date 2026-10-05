"use client";

/**
 * Reads a server-sent event response produced by `sseResponse` and calls
 * `onEvent` for each JSON event. Resolves when the stream ends.
 */
export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

export async function readSse(
  res: Response,
  onEvent: (event: SseEvent) => void
): Promise<void> {
  if (!res.body) throw new Error("Response has no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)) as SseEvent);
        } catch (err) {
          console.error("Bad SSE line:", line, err);
        }
      }
    }
  }
}

/**
 * Convenience wrapper for chat routes: streams text into `onText` and returns
 * the final `done` event payload. Throws on an `error` event.
 */
export async function streamChat<T extends SseEvent>(
  url: string,
  body: unknown,
  onText: (accumulated: string) => void
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  let accumulated = "";
  let done: T | null = null;
  let error: string | null = null;

  await readSse(res, (event) => {
    if (event.type === "text") {
      accumulated += String(event.delta ?? "");
      onText(accumulated);
    } else if (event.type === "done") {
      done = event as T;
    } else if (event.type === "error") {
      error = String(event.message ?? "Unknown error");
    }
  });

  if (error) throw new Error(error);
  if (!done) throw new Error("Stream ended without a result");
  return done;
}
