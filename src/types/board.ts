export type Column = "opportunities" | "discovering" | "ready" | "building" | "shipped" | "measuring";

export type ItemType = "discovery" | "delivery";

export type NudgeTier = "quiet" | "visible";

export type NudgeStatus = "active" | "dismissed" | "snoozed";

export interface BusinessGoal {
  id: string;
  statement: string;
  timeframe?: string;
  metrics: string[];
  order: number;
  collapsed: boolean;
}

export interface Outcome {
  id: string;
  goalId: string | null;
  statement: string;
  behaviorChange: string;
  measureOfSuccess: string;
  order: number;
  collapsed: boolean;
}

export interface WorkItem {
  id: string;
  outcomeId: string | null;
  title: string;
  description: string;
  type: ItemType;
  column: Column;
  assignee?: string;
  order: number;
}

export interface Nudge {
  id: string;
  targetType: "goal" | "outcome" | "item";
  targetId: string;
  tier: NudgeTier;
  message: string;
  question: string;
  status: NudgeStatus;
  priority?: "high" | "medium" | "low";
  suggestedAction?: string;
}

export interface DiscoveryPrompt {
  id: string;
  itemId: string;
  text: string;
  checked: boolean;
}

export type FocusItemStatus = "pending" | "in_progress" | "done";

export interface FocusItem {
  id: string;
  priority: "high" | "medium" | "low";
  status: FocusItemStatus;
  title: string;
  whyItMatters: string;
  antiPattern: string;
  targetType: "goal" | "outcome" | "item";
  targetId: string;
  suggestedAction: string;
}

export interface BoardState {
  goals: BusinessGoal[];
  outcomes: Outcome[];
  items: WorkItem[];
  nudges: Nudge[];
  discoveryPrompts: DiscoveryPrompt[];
  focusItems: FocusItem[];
}
