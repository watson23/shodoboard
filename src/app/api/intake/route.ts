export const maxDuration = 60;

import { toFile } from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaTool,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { NextRequest, NextResponse } from "next/server";
import {
  getClient,
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
} from "@/lib/ai";
import { streamChatTurn } from "@/lib/chat-stream";
import { getIntakeSystemPrompt } from "@/lib/prompts";

const SYSTEM = getIntakeSystemPrompt();

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

interface UploadedFileRef {
  id: string;
  kind: "image" | "document";
}

interface IntakeBody {
  messages: ChatTurn[];
  backlog?: string;
  goals?: string;
  /** Inline attachments, sent on the first turn only. */
  images?: { base64: string; mediaType: string; name: string }[];
  pdfs?: { base64: string; name: string }[];
  /** Files already uploaded on an earlier turn. */
  files?: UploadedFileRef[];
}

/** The board the coach proposes. Strict schema: the client can trust the shape. */
const PROPOSE_BOARD_TOOL: BetaTool = {
  name: "propose_board",
  description:
    "Create the outcome-driven board once the PM has confirmed the goal and outcome structure.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["productName", "goals", "outcomes", "items"],
    properties: {
      productName: { type: "string", description: "Short product name derived from the backlog" },
      goals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["statement", "timeframe", "metrics"],
          properties: {
            statement: { type: "string" },
            timeframe: { type: "string" },
            metrics: { type: "array", items: { type: "string" } },
          },
        },
      },
      outcomes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["goalIndex", "statement", "behaviorChange", "measureOfSuccess"],
          properties: {
            goalIndex: { type: "integer", description: "Index into goals" },
            statement: { type: "string" },
            behaviorChange: { type: "string" },
            measureOfSuccess: { type: "string" },
          },
        },
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["outcomeIndex", "title", "description", "type", "column"],
          properties: {
            outcomeIndex: { type: ["integer", "null"], description: "Index into outcomes, or null if unlinked" },
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["discovery", "delivery"] },
            column: {
              type: "string",
              enum: ["opportunities", "discovering", "ready", "building", "shipped", "measuring"],
            },
          },
        },
      },
    },
  },
};

/**
 * Upload attachments once so later turns reference them by ID instead of
 * re-sending megabytes of base64. Falls back to inline content if the upload
 * fails for any reason.
 */
async function uploadAttachments(body: IntakeBody): Promise<UploadedFileRef[] | null> {
  const client = getClient();
  const refs: UploadedFileRef[] = [];
  try {
    for (const img of body.images ?? []) {
      const uploaded = await client.files.upload({
        file: await toFile(Buffer.from(img.base64, "base64"), img.name || "image", {
          type: img.mediaType,
        }),
      });
      refs.push({ id: uploaded.id, kind: "image" });
    }
    for (const pdf of body.pdfs ?? []) {
      const uploaded = await client.files.upload({
        file: await toFile(Buffer.from(pdf.base64, "base64"), pdf.name || "document.pdf", {
          type: "application/pdf",
        }),
      });
      refs.push({ id: uploaded.id, kind: "document" });
    }
    return refs;
  } catch (err) {
    console.warn("[intake] file upload failed, falling back to inline attachments:", err);
    return null;
  }
}

function buildFirstUserMessage(body: IntakeBody, files: UploadedFileRef[] | null): BetaMessageParam {
  const content: BetaContentBlockParam[] = [];
  let attachmentCount = 0;

  if (files) {
    for (const f of files) {
      attachmentCount++;
      content.push(
        f.kind === "image"
          ? { type: "image", source: { type: "file", file_id: f.id } }
          : { type: "document", source: { type: "file", file_id: f.id } }
      );
    }
  } else {
    for (const img of body.images ?? []) {
      attachmentCount++;
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType as ImageMediaType, data: img.base64 },
      });
    }
    for (const pdf of body.pdfs ?? []) {
      attachmentCount++;
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdf.base64 },
      });
    }
  }

  const parts: string[] = [todayLine(), ""];
  if (body.backlog && body.backlog.trim()) {
    parts.push(`Here is my team's backlog:\n\n${body.backlog}`);
  }
  if (attachmentCount > 0) {
    parts.push(
      "I also attached files (photos, screenshots or documents) describing our work. Please read every visible item from them and include it in your analysis."
    );
  }
  if (body.goals && body.goals.trim()) {
    parts.push(`Our current business goals/OKRs:\n\n${body.goals}`);
  }
  if (parts.length === 2) {
    parts.push("Please analyze my backlog.");
  }

  // Cache breakpoint on the last block: the whole first turn (attachments
  // included) is reused on every later turn of the conversation.
  content.push({ type: "text", text: parts.join("\n\n"), cache_control: { type: "ephemeral" } });
  return { role: "user", content };
}

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const body = (await req.json()) as IntakeBody;
  const history = Array.isArray(body.messages) ? body.messages : [];
  const isFirstTurn = history.length === 0;

  // Upload attachments on the first turn; reuse the IDs afterwards.
  let files: UploadedFileRef[] | null = body.files ?? null;
  if (isFirstTurn && ((body.images?.length ?? 0) > 0 || (body.pdfs?.length ?? 0) > 0)) {
    files = await uploadAttachments(body);
  }

  const messages: BetaMessageParam[] = [buildFirstUserMessage(body, files), ...historyToMessages(history)];

  return sseResponse(async (emit) => {
    const result = await streamChatTurn(
      {
        model: COACH_MODEL,
        max_tokens: 16000,
        output_config: { effort: EFFORT.intake },
        betas: [...FALLBACK_BETAS],
        fallbacks: FALLBACKS,
        system: cachedSystem(SYSTEM),
        tools: [PROPOSE_BOARD_TOOL],
        messages,
      },
      emit
    );

    const proposal = result.toolUses.find((t) => t.name === "propose_board");
    emit({
      type: "done",
      text: result.text,
      boardData: proposal ? { type: "board_ready", ...(proposal.input as object) } : null,
      files: files ?? undefined,
    });
  });
}
