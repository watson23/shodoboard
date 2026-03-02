import type { BoardState } from "@/types/board";

export function generateMarkdownExport(state: BoardState): string {
  const lines: string[] = [];

  lines.push("# Shodoboard Export");
  lines.push(`\nGenerated: ${new Date().toLocaleDateString("fi-FI")}\n`);

  // Business Goals
  lines.push("## Business Goals\n");

  for (const goal of state.goals.sort((a, b) => a.order - b.order)) {
    lines.push(`### ${goal.statement}`);
    if (goal.timeframe) lines.push(`- **Timeframe:** ${goal.timeframe}`);
    if (goal.metrics.length > 0) {
      lines.push(`- **Metrics:** ${goal.metrics.join(", ")}`);
    }
    lines.push("");

    // Outcomes for this goal
    const goalOutcomes = state.outcomes
      .filter((o) => o.goalId === goal.id)
      .sort((a, b) => a.order - b.order);

    for (const outcome of goalOutcomes) {
      lines.push(`#### ${outcome.statement}`);
      if (outcome.behaviorChange) {
        lines.push(`- **Behavior change:** ${outcome.behaviorChange}`);
      }
      if (outcome.measureOfSuccess) {
        lines.push(`- **Measure of success:** ${outcome.measureOfSuccess}`);
      }

      // Work items for this outcome
      const outcomeItems = state.items
        .filter((i) => i.outcomeId === outcome.id)
        .sort((a, b) => a.order - b.order);

      if (outcomeItems.length > 0) {
        lines.push("- **Work items:**");
        for (const item of outcomeItems) {
          const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
          const columnLabel = item.column.charAt(0).toUpperCase() + item.column.slice(1);
          lines.push(`  - [${typeLabel}] ${item.title} *(${columnLabel})*`);
        }
      }
      lines.push("");
    }
  }

  // Unlinked items
  const unlinkedItems = state.items.filter((i) => i.outcomeId === null);
  if (unlinkedItems.length > 0) {
    lines.push("## Items Not Yet Linked to an Outcome\n");
    for (const item of unlinkedItems) {
      const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
      lines.push(`- [${typeLabel}] ${item.title}`);
      if (item.description) lines.push(`  - ${item.description}`);
    }
    lines.push("");
  }

  // Active nudges as coaching notes
  const activeNudges = state.nudges.filter((n) => n.status === "active");
  if (activeNudges.length > 0) {
    lines.push("## Coaching Notes\n");
    for (const nudge of activeNudges) {
      lines.push(`- ${nudge.message} *${nudge.question}*`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
