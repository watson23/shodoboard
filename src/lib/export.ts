import type { BoardState, FocusItem } from "@/types/board";
import { escapeHtml } from "./utils";

interface BoardAnalysis {
  totalItems: number;
  deliveryCount: number;
  discoveryCount: number;
  unlinkedCount: number;
  outcomesWithoutMeasure: number;
  totalOutcomes: number;
  totalGoals: number;
}

function computeBoardAnalysis(state: BoardState): BoardAnalysis {
  const deliveryCount = state.items.filter((i) => i.type === "delivery").length;
  const discoveryCount = state.items.filter((i) => i.type === "discovery").length;
  const unlinkedCount = state.items.filter((i) => i.outcomeId === null).length;
  const outcomesWithoutMeasure = state.outcomes.filter(
    (o) => !o.measureOfSuccess || o.measureOfSuccess.trim() === ""
  ).length;
  return {
    totalItems: state.items.length,
    deliveryCount,
    discoveryCount,
    unlinkedCount,
    outcomesWithoutMeasure,
    totalOutcomes: state.outcomes.length,
    totalGoals: state.goals.length,
  };
}

function priorityBadge(priority: FocusItem["priority"]): string {
  switch (priority) {
    case "high":
      return "🔴 High";
    case "medium":
      return "🟡 Medium";
    case "low":
      return "🟢 Low";
  }
}

