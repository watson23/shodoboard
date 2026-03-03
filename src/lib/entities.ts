import { generateId } from "./utils";
import type { BusinessGoal, Outcome, WorkItem } from "@/types/board";

export function createGoal(overrides?: Partial<BusinessGoal>): BusinessGoal {
  return {
    id: generateId("goal"),
    statement: "Uusi tavoite",
    timeframe: "",
    metrics: [],
    order: 0,
    collapsed: false,
    ...overrides,
  };
}

export function createOutcome(goalId: string, overrides?: Partial<Outcome>): Outcome {
  return {
    id: generateId("outcome"),
    goalId,
    statement: "Uusi tulos",
    behaviorChange: "",
    measureOfSuccess: "",
    order: 0,
    collapsed: false,
    ...overrides,
  };
}

export function createItem(outcomeId: string | null, overrides?: Partial<WorkItem>): WorkItem {
  return {
    id: generateId("item"),
    outcomeId,
    title: "Uusi työ",
    description: "",
    type: "delivery",
    column: "opportunities",
    order: 0,
    ...overrides,
  };
}
