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
      return "🔴 Korkea";
    case "medium":
      return "🟡 Keskitaso";
    case "low":
      return "🟢 Matala";
  }
}

export function generateMarkdownExport(state: BoardState): string {
  const lines: string[] = [];
  const analysis = computeBoardAnalysis(state);

  lines.push("# Shodoboard — Pitch Deck");
  lines.push(`\nLuotu: ${new Date().toLocaleDateString("fi-FI")}\n`);
  lines.push("---\n");

  // ── 1. Yhteenveto (Executive Summary) ──
  lines.push("## 1. Yhteenveto\n");

  if (analysis.totalItems === 0 && analysis.totalOutcomes === 0) {
    lines.push("Taulu on tyhjä. Aloita lisäämällä tavoitteita, outcomeja ja työ-itemejiä.\n");
  } else {
    lines.push(
      `Backlogissa oli **${analysis.deliveryCount}** toimitusitemiä ja **${analysis.discoveryCount}** discovery-itemiä. ` +
        `Tunnistimme **${analysis.totalOutcomes}** outcomea joista **${analysis.outcomesWithoutMeasure}**:ltä puuttuu onnistumismittari.`
    );
    if (analysis.unlinkedCount > 0) {
      lines.push(
        ` Lisäksi **${analysis.unlinkedCount}** itemiä ei ole yhdistetty mihinkään outcomeen.`
      );
    }
    lines.push("");

    const discoveryRatio =
      analysis.totalItems > 0 ? analysis.discoveryCount / analysis.totalItems : 0;
    lines.push(
      `| Mittari | Arvo |`,
      `| --- | --- |`,
      `| Tavoitteita | ${analysis.totalGoals} |`,
      `| Outcomeja | ${analysis.totalOutcomes} |`,
      `| Työ-itemejiä yhteensä | ${analysis.totalItems} |`,
      `| Discovery-osuus | ${Math.round(discoveryRatio * 100)} % |`,
      `| Mittaamattomat outcomet | ${analysis.outcomesWithoutMeasure} |`,
      `| Orpoja itemejiä | ${analysis.unlinkedCount} |`,
      ""
    );
  }

  // ── 2. Keskeiset havainnot (Key Findings) ──
  lines.push("## 2. Keskeiset havainnot\n");

  const findings: { title: string; explanation: string }[] = [];

  const discoveryRatio =
    analysis.totalItems > 0 ? analysis.discoveryCount / analysis.totalItems : 1;
  if (discoveryRatio < 0.2 && analysis.totalItems > 0) {
    findings.push({
      title: "Output-painotteinen backlog",
      explanation:
        "Discovery-itemejä on alle 20 % kaikista itemeistä. Tämä viittaa feature factory -malliin, jossa tuotteita rakennetaan ilman riittävää validointia.",
    });
  }

  if (analysis.outcomesWithoutMeasure > 0) {
    findings.push({
      title: "Mittaamattomia outcomeja",
      explanation: `${analysis.outcomesWithoutMeasure} outcomelta puuttuu onnistumismittari. Ilman mittaria on mahdotonta todentaa, tuottiko työ halutun tuloksen.`,
    });
  }

  if (analysis.unlinkedCount > 0) {
    findings.push({
      title: "Orpoja työ-itemejiä ilman outcome-yhteyttä",
      explanation: `${analysis.unlinkedCount} itemiä ei ole yhdistetty outcomeen. Nämä itemit eivät kytkeydy mihinkään liiketoimintatavoitteeseen.`,
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
      title: "Validoimatonta työtä",
      explanation: `${unvalidatedOutcomes.length} outcomessa on itemejiä Building- tai Ready-sarakkeessa ilman yhtään discovery-itemiä. Työtä rakennetaan ilman validointia.`,
    });
  }

  if (findings.length === 0) {
    lines.push("Merkittäviä havaintoja ei tunnistettu — hyvä työ!\n");
  } else {
    for (const finding of findings.slice(0, 3)) {
      lines.push(`- **${finding.title}:** ${finding.explanation}`);
    }
    lines.push("");
  }

  // ── 3. Suositellut painopisteet (Recommended Focus Areas) ──
  const sortedFocusItems = [...state.focusItems].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (sortedFocusItems.length > 0) {
    lines.push("## 3. Suositellut painopisteet\n");
    for (const fi of sortedFocusItems) {
      lines.push(`- **${priorityBadge(fi.priority)}** — ${fi.title}`);
      lines.push(`  - Suositeltu toimenpide: ${fi.suggestedAction}`);
    }
    lines.push("");
  }

  // ── 4. Taulun yleiskatsaus (Board Overview) ──
  lines.push(
    sortedFocusItems.length > 0
      ? "## 4. Taulun yleiskatsaus\n"
      : "## 3. Taulun yleiskatsaus\n"
  );
  let sectionOffset = sortedFocusItems.length > 0 ? 0 : -1;

  for (const goal of state.goals.sort((a, b) => a.order - b.order)) {
    lines.push(`### ${goal.statement}`);
    if (goal.timeframe) lines.push(`- **Aikajänne:** ${goal.timeframe}`);
    lines.push("");

    const goalOutcomes = state.outcomes
      .filter((o) => o.goalId === goal.id)
      .sort((a, b) => a.order - b.order);

    for (const outcome of goalOutcomes) {
      const measureText =
        outcome.measureOfSuccess && outcome.measureOfSuccess.trim() !== ""
          ? outcome.measureOfSuccess
          : "⚠️ Mittari puuttuu";
      lines.push(`#### ${outcome.statement}`);
      lines.push(`- **Mittari:** ${measureText}`);

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
    lines.push("### Orpot itemit (ei outcome-yhteyttä)\n");
    for (const item of unlinkedItems) {
      const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
      const columnLabel = item.column.charAt(0).toUpperCase() + item.column.slice(1);
      lines.push(`- [${typeLabel}] ${item.title} *(${columnLabel})*`);
    }
    lines.push("");
  }

  // ── 5. Avoimet kysymykset (Open Questions) ──
  const openQuestions: string[] = [];

  // Discovery items still in opportunities
  const opportunityDiscovery = state.items.filter(
    (i) => i.type === "discovery" && i.column === "opportunities"
  );
  for (const item of opportunityDiscovery) {
    openQuestions.push(`Aloita discovery-työ itemille: "${item.title}"`);
  }

  // Outcomes without measures
  const unmeasuredOutcomes = state.outcomes.filter(
    (o) => !o.measureOfSuccess || o.measureOfSuccess.trim() === ""
  );
  for (const outcome of unmeasuredOutcomes) {
    openQuestions.push(`Määrittele mittari outcomelle: "${outcome.statement}"`);
  }

  // Items without outcome connections
  for (const item of unlinkedItems) {
    openQuestions.push(`Yhdistä itemi outcomeen tai harkitse poistamista: "${item.title}"`);
  }

  if (openQuestions.length > 0) {
    lines.push(`## ${5 + sectionOffset}. Avoimet kysymykset\n`);
    for (const q of openQuestions) {
      lines.push(`- [ ] ${q}`);
    }
    lines.push("");
  }

  // ── 6. Seuraavat askeleet (Next Steps) ──
  lines.push(`## ${6 + sectionOffset}. Seuraavat askeleet\n`);

  const highPriorityFocus = sortedFocusItems.filter((fi) => fi.priority === "high");
  if (highPriorityFocus.length > 0) {
    for (const fi of highPriorityFocus) {
      lines.push(`1. ${fi.suggestedAction}`);
    }
  } else {
    // Generic advice
    if (analysis.outcomesWithoutMeasure > 0) {
      lines.push("1. Määrittele mittarit outcomeillle joilta ne puuttuvat");
    }
    lines.push(
      "2. Aloita discovery-työ ennen kuin siirrät itemejiä Building-sarakkeeseen"
    );
    if (analysis.unlinkedCount > 0) {
      lines.push(
        "3. Yhdistä orpot itemit outcomeihin tai harkitse niiden poistamista"
      );
    }
  }
  lines.push("");

  lines.push("---\n");
  lines.push("*Luotu Shodoboardilla*");

  return lines.join("\n");
}

export function openPrintableExport(state: BoardState) {
  const analysis = computeBoardAnalysis(state);
  const productName = state.productName || "Board Export";
  const date = new Date().toLocaleDateString("fi-FI");
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
    findings.push(`<li><strong>Output-painotteinen backlog:</strong> Discovery-itemejä on vain ${discoveryRatio} % — viittaa feature factory -malliin.</li>`);
  }
  if (analysis.outcomesWithoutMeasure > 0) {
    findings.push(`<li><strong>Mittaamattomia outcomeja:</strong> ${analysis.outcomesWithoutMeasure} outcomelta puuttuu onnistumismittari.</li>`);
  }
  if (analysis.unlinkedCount > 0) {
    findings.push(`<li><strong>Orpoja itemejiä:</strong> ${analysis.unlinkedCount} itemiä ei ole yhdistetty outcomeen.</li>`);
  }

  // Build board overview
  let boardOverview = "";
  for (const goal of sortedGoals) {
    boardOverview += `<h3 style="color:#3730a3;margin:24px 0 8px 0;font-size:16px;">${escapeHtml(goal.statement)}</h3>`;
    if (goal.timeframe) boardOverview += `<p style="color:#6b7280;font-size:13px;margin:0 0 12px 0;">Aikajänne: ${escapeHtml(goal.timeframe)}</p>`;

    const goalOutcomes = state.outcomes.filter((o) => o.goalId === goal.id).sort((a, b) => a.order - b.order);
    for (const outcome of goalOutcomes) {
      const measureText = outcome.measureOfSuccess?.trim()
        ? escapeHtml(outcome.measureOfSuccess)
        : '<span style="color:#d97706;">⚠️ Mittari puuttuu</span>';
      boardOverview += `<div style="margin:0 0 16px 16px;padding:12px 16px;border-left:3px solid #6366f1;background:#f8fafc;border-radius:0 8px 8px 0;">`;
      boardOverview += `<p style="font-weight:600;margin:0 0 4px 0;font-size:14px;">${escapeHtml(outcome.statement)}</p>`;
      boardOverview += `<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Mittari: ${measureText}</p>`;

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
    unlinkedSection = `<h3 style="color:#d97706;margin:24px 0 8px 0;font-size:16px;">⚠️ Orpot itemit (ei outcome-yhteyttä)</h3><ul style="font-size:13px;">`;
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
    focusSection = `<h2 style="color:#1e1b4b;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-top:32px;">Suositellut painopisteet</h2><ul style="font-size:14px;">`;
    for (const fi of sortedFocusItems) {
      const badge = fi.priority === "high" ? "🔴 Korkea" : fi.priority === "medium" ? "🟡 Keskitaso" : "🟢 Matala";
      focusSection += `<li style="margin:8px 0;"><strong>${badge}</strong> — ${escapeHtml(fi.title)}<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(fi.suggestedAction)}</span></li>`;
    }
    focusSection += `</ul>`;
  }

  const html = `<!DOCTYPE html>
<html lang="fi">
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

<h2>Yhteenveto</h2>
<table>
  <tr><th>Mittari</th><th>Arvo</th></tr>
  <tr><td>Tavoitteita</td><td>${analysis.totalGoals}</td></tr>
  <tr><td>Outcomeja</td><td>${analysis.totalOutcomes}</td></tr>
  <tr><td>Työ-itemejiä</td><td>${analysis.totalItems}</td></tr>
  <tr><td>Discovery-osuus</td><td>${discoveryRatio} %</td></tr>
  <tr><td>Mittaamattomat outcomet</td><td>${analysis.outcomesWithoutMeasure}</td></tr>
  <tr><td>Orpoja itemejiä</td><td>${analysis.unlinkedCount}</td></tr>
</table>

${findings.length > 0 ? `<h2>Keskeiset havainnot</h2><ul>${findings.join("")}</ul>` : ""}

${focusSection}

<h2>Taulun yleiskatsaus</h2>
${boardOverview}
${unlinkedSection}

<hr style="margin:32px 0;border:none;border-top:2px solid #e5e7eb;" />
<p style="text-align:center;color:#9ca3af;font-size:12px;">Luotu Shodoboardilla</p>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