export function generateMarkdownExport(state: BoardState): string {
  const lines: string[] = [];
  const analysis = computeBoardAnalysis(state);

  lines.push("# Shodoboard — Pitch Deck");
  lines.push(`\nCreated: ${new Date().toLocaleDateString("en-US")}\n`);
  lines.push("---\n");

  // ── 1. Summary (Executive Summary) ──
  lines.push("## 1. Summary\n");

  if (analysis.totalItems === 0 && analysis.totalOutcomes === 0) {
    lines.push("Board is empty. Start by adding goals, outcomes, and work items.\n");
  } else {
    lines.push(
      `The backlog contained **${analysis.deliveryCount}** delivery items and **${analysis.discoveryCount}** discovery items. ` +
        `We identified **${analysis.totalOutcomes}** outcomes, of which **${analysis.outcomesWithoutMeasure}** are missing a measure of success.`
    );
    if (analysis.unlinkedCount > 0) {
      lines.push(
        ` Additionally, **${analysis.unlinkedCount}** items are not linked to any outcome.`
      );
    }
    lines.push("");

    const discoveryRatio =
      analysis.totalItems > 0 ? analysis.discoveryCount / analysis.totalItems : 0;
    lines.push(
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Goals | ${analysis.totalGoals} |`,
      `| Outcomes | ${analysis.totalOutcomes} |`,
      `| Total work items | ${analysis.totalItems} |`,
      `| Discovery ratio | ${Math.round(discoveryRatio * 100)} % |`,
      `| Unmeasured outcomes | ${analysis.outcomesWithoutMeasure} |`,
      `| Orphan items | ${analysis.unlinkedCount} |`,
      ""
    );
  }

  // ── 2. Key Findings ──
  lines.push("## 2. Key Findings\n");

  const findings: { title: string; explanation: string }[] = [];

  const discoveryRatio =
    analysis.totalItems > 0 ? analysis.discoveryCount / analysis.totalItems : 1;
  if (discoveryRatio < 0.2 && analysis.totalItems > 0) {
    findings.push({
      title: "Output-heavy backlog",
      explanation:
        "Discovery items make up less than 20% of all items. This suggests a feature factory model where products are built without sufficient validation.",
    });
  }

  if (analysis.outcomesWithoutMeasure > 0) {
    findings.push({
      title: "Unmeasured outcomes",
      explanation: `${analysis.outcomesWithoutMeasure} outcomes are missing a measure of success. Without a measure, it's impossible to verify whether the work produced the desired result.`,
    });
  }

  if (analysis.unlinkedCount > 0) {
    findings.push({
      title: "Orphan work items without outcome link",
      explanation: `${analysis.unlinkedCount} items are not linked to an outcome. These items don't connect to any business goal.`,
    });
  }

  // Check for unvalidated work: items in building/ready where outcome has no discovery items
  const outcomesWithBuildingItems = new Set(
    state.items
      .filter((i) => i.outcomeId !== null && (i.column === "building" || i.column === "ready"))
      .map((i) => i.outcomeId)
  );
  const unvalidatedOutcomes = [...outcomesWithBuildingItems].filter((outcomeId) => {
    const discoveryItems = state.items.filter(
      (i) => i.outcomeId === outcomeId && i.type === "discovery"
    );
    return discoveryItems.length === 0;
  });
  if (unvalidatedOutcomes.length > 0) {
    findings.push({
      title: "Unvalidated work",
      explanation: `${unvalidatedOutcomes.length} outcomes have items in the Building or Ready column without any discovery items. Work is being built without validation.`,
    });
  }

  if (findings.length === 0) {
    lines.push("No significant findings — good work!\n");
  } else {
    for (const finding of findings.slice(0, 3)) {
      lines.push(`- **${finding.title}:** ${finding.explanation}`);
    }
    lines.push("");
  }

  // ── 3. Recommended Focus Areas ──
  const sortedFocusItems = [...state.focusItems].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (sortedFocusItems.length > 0) {
    lines.push("## 3. Recommended Focus Areas\n");
    for (const fi of sortedFocusItems) {
      lines.push(`- **${priorityBadge(fi.priority)}** — ${fi.title}`);
      lines.push(`  - Recommended action: ${fi.suggestedAction}`);
    }
    lines.push("");
  }

  // ── 4. Board Overview ──
  lines.push(
    sortedFocusItems.length > 0
      ? "## 4. Board Overview\n"
      : "## 3. Board Overview\n"
  );
  let sectionOffset = sortedFocusItems.length > 0 ? 0 : -1;

  for (const goal of state.goals.sort((a, b) => a.order - b.order)) {
    lines.push(`### ${goal.statement}`);
    if (goal.timeframe) lines.push(`- **Timeframe:** ${goal.timeframe}`);
    lines.push("");

    const goalOutcomes = state.outcomes
      .filter((o) => o.goalId === goal.id)
      .sort((a, b) => a.order - b.order);

    for (const outcome of goalOutcomes) {
      const measureText =
        outcome.measureOfSuccess && outcome.measureOfSuccess.trim() !== ""
          ? outcome.measureOfSuccess
          : "⚠️ Measure missing";
      lines.push(`#### ${outcome.statement}`);
      lines.push(`- **Measure:** ${measureText}`);

      const outcomeItems = state.items
        .filter((i) => i.outcomeId === outcome.id)
        .sort((a, b) => a.order - b.order);

      if (outcomeItems.length > 0) {
        for (const item of outcomeItems) {
          const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
          const columnLabel = item.column.charAt(0).toUpperCase() + item.column.slice(1);
          lines.push(`- [${typeLabel}] ${item.title} *(${columnLabel})*`);
        }
      }
      lines.push("");
    }
  }

  // Unlinked items
  const unlinkedItems = state.items.filter((i) => i.outcomeId === null);
  if (unlinkedItems.length > 0) {
    lines.push("### Orphan items (no outcome link)\n");
    for (const item of unlinkedItems) {
      const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
      const columnLabel = item.column.charAt(0).toUpperCase() + item.column.slice(1);
      lines.push(`- [${typeLabel}] ${item.title} *(${columnLabel})*`);
    }
    lines.push("");
  }

  // ── 5. Open Questions ──
  const openQuestions: string[] = [];

  // Discovery items still in opportunities
  const opportunityDiscovery = state.items.filter(
    (i) => i.type === "discovery" && i.column === "opportunities"
  );
  for (const item of opportunityDiscovery) {
    openQuestions.push(`Start discovery work for item: "${item.title}"`);
  }

  // Outcomes without measures
  const unmeasuredOutcomes = state.outcomes.filter(
    (o) => !o.measureOfSuccess || o.measureOfSuccess.trim() === ""
  );
  for (const outcome of unmeasuredOutcomes) {
    openQuestions.push(`Define a measure for outcome: "${outcome.statement}"`);
  }

  // Items without outcome connections
  for (const item of unlinkedItems) {
    openQuestions.push(`Link item to an outcome or consider removing: "${item.title}"`);
  }

  if (openQuestions.length > 0) {
    lines.push(`## ${5 + sectionOffset}. Open Questions\n`);
    for (const q of openQuestions) {
      lines.push(`- [ ] ${q}`);
    }
    lines.push("");
  }

  // ── 6. Next Steps ──
  lines.push(`## ${6 + sectionOffset}. Next Steps\n`);

  const highPriorityFocus = sortedFocusItems.filter((fi) => fi.priority === "high");
  if (highPriorityFocus.length > 0) {
    for (const fi of highPriorityFocus) {
      lines.push(`1. ${fi.suggestedAction}`);
    }
  } else {
    // Generic advice
    if (analysis.outcomesWithoutMeasure > 0) {
      lines.push("1. Define measures for outcomes that are missing them");
    }
    lines.push(
      "2. Start discovery work before moving items to the Building column"
    );
    if (analysis.unlinkedCount > 0) {
      lines.push(
        "3. Link orphan items to outcomes or consider removing them"
      );
    }
  }
  lines.push("");

  lines.push("---\n");
  lines.push("*Created with Shodoboard*");

  return lines.join("\n");
}

