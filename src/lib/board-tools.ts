/**
 * Tool definitions the coach uses to propose board changes.
 *
 * The model calls these instead of emitting JSON blocks in prose. `strict`
 * guarantees the arguments match the schema, and the PM still approves each
 * change with the Apply button, so the coach can only *propose*.
 */
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { BoardChangeSuggestion } from "./ai";

const strictTool = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[]
): BetaTool => ({
  name,
  description,
  strict: true,
  input_schema: {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  },
});

const summary = {
  type: "string",
  description: "One short sentence, in the PM's language, saying what this change does and why.",
};

export const BOARD_CHANGE_TOOLS: BetaTool[] = [
  strictTool(
    "update_goal",
    "Propose new wording, timeframe or metrics for an existing goal. Only include the fields you want to change.",
    {
      goalId: { type: "string", description: "ID of the goal from the board context." },
      statement: { type: ["string", "null"] },
      timeframe: { type: ["string", "null"] },
      metrics: { type: ["array", "null"], items: { type: "string" } },
      summary,
    },
    ["goalId", "statement", "timeframe", "metrics", "summary"]
  ),
  strictTool(
    "update_outcome",
    "Propose new wording, behavior change or measure of success for an existing outcome. Only include the fields you want to change.",
    {
      outcomeId: { type: "string", description: "ID of the outcome from the board context." },
      statement: { type: ["string", "null"] },
      behaviorChange: { type: ["string", "null"] },
      measureOfSuccess: { type: ["string", "null"] },
      summary,
    },
    ["outcomeId", "statement", "behaviorChange", "measureOfSuccess", "summary"]
  ),
  strictTool(
    "update_item",
    "Propose a new title, description or type for an existing work item. Only include the fields you want to change.",
    {
      itemId: { type: "string", description: "ID of the work item from the board context." },
      title: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      type: { anyOf: [{ type: "string", enum: ["discovery", "delivery"] }, { type: "null" }] },
      summary,
    },
    ["itemId", "title", "description", "type", "summary"]
  ),
  strictTool(
    "add_item",
    "Propose a new work item (usually a discovery item) under an outcome.",
    {
      outcomeId: {
        type: ["string", "null"],
        description: "ID of the outcome to link the new item to, or null for an unlinked item.",
      },
      title: { type: "string" },
      description: { type: "string" },
      type: { type: "string", enum: ["discovery", "delivery"] },
      summary,
    },
    ["outcomeId", "title", "description", "type", "summary"]
  ),
  strictTool(
    "split_item",
    "Propose splitting an existing work item by creating a new item next to it (for example separating discovery from delivery).",
    {
      itemId: { type: "string", description: "ID of the item being split." },
      title: { type: "string", description: "Title of the new split-off item." },
      description: { type: "string" },
      type: { type: "string", enum: ["discovery", "delivery"] },
      summary,
    },
    ["itemId", "title", "description", "type", "summary"]
  ),
];

/** Translate a tool call into the suggestion shape the board UI applies. */
export function toolUseToSuggestion(
  name: string,
  input: Record<string, unknown>
): BoardChangeSuggestion | null {
  const { summary: s, ...rest } = input;
  const summaryText = typeof s === "string" ? s : undefined;
  const changes = Object.fromEntries(
    Object.entries(rest).filter(([k, v]) => v !== null && !k.endsWith("Id"))
  );
  switch (name) {
    case "update_goal":
      return { action: "update_goal", targetId: String(input.goalId), changes, summary: summaryText };
    case "update_outcome":
      return { action: "update_outcome", targetId: String(input.outcomeId), changes, summary: summaryText };
    case "update_item":
      return { action: "update_item", targetId: String(input.itemId), changes, summary: summaryText };
    case "add_item":
      return {
        action: "add_item",
        targetId: input.outcomeId ? String(input.outcomeId) : undefined,
        changes,
        summary: summaryText,
      };
    case "split_item":
      return { action: "split_item", targetId: String(input.itemId), changes, summary: summaryText };
    default:
      return null;
  }
}
