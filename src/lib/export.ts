import type { BoardState, FocusItem } from "@/types/board";

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

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