export function openPrintableExport(state: BoardState) {
  const analysis = computeBoardAnalysis(state);
  const productName = state.productName || "Board Export";
  const date = new Date().toLocaleDateString("en-US");
  const sortedGoals = [...state.goals].sort((a, b) => a.order - b.order);
  const sortedFocusItems = [...state.focusItems].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
  const unlinkedItems = state.items.filter((i) => i.outcomeId === null);

  const discoveryRatio =
    analysis.totalItems > 0 ? Math.round((analysis.discoveryCount / analysis.totalItems) * 100) : 0;

  // Build findings
  const findings: string[] = [];
  if (discoveryRatio < 20 && analysis.totalItems > 0) {
    findings.push(`<li><strong>Output-heavy backlog:</strong> Discovery items make up only ${discoveryRatio}% — suggests a feature factory model.</li>`);
  }
  if (analysis.outcomesWithoutMeasure > 0) {
    findings.push(`<li><strong>Unmeasured outcomes:</strong> ${analysis.outcomesWithoutMeasure} outcomes are missing a measure of success.</li>`);
  }
  if (analysis.unlinkedCount > 0) {
    findings.push(`<li><strong>Orphan items:</strong> ${analysis.unlinkedCount} items are not linked to an outcome.</li>`);
  }

  // Build board overview
  let boardOverview = "";
  for (const goal of sortedGoals) {
    boardOverview += `<h3 style="color:#3730a3;margin:24px 0 8px 0;font-size:16px;">${escapeHtml(goal.statement)}</h3>`;
    if (goal.timeframe) boardOverview += `<p style="color:#6b7280;font-size:13px;margin:0 0 12px 0;">Timeframe: ${escapeHtml(goal.timeframe)}</p>`;

    const goalOutcomes = state.outcomes.filter((o) => o.goalId === goal.id).sort((a, b) => a.order - b.order);
    for (const outcome of goalOutcomes) {
      const measureText = outcome.measureOfSuccess?.trim()
        ? escapeHtml(outcome.measureOfSuccess)
        : '<span style="color:#d97706;">⚠️ Measure missing</span>';
      boardOverview += `<div style="margin:0 0 16px 16px;padding:12px 16px;border-left:3px solid #6366f1;background:#f8fafc;border-radius:0 8px 8px 0;">`;
      boardOverview += `<p style="font-weight:600;margin:0 0 4px 0;font-size:14px;">${escapeHtml(outcome.statement)}</p>`;
      boardOverview += `<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Measure: ${measureText}</p>`;

      const outcomeItems = state.items.filter((i) => i.outcomeId === outcome.id).sort((a, b) => a.order - b.order);
      if (outcomeItems.length > 0) {
        boardOverview += `<ul style="margin:0;padding:0 0 0 16px;font-size:13px;">`;
        for (const item of outcomeItems) {
          const typeColor = item.type === "discovery" ? "#7c3aed" : "#0d9488";
          const typeLabel = item.type === "discovery" ? "Dis" : "Del";
          const col = item.column.charAt(0).toUpperCase() + item.column.slice(1);
          boardOverview += `<li style="margin:2px 0;"><span style="color:${typeColor};font-weight:600;font-size:11px;">[${typeLabel}]</span> ${escapeHtml(item.title)} <span style="color:#9ca3af;font-size:11px;">(${col})</span></li>`;
        }
        boardOverview += `</ul>`;
      }
      boardOverview += `</div>`;
    }
  }

  // Unlinked items
  let unlinkedSection = "";
  if (unlinkedItems.length > 0) {
    unlinkedSection = `<h3 style="color:#d97706;margin:24px 0 8px 0;font-size:16px;">⚠️ Orphan items (no outcome link)</h3><ul style="font-size:13px;">`;
    for (const item of unlinkedItems) {
      const typeColor = item.type === "discovery" ? "#7c3aed" : "#0d9488";
      const typeLabel = item.type === "discovery" ? "Dis" : "Del";
      unlinkedSection += `<li><span style="color:${typeColor};font-weight:600;font-size:11px;">[${typeLabel}]</span> ${escapeHtml(item.title)}</li>`;
    }
    unlinkedSection += `</ul>`;
  }

  // Focus items
  let focusSection = "";
  if (sortedFocusItems.length > 0) {
    focusSection = `<h2 style="color:#1e1b4b;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-top:32px;">Recommended Focus Areas</h2><ul style="font-size:14px;">`;
    for (const fi of sortedFocusItems) {
      const badge = fi.priority === "high" ? "🔴 High" : fi.priority === "medium" ? "🟡 Medium" : "🟢 Low";
      focusSection += `<li style="margin:8px 0;"><strong>${badge}</strong> — ${escapeHtml(fi.title)}<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(fi.suggestedAction)}</span></li>`;
    }
    focusSection += `</ul>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Shodoboard — ${escapeHtml(productName)}</title>
<style>
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1f2937; line-height: 1.6; }
  h1 { color: #312e81; margin: 0; font-size: 28px; }
  h2 { color: #1e1b4b; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; font-size: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #4f46e5; }
  .header-logo { width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
  .print-btn { background: #4f46e5; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .print-btn:hover { background: #3730a3; }
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">S</div>
  <div>
    <h1>Shodoboard</h1>
    <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">${escapeHtml(productName)} — ${date}</p>
  </div>
  <div style="margin-left:auto;" class="no-print">
    <button class="print-btn" onclick="window.print()">💾 Save as PDF</button>
  </div>
</div>

<h2>Summary</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Goals</td><td>${analysis.totalGoals}</td></tr>
  <tr><td>Outcomes</td><td>${analysis.totalOutcomes}</td></tr>
  <tr><td>Total work items</td><td>${analysis.totalItems}</td></tr>
  <tr><td>Discovery ratio</td><td>${discoveryRatio} %</td></tr>
  <tr><td>Unmeasured outcomes</td><td>${analysis.outcomesWithoutMeasure}</td></tr>
  <tr><td>Orphan items</td><td>${analysis.unlinkedCount}</td></tr>
</table>

${findings.length > 0 ? `<h2>Key Findings</h2><ul>${findings.join("")}</ul>` : ""}

${focusSection}

<h2>Board Overview</h2>
${boardOverview}
${unlinkedSection}

<hr style="margin:32px 0;border:none;border-top:2px solid #e5e7eb;" />
<p style="text-align:center;color:#9ca3af;font-size:12px;">Created with Shodoboard</p>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
