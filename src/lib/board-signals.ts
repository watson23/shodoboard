import type { BoardState } from "@/types/board";

export type AntiPatternId =
  | "unmeasured-outcome"
  | "output-only-goal"
  | "shipped-not-learning"
  | "orphan-work"
  | "scope-creep"
  | "stale-discovery"
  | "no-discovery-board-wide"
  | "discovery-delivery-ratio"
  | "bottleneck"
  | "empty-goal"
  | "measuring-without-measure"
  | "all-early-stage"
  | "unbalanced-outcomes";

export interface BoardSignal {
  id: string;
  antiPattern: AntiPatternId;
  severity: "high" | "medium" | "low";
  targetType: "goal" | "outcome" | "item" | "board";
  targetId: string;
  evidence: Record<string, unknown>;
  humanReadable: string;
}

export function analyzeBoardSignals(state: BoardState): BoardSignal[] {
  const signals: BoardSignal[] = [];

  // --- Outcome-level detectors ---
  for (const outcome of state.outcomes) {
    const items = state.items.filter((i) => i.outcomeId === outcome.id);
    const byColumn = (col: string) => items.filter((i) => i.column === col);

    // unmeasured-outcome
    if (!outcome.measureOfSuccess || outcome.measureOfSuccess.trim() === "") {
      signals.push({
        id: `unmeasured-outcome:${outcome.id}`,
        antiPattern: "unmeasured-outcome",
        severity: "high",
        targetType: "outcome",
        targetId: outcome.id,
        evidence: { statement: outcome.statement },
        humanReadable: `Outcome "${outcome.statement}" has no measure of success defined.`,
      });
    }

    // shipped-not-learning — only flag when no work remains in earlier stages
    const shippedCount = byColumn("shipped").length;
    const measuringCount = byColumn("measuring").length;
    const inProgressCount = byColumn("building").length + byColumn("ready").length + byColumn("discovering").length;
    if (shippedCount > 0 && measuringCount === 0 && inProgressCount === 0) {
      signals.push({
        id: `shipped-not-learning:${outcome.id}`,
        antiPattern: "shipped-not-learning",
        severity: "medium",
        targetType: "outcome",
        targetId: outcome.id,
        evidence: { shippedCount, measuringCount, inProgressCount, statement: outcome.statement },
        humanReadable: `Outcome "${outcome.statement}": ${shippedCount} shipped, 0 measuring — all work is done but no one is looking at data.`,
      });
    }

    // measuring-without-measure
    if (measuringCount > 0 && (!outcome.measureOfSuccess || outcome.measureOfSuccess.trim() === "")) {
      signals.push({
        id: `measuring-without-measure:${outcome.id}`,
        antiPattern: "measuring-without-measure",
        severity: "medium",
        targetType: "outcome",
        targetId: outcome.id,
        evidence: { measuringCount, statement: outcome.statement },
        humanReadable: `Outcome "${outcome.statement}": ${measuringCount} items in measuring, but no measure of success defined.`,
      });
    }

    // all-early-stage
    const earlyStageCount = byColumn("opportunities").length + byColumn("discovering").length;
    if (items.length > 0 && earlyStageCount === items.length) {
      signals.push({
        id: `all-early-stage:${outcome.id}`,
        antiPattern: "all-early-stage",
        severity: "low",
        targetType: "outcome",
        targetId: outcome.id,
        evidence: { itemCount: items.length, statement: outcome.statement },
        humanReadable: `Outcome "${outcome.statement}": all ${items.length} items still in early stage.`,
      });
    }

    // bottleneck
    const columnOrder = ["opportunities", "discovering", "ready", "building", "shipped", "measuring"];
    for (let c = 0; c < columnOrder.length - 1; c++) {
      const currentCount = byColumn(columnOrder[c]).length;
      const nextCount = byColumn(columnOrder[c + 1]).length;
      if (currentCount >= 4 && nextCount === 0) {
        signals.push({
          id: `bottleneck:${outcome.id}:${columnOrder[c]}`,
          antiPattern: "bottleneck",
          severity: "medium",
          targetType: "outcome",
          targetId: outcome.id,
          evidence: { column: columnOrder[c], count: currentCount, nextColumn: columnOrder[c + 1], statement: outcome.statement },
          humanReadable: `Outcome "${outcome.statement}": ${currentCount} items stuck in ${columnOrder[c]}, 0 in ${columnOrder[c + 1]}.`,
        });
      }
    }
  }

  // --- Goal-level detectors ---
  for (const goal of state.goals) {
    const goalOutcomes = state.outcomes.filter((o) => o.goalId === goal.id);
    const outcomeIds = new Set(goalOutcomes.map((o) => o.id));
    const goalItems = state.items.filter((i) => i.outcomeId && outcomeIds.has(i.outcomeId));
    const discoveryCount = goalItems.filter((i) => i.type === "discovery").length;
    const deliveryCount = goalItems.filter((i) => i.type === "delivery").length;

    // output-only-goal
    if (goalItems.length > 0 && discoveryCount === 0) {
      signals.push({
        id: `output-only-goal:${goal.id}`,
        antiPattern: "output-only-goal",
        severity: "high",
        targetType: "goal",
        targetId: goal.id,
        evidence: { deliveryCount, discoveryCount, statement: goal.statement },
        humanReadable: `Goal "${goal.statement}": ${deliveryCount} delivery items, 0 discovery.`,
      });
    }

    // scope-creep — only flag very large goals, as neutral observation
    if (goalItems.length > 10) {
      signals.push({
        id: `scope-creep:${goal.id}`,
        antiPattern: "scope-creep",
        severity: "low",
        targetType: "goal",
        targetId: goal.id,
        evidence: { itemCount: goalItems.length, statement: goal.statement },
        humanReadable: `Goal "${goal.statement}" has ${goalItems.length} work items linked to it.`,
      });
    }

    // empty-goal
    if (goalOutcomes.length === 0) {
      signals.push({
        id: `empty-goal:${goal.id}`,
        antiPattern: "empty-goal",
        severity: "high",
        targetType: "goal",
        targetId: goal.id,
        evidence: { statement: goal.statement },
        humanReadable: `Goal "${goal.statement}": no outcomes linked.`,
      });
    }

    // unbalanced-outcomes
    if (goalOutcomes.length >= 2) {
      const itemCounts = goalOutcomes.map((o) => ({
        id: o.id,
        statement: o.statement,
        count: state.items.filter((i) => i.outcomeId === o.id).length,
      }));
      const max = Math.max(...itemCounts.map((c) => c.count));
      const min = Math.min(...itemCounts.map((c) => c.count));
      if (max >= 6 && min <= 1) {
        signals.push({
          id: `unbalanced-outcomes:${goal.id}`,
          antiPattern: "unbalanced-outcomes",
          severity: "low",
          targetType: "goal",
          targetId: goal.id,
          evidence: { itemCounts, statement: goal.statement },
          humanReadable: `Goal "${goal.statement}": outcome item counts range from ${min} to ${max}.`,
        });
      }
    }
  }

  // --- Item-level detectors ---
  const orphanItems = state.items.filter((i) => i.outcomeId === null);
  for (const item of orphanItems) {
    signals.push({
      id: `orphan-work:${item.id}`,
      antiPattern: "orphan-work",
      severity: orphanItems.length > 3 ? "high" : "low",
      targetType: "item",
      targetId: item.id,
      evidence: { title: item.title, totalOrphans: orphanItems.length },
      humanReadable: `Item "${item.title}" is not linked to any outcome.`,
    });
  }

  // Only flag stale discovery if the board shows activity (items beyond opportunities/ready)
  const boardHasActivity = state.items.some(
    (i) => i.column !== "opportunities" && i.column !== "ready"
  );
  if (boardHasActivity) {
    for (const item of state.items) {
      if (item.type === "discovery" && item.column === "opportunities") {
        signals.push({
          id: `stale-discovery:${item.id}`,
          antiPattern: "stale-discovery",
          severity: "low",
          targetType: "item",
          targetId: item.id,
          evidence: { title: item.title },
          humanReadable: `Discovery item "${item.title}" is still in opportunities while other work is progressing.`,
        });
      }
    }
  }

  // --- Board-level detectors ---
  const totalDiscovery = state.items.filter((i) => i.type === "discovery").length;
  const totalDelivery = state.items.filter((i) => i.type === "delivery").length;
  const totalItems = state.items.length;

  if (totalDiscovery === 0 && totalItems > 0) {
    signals.push({
      id: "no-discovery-board-wide",
      antiPattern: "no-discovery-board-wide",
      severity: "high",
      targetType: "board",
      targetId: "board",
      evidence: { totalItems, totalDiscovery, totalDelivery },
      humanReadable: `Entire board: ${totalItems} items, 0 discovery. Full feature factory mode.`,
    });
  } else if (totalItems > 0 && totalDiscovery / totalItems < 0.2) {
    signals.push({
      id: "discovery-delivery-ratio",
      antiPattern: "discovery-delivery-ratio",
      severity: "medium",
      targetType: "board",
      targetId: "board",
      evidence: { totalItems, totalDiscovery, totalDelivery, ratio: Math.round((totalDiscovery / totalItems) * 100) },
      humanReadable: `Board-wide: ${totalDiscovery}/${totalItems} items are discovery (${Math.round((totalDiscovery / totalItems) * 100)}%).`,
    });
  }

  return signals;
}

/** Format signals as a human-readable summary for prompt injection. */
export function formatSignalsForPrompt(signals: BoardSignal[]): string {
  if (signals.length === 0) return "No structural issues detected.";
  return signals.map((s) => `- [${s.antiPattern}] (${s.severity}) ${s.humanReadable}`).join("\n");
}
