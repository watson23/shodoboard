# Coaching Engine Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hallucination-prone coaching prompts with a two-layer signal detection system (deterministic structural analysis + AI content quality evaluation), enriched with Cagan-aligned coaching playbooks and admin-tunable instructions.

**Architecture:** Pre-compute structural board signals in TypeScript (`board-signals.ts`). Build a coaching knowledge base with per-anti-pattern playbooks (`coaching-knowledge.ts`). Create an admin instructions file (`coaching-instructions.ts`). Rebuild nudge, focus, and spar prompts to consume verified signals + board content + playbooks + admin overrides. AI still sees full board for content analysis and targeting.

**Tech Stack:** TypeScript, Next.js 16 API routes, Anthropic Claude Sonnet API

**Design doc:** `docs/plans/2026-03-03-coaching-engine-design.md`

---

### Task 1: Board Signal Analyzer

**Files:**
- Create: `src/lib/board-signals.ts`

**Step 1: Create the signal types and analyzer function**

Create `src/lib/board-signals.ts` with the `BoardSignal` interface and `analyzeBoardSignals()` function. This function takes a `BoardState` and returns an array of detected structural signals. Each detector is a pure function — no AI involved.

```typescript
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
  humanReadable: string; // e.g. 'outcome-3 "Customers resolve issues": 2 shipped, 0 measuring'
}

export function analyzeBoardSignals(state: BoardState): BoardSignal[] {
  const signals: BoardSignal[] = [];

  // --- Outcome-level detectors ---
  for (const outcome of state.outcomes) {
    const items = state.items.filter((i) => i.outcomeId === outcome.id);
    const byColumn = (col: string) => items.filter((i) => i.column === col);
    const discoveryItems = items.filter((i) => i.type === "discovery");
    const deliveryItems = items.filter((i) => i.type === "delivery");

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

    // shipped-not-learning
    const shippedCount = byColumn("shipped").length;
    const measuringCount = byColumn("measuring").length;
    if (shippedCount > 0 && measuringCount === 0) {
      signals.push({
        id: `shipped-not-learning:${outcome.id}`,
        antiPattern: "shipped-not-learning",
        severity: "medium",
        targetType: "outcome",
        targetId: outcome.id,
        evidence: { shippedCount, measuringCount, statement: outcome.statement },
        humanReadable: `Outcome "${outcome.statement}": ${shippedCount} shipped, 0 measuring.`,
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
        humanReadable: `Outcome "${outcome.statement}": all ${items.length} items still in early stage (opportunities/discovering).`,
      });
    }

    // bottleneck: >=4 items in one column, 0 in the next
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
    const goalItems = state.items.filter((i) => {
      const outcomeIds = new Set(goalOutcomes.map((o) => o.id));
      return i.outcomeId && outcomeIds.has(i.outcomeId);
    });
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

    // scope-creep
    if (goalItems.length > 7) {
      signals.push({
        id: `scope-creep:${goal.id}`,
        antiPattern: "scope-creep",
        severity: "medium",
        targetType: "goal",
        targetId: goal.id,
        evidence: { itemCount: goalItems.length, statement: goal.statement },
        humanReadable: `Goal "${goal.statement}": ${goalItems.length} items (>7 suggests scope creep).`,
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
          humanReadable: `Goal "${goal.statement}": outcome item counts range from ${min} to ${max} — unbalanced.`,
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

  for (const item of state.items) {
    if (item.type === "discovery" && item.column === "opportunities") {
      signals.push({
        id: `stale-discovery:${item.id}`,
        antiPattern: "stale-discovery",
        severity: "low",
        targetType: "item",
        targetId: item.id,
        evidence: { title: item.title },
        humanReadable: `Discovery item "${item.title}" is still in opportunities — not started.`,
      });
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
      humanReadable: `Board-wide: ${totalDiscovery}/${totalItems} items are discovery (${Math.round((totalDiscovery / totalItems) * 100)}% — below 20% threshold).`,
    });
  }

  return signals;
}

/** Format signals as a human-readable summary for prompt injection. */
export function formatSignalsForPrompt(signals: BoardSignal[]): string {
  if (signals.length === 0) return "No structural issues detected.";
  return signals.map((s) => `- [${s.antiPattern}] (${s.severity}) ${s.humanReadable}`).join("\n");
}
```

**Step 2: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds (new file has no consumers yet, but must compile).

**Step 3: Commit**

```bash
git add src/lib/board-signals.ts
git commit -m "feat: add deterministic board signal analyzer — Layer 1 structural detection"
```

---

### Task 2: Coaching Knowledge Base

**Files:**
- Create: `src/lib/coaching-knowledge.ts`

**Step 1: Create the anti-pattern playbooks**

Create `src/lib/coaching-knowledge.ts` with Cagan-aligned coaching playbooks. Each playbook has a philosophy (why it matters), coaching approach (how to discuss it), example questions, and suggested board actions.

```typescript
export interface AntiPatternPlaybook {
  id: string;
  name: string;
  layer: "structural" | "content";
  philosophy: string;
  coachingApproach: string;
  exampleQuestions: string[];
  suggestedActions: string[];
}

export const PLAYBOOKS: Record<string, AntiPatternPlaybook> = {
  "unmeasured-outcome": {
    id: "unmeasured-outcome",
    name: "Unmeasured Outcome",
    layer: "structural",
    philosophy: "In Cagan's empowered team model, teams own outcomes, not outputs. But you can't own an outcome if you haven't defined what success looks like. Without a measure, 'done' means 'we shipped it' — which is feature factory thinking.",
    coachingApproach: "Don't just say 'add a metric.' Push the PM to think about what behavior change they expect and how they would observe it in real user data. Challenge vanity metrics.",
    exampleQuestions: [
      "Jos tämä outcome onnistuu, mitä näet käyttäjädatassa kuukauden päästä?",
      "Mikä on se konkreettinen käyttäytymismuutos jonka voisit mitata?",
      "Mistä tiedät erottaa onnistumisen ja epäonnistumisen — mikä on raja-arvo?",
    ],
    suggestedActions: [
      "Määrittele konkreettinen mittari: [käyttäytyminen] [suunta] [tavoitearvo] [aikajänne]",
      "Kysy tiimiltä: 'Jos tämä onnistuu, mitä näemme datassa?'",
    ],
  },
  "output-only-goal": {
    id: "output-only-goal",
    name: "Output-Only Goal",
    layer: "structural",
    philosophy: "Cagan's core distinction: feature teams deliver outputs (features), empowered teams deliver outcomes (results). A goal with only delivery work and zero discovery means the team is executing a roadmap, not solving problems.",
    coachingApproach: "Challenge the assumption that building features equals progress. Ask what they know about the problem vs what they're assuming. Push for at least one discovery item per outcome.",
    exampleQuestions: [
      "Mitkä oletukset teidän pitää validoida ennen kuin rakennatte tämän?",
      "Milloin viimeksi puhuitte käyttäjien kanssa tästä ongelmasta?",
      "Jos tämä feature ei toimi, miten saatte sen selville — ennen vai jälkeen rakentamisen?",
    ],
    suggestedActions: [
      "Lisää vähintään yksi discovery-item jokaiselle outcomelle",
      "Tee 3-5 käyttäjähaastattelua ennen kuin siirrät mitään Ready-sarakkeeseen",
    ],
  },
  "shipped-not-learning": {
    id: "shipped-not-learning",
    name: "Shipped and Forgot",
    layer: "structural",
    philosophy: "Shipping is not success — learning is. Empowered teams measure the impact of what they ship. If you ship and don't check, you're a feature factory with a faster release cycle.",
    coachingApproach: "Don't blame the team — this is the most common anti-pattern. Ask what data they expected to see after launch and whether anyone is looking at it. Suggest moving items to measuring column as a visible signal.",
    exampleQuestions: [
      "Oletteko katsoneet dataa tämän julkaisun jälkeen?",
      "Mitä odotitte tapahtuvan käyttäjädatassa — ja tapahtuiko se?",
      "Kuka tiimistä on vastuussa vaikuttavuuden seurannasta?",
    ],
    suggestedActions: [
      "Siirrä shipped-itemit measuring-sarakkeeseen ja määrittele mitä seuraatte",
      "Varaa 30 min tiimin kanssa: 'Mitä opimme viime julkaisusta?'",
    ],
  },
  "orphan-work": {
    id: "orphan-work",
    name: "Orphan Work",
    layer: "structural",
    philosophy: "Work without a linked outcome is busy work. In Cagan's model, every initiative should trace back to a business result the team owns. Orphan items signal either a missing outcome or work that shouldn't be prioritized.",
    coachingApproach: "Don't assume orphan work is bad — it might reveal a missing outcome. Ask what problem it solves and whether there's an outcome it naturally belongs to. If not, it might be a technical enabler that needs its own outcome.",
    exampleQuestions: [
      "Mikä käyttäytyminen muuttuu tämän myötä?",
      "Liittyykö tämä johonkin outcomeen jota ei vielä ole boardilla?",
      "Jos et tekisi tätä, mitä tapahtuisi — kuka kärsii?",
    ],
    suggestedActions: [
      "Linkitä olemassa olevaan outcomeen tai luo uusi outcome jolle tämä kuuluu",
      "Jos tämä on teknistä velkaa, kysy: 'Mikä käyttäjäongelma pahenee jos emme korjaa tätä?'",
    ],
  },
  "scope-creep": {
    id: "scope-creep",
    name: "Scope Creep",
    layer: "structural",
    philosophy: "Focus is a strategic weapon. Cagan emphasizes that the best teams say no to most things. A goal with 8+ items means the team is trying to do everything — which means nothing gets the focus it deserves.",
    coachingApproach: "Push for ruthless prioritization. Ask which 2-3 items would move the needle most. Suggest splitting the goal or deferring items.",
    exampleQuestions: [
      "Jos saisitte tehdä vain 3 näistä, mitkä valitsisitte?",
      "Onko tämä yksi iso tavoite vai oikeasti kaksi erillistä?",
      "Mikä näistä on must-have vs nice-to-have tämän kvartaalin aikana?",
    ],
    suggestedActions: [
      "Priorisoi 3 tärkeintä itemiä ja siirrä loput seuraavaan kvartaaliin",
      "Harkitse tavoitteen jakamista kahdeksi fokusoidummaksi tavoitteeksi",
    ],
  },
  "stale-discovery": {
    id: "stale-discovery",
    name: "Stale Discovery",
    layer: "structural",
    philosophy: "Discovery that never starts is discovery theater. Writing 'user interviews' on a card is not the same as talking to users. Empowered teams have continuous discovery as a habit, not a backlog item.",
    coachingApproach: "Challenge the team on whether they're doing real discovery or just planning to. Push for small, fast experiments over big research projects.",
    exampleQuestions: [
      "Milloin aiotte oikeasti aloittaa tämän — tällä viikolla?",
      "Mikä on pienin mahdollinen tapa testata tätä oletusta?",
      "Voitteko puhua 3 käyttäjän kanssa tällä viikolla?",
    ],
    suggestedActions: [
      "Siirrä discovering-sarakkeeseen ja varaa ensimmäinen haastattelu tällä viikolla",
      "Muuta laajasta tutkimuksesta pieneksi kokeiluksi: 'Tällä viikolla opin X'",
    ],
  },
  "no-discovery-board-wide": {
    id: "no-discovery-board-wide",
    name: "No Discovery (Board-wide)",
    layer: "structural",
    philosophy: "A board with zero discovery is the purest feature factory signal. The team is executing a predetermined roadmap with no learning loops. In Cagan's model, this means the team is not empowered — they're a delivery team following orders.",
    coachingApproach: "This is the big one. Be direct: this board shows a team that ships but doesn't learn. Every outcome should have at least one discovery item. Start with the riskiest assumption.",
    exampleQuestions: [
      "Mistä tiedätte että rakennatte oikeaa asiaa?",
      "Mikä on suurin oletus jonka varassa tämä suunnitelma lepää?",
      "Milloin viimeksi puhuitte käyttäjien kanssa?",
    ],
    suggestedActions: [
      "Lisää jokaiselle outcomelle vähintään yksi discovery-item",
      "Aloita riskein oletus: mikä voisi tehdä koko suunnitelman turhaksi?",
    ],
  },
  "discovery-delivery-ratio": {
    id: "discovery-delivery-ratio",
    name: "Low Discovery Ratio",
    layer: "structural",
    philosophy: "A healthy product team balances building with learning. Below 20% discovery means most effort goes to shipping features without validating they solve real problems.",
    coachingApproach: "Don't push for 50/50 — that's unrealistic. But 20-30% discovery ensures the team is testing assumptions before committing to build. Show the ratio and challenge the team to add discovery for the riskiest bets.",
    exampleQuestions: [
      "Mitkä näistä delivery-itemeistä perustuvat validoituun tietoon vs oletuksiin?",
      "Jos budjetti kiristyisi, mitkä itemit leikkaisitte — ja perustuuko päätös dataan?",
    ],
    suggestedActions: [
      "Tunnista 2-3 riskialtista delivery-itemiä ja lisää niille edeltävä discovery-vaihe",
    ],
  },
  "bottleneck": {
    id: "bottleneck",
    name: "Workflow Bottleneck",
    layer: "structural",
    philosophy: "Flow matters. A pileup in one column signals a systemic problem — either the team can't progress work or they're not prioritizing what to pull next.",
    coachingApproach: "Ask what's blocking progress. Is it a capacity issue, a dependency, or a prioritization problem?",
    exampleQuestions: [
      "Miksi nämä itemit eivät etene — mikä estää?",
      "Onko tässä riippuvuus toiseen tiimiin tai päätökseen?",
    ],
    suggestedActions: [
      "Tunnista blokkeri ja nosta se esiin tiimin seuraavassa standup/planningissa",
    ],
  },
  "empty-goal": {
    id: "empty-goal",
    name: "Empty Goal",
    layer: "structural",
    philosophy: "A goal without outcomes is a wish without a plan. The team has declared intent but hasn't broken it down into measurable behavior changes.",
    coachingApproach: "Ask what specific behavior changes would indicate progress toward this goal. Help decompose it into 1-3 concrete outcomes.",
    exampleQuestions: [
      "Mitkä käyttäytymismuutokset kertoisivat että tämä tavoite etenee?",
      "Miten jaat tämän 1-3 konkreettiseksi outcomeksi?",
    ],
    suggestedActions: [
      "Lisää 1-3 outcomea jotka kuvaavat mitattavia käyttäytymismuutoksia",
    ],
  },
  "measuring-without-measure": {
    id: "measuring-without-measure",
    name: "Measuring Without a Measure",
    layer: "structural",
    philosophy: "Moving cards to 'measuring' without defining what you're measuring is process theater. It looks like you're learning, but you're not.",
    coachingApproach: "Point out the contradiction gently: you're in measuring mode but haven't defined the measure. Help define what success data looks like.",
    exampleQuestions: [
      "Mitä konkreettista datapistettä seuraatte juuri nyt?",
      "Miten erotatte onnistumisen ja epäonnistumisen?",
    ],
    suggestedActions: [
      "Määrittele outcome'n measureOfSuccess ennen kuin jatkat mittaamista",
    ],
  },
  "all-early-stage": {
    id: "all-early-stage",
    name: "Stalled Outcome",
    layer: "structural",
    philosophy: "If all items for an outcome are still in early stages, the outcome isn't progressing. This might be fine if it's new, but could signal a stalled initiative.",
    coachingApproach: "Ask if this is intentionally deferred or if something is blocking progress.",
    exampleQuestions: [
      "Onko tämä tarkoituksella myöhemmäksi vai onko jotain joka estää etenemisen?",
      "Mikä olisi ensimmäinen askel joka siirtäisi tätä eteenpäin?",
    ],
    suggestedActions: [
      "Valitse yksi item ja siirrä se aktiiviseksi — mikä on pienin ensimmäinen askel?",
    ],
  },
  "unbalanced-outcomes": {
    id: "unbalanced-outcomes",
    name: "Unbalanced Outcomes",
    layer: "structural",
    philosophy: "When one outcome has many items and another has very few, it suggests either poor decomposition or unclear priorities.",
    coachingApproach: "Ask whether the large outcome should be split, and whether the small one is truly important or might be merged.",
    exampleQuestions: [
      "Onko tämä iso outcome oikeasti yksi vai pitäisikö se jakaa?",
      "Puuttuuko pieneltä outcomelta itemejä vai onko se jo hyvässä tilassa?",
    ],
    suggestedActions: [
      "Harkitse ison outcome'n jakamista kahdeksi fokusoidummaksi",
    ],
  },
  // --- Layer 2 (content quality) playbooks ---
  "output-not-outcome": {
    id: "output-not-outcome",
    name: "Output Disguised as Outcome",
    layer: "content",
    philosophy: "The single most important distinction in product management. An outcome describes a change in human behavior. An output describes a thing you build. 'Launch new checkout' is an output. 'New users complete checkout in under 2 minutes' is an outcome.",
    coachingApproach: "Show the PM the difference by reframing their output as a behavior change. Ask: if you shipped this perfectly, what would users do differently?",
    exampleQuestions: [
      "Jos tämä onnistuu täydellisesti, mitä käyttäjät tekevät eri tavalla?",
      "Tämä kuulostaa featurelta — mikä on sen taustalla oleva käyttäytymismuutos?",
    ],
    suggestedActions: [
      "Muotoile outcome uudelleen: '[Käyttäjäryhmä] [tekee asian] [mitattavasti eri tavalla]'",
    ],
  },
  "weak-measure": {
    id: "weak-measure",
    name: "Weak or Vanity Measure",
    layer: "content",
    philosophy: "Vanity metrics (page views, signups) make you feel good but don't tell you if user behavior changed. Real measures track what people actually do differently.",
    coachingApproach: "Challenge the measure: does it actually track the behavior change in the outcome statement? Push for leading indicators over lagging ones.",
    exampleQuestions: [
      "Mittaako tämä oikeasti sitä käyttäytymismuutosta jonka haluatte?",
      "Voiko tämä mittari nousta ilman että mikään oikeasti paranee?",
    ],
    suggestedActions: [
      "Vaihda mittari sellaiseksi joka kertoo suoraan käyttäytymismuutoksesta",
    ],
  },
  "measure-mismatch": {
    id: "measure-mismatch",
    name: "Measure Doesn't Match Outcome",
    layer: "content",
    philosophy: "A measure that doesn't track the stated outcome creates a disconnect between what you're building and what you're measuring. This leads to optimizing for the wrong thing.",
    coachingApproach: "Put the outcome statement and measure side by side. Ask if the measure would move even if the outcome isn't achieved.",
    exampleQuestions: [
      "Jos tämä mittari nousee, tarkoittaako se varmasti että outcome toteutuu?",
      "Voiko mittari parantua vaikka käyttäjät eivät muuta käytöstään?",
    ],
    suggestedActions: [
      "Vaihda mittari sellaiseksi joka suoraan heijastaa outcome'n käyttäytymismuutosta",
    ],
  },
  "assumption-risk": {
    id: "assumption-risk",
    name: "Untested Assumptions",
    layer: "content",
    philosophy: "Building before validating is the biggest waste in product development. Every item in 'ready' or 'building' carries assumptions about user needs, feasibility, and viability.",
    coachingApproach: "Ask what assumptions underlie the work. Push for identifying the riskiest one and testing it before committing to build.",
    exampleQuestions: [
      "Mikä on suurin oletus tämän takana — ja onko se testattu?",
      "Jos tämä oletus on väärä, mitä tapahtuu?",
    ],
    suggestedActions: [
      "Tunnista riskein oletus ja lisää discovery-item sen testaamiseen",
    ],
  },
  "goal-framing": {
    id: "goal-framing",
    name: "Activity Goal (Not Outcome Goal)",
    layer: "content",
    philosophy: "A goal framed as an activity ('Launch X') rather than a business result ('Reduce churn to Y%') focuses the team on doing instead of achieving.",
    coachingApproach: "Reframe the goal from 'do X' to 'achieve Y by doing X'. The goal should describe the result, not the action.",
    exampleQuestions: [
      "Mikä on se liiketoimintatulos jonka haluatte — ei se mitä aiotte tehdä?",
      "Jos 'julkaiseminen' onnistuu mutta tulos ei muutu, onko tavoite saavutettu?",
    ],
    suggestedActions: [
      "Muotoile tavoite uudelleen: '[Liiketoimintamittari] [suunta] [tavoitearvo] [aikajänne]'",
    ],
  },
  "solution-as-problem": {
    id: "solution-as-problem",
    name: "Solution Without a Problem",
    layer: "content",
    philosophy: "Describing a solution ('Add promo codes') without articulating the problem ('New users don't convert because the first order feels risky') is classic output thinking.",
    coachingApproach: "Ask what problem this solves. If the PM can't articulate it, the item needs discovery first.",
    exampleQuestions: [
      "Mikä ongelma tämä ratkaisee — ja kenelle?",
      "Mistä tiedätte että tämä on oikea ratkaisu?",
    ],
    suggestedActions: [
      "Lisää kuvaukseen ongelma jonka tämä ratkaisee, tai lisää discovery-item validoimaan tarpeen",
    ],
  },
  "missing-who": {
    id: "missing-who",
    name: "Missing User Segment",
    layer: "content",
    philosophy: "An outcome that says 'users' without specifying which users is too vague to measure or design for. Different user segments have different needs.",
    coachingApproach: "Push for specificity. Which users? New vs returning? Power users vs casual? The more specific the segment, the sharper the outcome.",
    exampleQuestions: [
      "Ketkä käyttäjät tarkalleen — uudet, palaavat, tietty segmentti?",
      "Jos sanot 'käyttäjät', tarkoitatko kaikkia vai jotain tiettyä ryhmää?",
    ],
    suggestedActions: [
      "Tarkenna outcome: '[Tietty käyttäjäryhmä] tekee [konkreettisen asian]'",
    ],
  },
  "vague-goal": {
    id: "vague-goal",
    name: "Vague Goal",
    layer: "content",
    philosophy: "A goal like 'Improve user experience' gives the team no direction. Empowered teams need clear, measurable goals to make autonomous decisions.",
    coachingApproach: "Push for specificity: which metric, by how much, by when?",
    exampleQuestions: [
      "Mikä on se yksi numero josta tiedätte onnistuitteko?",
      "Jos sanot 'parantaa', kuinka paljon on tarpeeksi?",
    ],
    suggestedActions: [
      "Tarkenna: '[Mittari] [suunta] [tavoitearvo] [aikajänne]'",
    ],
  },
  "duplicate-intent": {
    id: "duplicate-intent",
    name: "Duplicate Intent",
    layer: "content",
    philosophy: "Multiple items or outcomes addressing the same thing create confusion about ownership and priority. Consolidate or clearly differentiate them.",
    coachingApproach: "Point out the overlap and ask if they should be merged or clearly differentiated.",
    exampleQuestions: [
      "Nämä kaksi tuntuvat käsittelevän samaa asiaa — pitäisikö yhdistää?",
      "Miten nämä eroavat toisistaan konkreettisesti?",
    ],
    suggestedActions: [
      "Yhdistä päällekkäiset itemit tai selkeytä miten ne eroavat",
    ],
  },
  "timeframe-mismatch": {
    id: "timeframe-mismatch",
    name: "Timeframe Mismatch",
    layer: "content",
    philosophy: "When a goal has a short deadline but outcomes require long-term behavior change (or vice versa), expectations don't match reality.",
    coachingApproach: "Flag the mismatch and ask which should be adjusted — the timeline or the ambition.",
    exampleQuestions: [
      "Onko tämä aikajänne realistinen tämän laajuiselle muutokselle?",
      "Pitäisikö skaalata tavoite tai pidentää aikajännettä?",
    ],
    suggestedActions: [
      "Tarkista onko aikajänne linjassa outcomes'ien laajuuden kanssa",
    ],
  },
  "discovery-quality": {
    id: "discovery-quality",
    name: "Low-Quality Discovery",
    layer: "content",
    philosophy: "A discovery item without a clear hypothesis or learning goal is just a vague 'research' task. Real discovery has a specific question it's trying to answer.",
    coachingApproach: "Push for a hypothesis: what do you expect to learn, and how will it change your decisions?",
    exampleQuestions: [
      "Mikä on se yksi kysymys johon haluatte vastauksen?",
      "Miten tämän tulos muuttaa sitä mitä rakennatte?",
    ],
    suggestedActions: [
      "Lisää kuvaukseen hypoteesi: 'Uskomme että [X], ja testaamme sen [tavalla]'",
    ],
  },
};

/** Get playbooks for a list of anti-pattern IDs. */
export function getPlaybooksForSignals(antiPatternIds: string[]): AntiPatternPlaybook[] {
  const unique = [...new Set(antiPatternIds)];
  return unique.map((id) => PLAYBOOKS[id]).filter(Boolean);
}

/** Format playbooks for prompt injection — only the relevant ones. */
export function formatPlaybooksForPrompt(playbooks: AntiPatternPlaybook[]): string {
  return playbooks
    .map(
      (p) =>
        `### ${p.name} (${p.id})
**Why it matters:** ${p.philosophy}
**Coaching approach:** ${p.coachingApproach}
**Example questions:** ${p.exampleQuestions.map((q) => `\n- "${q}"`).join("")}
**Suggested actions:** ${p.suggestedActions.map((a) => `\n- ${a}`).join("")}`
    )
    .join("\n\n");
}
```

**Step 2: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/coaching-knowledge.ts
git commit -m "feat: add coaching knowledge base — Cagan-aligned playbooks for all anti-patterns"
```

---

### Task 3: Admin Coaching Instructions

**Files:**
- Create: `src/lib/coaching-instructions.ts`

**Step 1: Create the admin instructions file**

```typescript
/**
 * Admin-editable coaching directives.
 *
 * This string is injected into ALL coaching prompts (nudge, focus, sparring).
 * Edit this file to tune coaching behavior without changing prompt logic.
 *
 * Guidelines:
 * - Write in Finnish (the coaching language)
 * - Be specific and actionable
 * - Each line is a separate directive
 * - Prefix with "-" for bullet points
 */
export const ADMIN_COACHING_INSTRUCTIONS = `
- Käytä Marty Caganin "empowered teams" -viitekehystä: tiimit omistavat outcomet, eivät outputteja
- Painota discovery-työn tärkeyttä — jokainen outcome tarvitsee validointia ennen rakentamista
- Haasta feature factory -ajattelua: ominaisuuksien listaaminen ei ole tuotestrategia
- Ole suora ja provosoiva, mutta rakentava — PM tarvitsee peilin, ei cheerleaderiä
- Ehdota aina konkreettista toimenpidettä jonka PM voi tehdä boardilla JUURI NYT
- Älä ehdota mittareita jotka vaativat monimutkaisia analytiikkatyökaluja — suosi yksinkertaisia käyttäytymismittareita
- Muista: "shipped" ei tarkoita "valmis" — valmis tarkoittaa mitattua vaikutusta
`.trim();
```

**Step 2: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/coaching-instructions.ts
git commit -m "feat: add admin coaching instructions — editable directives for all AI prompts"
```

---

### Task 4: Rebuild Nudge Prompt & API

**Files:**
- Modify: `src/lib/prompts.ts` (lines 75-116 — `getNudgeSystemPrompt`)
- Modify: `src/app/api/nudge/route.ts` (full file)

**Step 1: Rewrite getNudgeSystemPrompt**

Replace the `getNudgeSystemPrompt` function in `src/lib/prompts.ts` (lines 75-116). The new version is a factory function that takes structural signals, coaching playbooks, and admin instructions as parameters.

Replace the old function signature `getNudgeSystemPrompt(): string` with:

```typescript
export function getNudgeSystemPrompt(
  structuralFacts: string,
  playbooks: string,
  adminInstructions: string
): string {
  return `You are a provocative product management coach. Your job is to write sharp, specific coaching nudges that challenge feature factory thinking and push toward outcome-driven product work.

LANGUAGE: Always write all text in Finnish.

TONE: Be direct and challenging. Name the anti-pattern. PMs need a mirror, not a cheerleader.

## STRUCTURAL FACTS (verified — do not contradict these)

These have been computed from the board data. They are accurate. Base your structural nudges on these facts.

${structuralFacts}

## COACHING PLAYBOOKS

Use these playbooks to write sharper nudges. Match the philosophy, coaching approach, and question style.

${playbooks}

## ADMIN DIRECTIVES

${adminInstructions}

## YOUR TASK

1. Write a coaching nudge for each structural signal above (use the playbook for tone and approach).
2. Additionally, examine the board content below for CONTENT QUALITY issues: outcomes that are really outputs, weak/vague measures, solution-without-problem items, missing user segments, etc.
3. If you spot content quality issues, add nudges for those too (use "other" as antiPattern if no predefined pattern fits).
4. Generate 0-5 nudges total. Only generate nudges for real issues — do NOT invent problems to fill a quota.
5. Prioritize: high-severity structural signals first, then content quality issues.

IMPORTANT: When referring to items, outcomes, or goals in your message, question, or suggestedAction text, always use their actual title or statement, never their ID. The targetId field should still use the actual ID.

For each nudge, provide:
- targetType: "goal" | "outcome" | "item"
- targetId: the ID of the target entity from the board content below
- tier: "quiet" (subtle indicator) for minor issues, "visible" (banner) for important ones
- priority: "high" | "medium" | "low"
- antiPattern: the pattern ID (e.g. "unmeasured-outcome", "output-not-outcome", "other")
- message: A short, provocative observation that names the anti-pattern (1 sentence)
- question: A coaching question to prompt reflection (1 sentence)
- suggestedAction: A concrete action the PM can take right now (1 sentence, imperative form)

Respond with a JSON array:
\`\`\`json
[
  {
    "targetType": "...",
    "targetId": "...",
    "tier": "quiet|visible",
    "priority": "high|medium|low",
    "antiPattern": "...",
    "message": "...",
    "question": "...",
    "suggestedAction": "..."
  }
]
\`\`\``;
}
```

**Step 2: Update the nudge API route**

Rewrite `src/app/api/nudge/route.ts` to use the signal analyzer, coaching knowledge, and new prompt:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getNudgeSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "@/lib/board-signals";
import { getPlaybooksForSignals, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };

  // Layer 1: Pre-compute structural signals
  const signals = analyzeBoardSignals(boardState);
  const structuralFacts = formatSignalsForPrompt(signals);

  // Get relevant playbooks for detected signals + always include content-quality playbooks
  const structuralPatternIds = signals.map((s) => s.antiPattern);
  const contentPlaybookIds = [
    "output-not-outcome", "weak-measure", "measure-mismatch",
    "assumption-risk", "goal-framing", "solution-as-problem",
    "missing-who", "vague-goal", "duplicate-intent",
    "timeframe-mismatch", "discovery-quality",
  ];
  const allPlaybookIds = [...structuralPatternIds, ...contentPlaybookIds];
  const playbooks = getPlaybooksForSignals(allPlaybookIds);
  const playbookText = formatPlaybooksForPrompt(playbooks);

  // Board content for AI to analyze and target
  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getNudgeSystemPrompt(structuralFacts, playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Here is the full board content for your analysis:\n\n${boardDescription}`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Nudge API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ nudges: [], parseError: true });
    }

    const parsed = result.parsed as Array<{
      targetType: string;
      targetId: string;
      tier: string;
      priority: string;
      antiPattern: string;
      message: string;
      question: string;
      suggestedAction: string;
    }>;

    const nudges = parsed.map((n, i) => ({
      id: `nudge-${Date.now()}-${i}`,
      targetType: n.targetType,
      targetId: n.targetId,
      tier: n.tier,
      priority: n.priority,
      message: n.message,
      question: n.question,
      suggestedAction: n.suggestedAction,
      status: "active",
    }));

    return NextResponse.json({ nudges });
  } catch (error) {
    console.error("Nudge API error:", error);
    return NextResponse.json({ nudges: [] }, { status: 500 });
  }
}
```

**Step 3: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/prompts.ts src/app/api/nudge/route.ts
git commit -m "feat: rebuild nudge prompt — signal-driven, playbook-enriched, dynamic 0-5 nudges"
```

---

### Task 5: Rebuild Focus Prompt & API

**Files:**
- Modify: `src/lib/prompts.ts` (lines 155-213 — `getFocusSystemPrompt`)
- Modify: `src/app/api/focus/route.ts` (full file)

**Step 1: Rewrite getFocusSystemPrompt**

Replace `getFocusSystemPrompt` with a factory function similar to the nudge prompt. The focus prompt prioritizes and frames the signals as a coaching agenda.

```typescript
export function getFocusSystemPrompt(
  structuralFacts: string,
  playbooks: string,
  adminInstructions: string
): string {
  return `You are a product management coach creating a prioritized coaching agenda for a PM's board.

Today's date: ${new Date().toISOString().split("T")[0]}

LANGUAGE: Always respond in Finnish. All titles, descriptions, and suggested actions must be in Finnish.

## STRUCTURAL FACTS (verified)

${structuralFacts}

## COACHING PLAYBOOKS

${playbooks}

## ADMIN DIRECTIVES

${adminInstructions}

## YOUR TASK

Based on the structural signals and your analysis of board content quality, create a prioritized coaching agenda.

1. Rank the detected issues by coaching impact (most important first).
2. Group related signals into single focus items where appropriate (e.g. multiple orphan items → one focus item).
3. Also analyze board content for quality issues (outputs disguised as outcomes, weak measures, etc.).
4. Generate 1-5 focus items. Only include real issues — fewer is better than filler.
5. Include an analysis summary with counts.

IMPORTANT: When referring to items, outcomes, or goals in title, whyItMatters, or suggestedAction text, always use their actual title or statement, never their ID. The targetId field should still use the actual ID.

Respond with a JSON block:
\`\`\`json
{
  "analysis": {
    "totalItems": 0,
    "deliveryItems": 0,
    "discoveryItems": 0,
    "outcomesWithoutMeasure": 0,
    "unlinkedItems": 0
  },
  "focusItems": [
    {
      "priority": "high|medium|low",
      "title": "...",
      "whyItMatters": "...",
      "antiPattern": "...",
      "targetType": "goal|outcome|item",
      "targetId": "...",
      "suggestedAction": "..."
    }
  ]
}
\`\`\`

Rules:
- antiPattern should be the pattern ID or "other" for novel issues
- targetId must reference an actual ID from the board
- Order focusItems by coaching impact, most important first`;
}
```

**Step 2: Update the focus API route**

Apply the same signal-driven pattern as the nudge route:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getFocusSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "@/lib/board-signals";
import { getPlaybooksForSignals, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState, FocusItem } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };

  const signals = analyzeBoardSignals(boardState);
  const structuralFacts = formatSignalsForPrompt(signals);

  const structuralPatternIds = signals.map((s) => s.antiPattern);
  const contentPlaybookIds = [
    "output-not-outcome", "weak-measure", "measure-mismatch",
    "assumption-risk", "goal-framing", "solution-as-problem",
    "missing-who", "vague-goal", "duplicate-intent",
    "timeframe-mismatch", "discovery-quality",
  ];
  const playbooks = getPlaybooksForSignals([...structuralPatternIds, ...contentPlaybookIds]);
  const playbookText = formatPlaybooksForPrompt(playbooks);

  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getFocusSystemPrompt(structuralFacts, playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Here is the full board content:\n\n${boardDescription}\n\nCreate a prioritized coaching agenda.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Focus API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ focusItems: [], parseError: true });
    }

    const parsed = result.parsed as { focusItems: Array<{
      priority: "high" | "medium" | "low";
      title: string;
      whyItMatters: string;
      antiPattern: string;
      targetType: "goal" | "outcome" | "item";
      targetId: string;
      suggestedAction: string;
    }> };

    const focusItems: FocusItem[] = parsed.focusItems.map((f, i) => ({
      id: `focus-${Date.now()}-${i}`,
      priority: f.priority,
      status: "pending",
      title: f.title,
      whyItMatters: f.whyItMatters,
      antiPattern: f.antiPattern,
      targetType: f.targetType,
      targetId: f.targetId,
      suggestedAction: f.suggestedAction,
    }));

    return NextResponse.json({ focusItems });
  } catch (error) {
    console.error("Focus API error:", error);
    return NextResponse.json({ focusItems: [] }, { status: 500 });
  }
}
```

**Step 3: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/prompts.ts src/app/api/focus/route.ts
git commit -m "feat: rebuild focus prompt — signal-driven coaching agenda, 1-5 dynamic items"
```

---

### Task 6: Enhance Sparring Prompt

**Files:**
- Modify: `src/lib/prompts.ts` (lines 118-153 — `getSparSystemPrompt`)
- Modify: `src/app/api/spar/route.ts`

**Step 1: Update getSparSystemPrompt to accept playbook and admin instructions**

Replace the `getSparSystemPrompt` function with a version that takes the relevant playbook and admin instructions:

```typescript
export function getSparSystemPrompt(
  playbook: string,
  adminInstructions: string
): string {
  return `You are a product management sparring partner grounded in Marty Cagan's empowered teams model. You help PMs think through specific issues with their product work.

Your coaching style:
- The conversation starts from YOUR nudge — you generated it, the PM clicked to explore it. Don't praise them for "noticing" or "good observation" — dive straight into the issue
- Ask questions more than give answers
- Use the coaching playbook below to guide your questions and suggestions
- Steer toward concrete action the PM can take RIGHT NOW on their board
- After 2-3 exchanges, propose a specific change (updated outcome statement, splitting an item, adding discovery work, defining a measure)
- Keep it short — 2-3 sentences per response
- When you propose a change, format it as an "apply" suggestion the PM can accept

LANGUAGE: Always respond in Finnish. The user is a Finnish PM.

## COACHING PLAYBOOK FOR THIS NUDGE

${playbook}

## ADMIN DIRECTIVES

${adminInstructions}

## KNOWLEDGE BASE

You are an expert in:
- Marty Cagan's empowered product teams (Inspired, Empowered)
- Outcome-driven development and OKRs
- Continuous discovery habits (Teresa Torres)
- Feature factory anti-patterns (John Cutler)
- Discovery vs delivery — validating before building
- Measuring behavior change, not output

When you want to suggest a concrete board change, include a JSON block:
\`\`\`json
{
  "type": "suggestion",
  "action": "update_outcome|update_item|add_item|split_item|update_goal",
  "targetId": "...",
  "changes": { ... }
}
\`\`\`

For add_item: targetId should be the outcomeId to link the new item to. changes should include { "title": "...", "type": "discovery|delivery", "description": "..." }.
For split_item: targetId should be the existing item ID. changes should include { "title": "..." } for the new split-off item.
For updates: targetId is the entity being updated, changes are the fields to modify.

Keep conversations to 3-4 exchanges maximum. After that, push to action.`;
}
```

**Step 2: Update the spar API route**

Modify `src/app/api/spar/route.ts` to look up the relevant playbook for the nudge's anti-pattern and inject admin instructions:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getSparSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { PLAYBOOKS, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, nudgeContext } = await req.json();

  // Look up the playbook for this nudge's anti-pattern (if available)
  const antiPattern = nudgeContext.nudge.antiPattern || nudgeContext.nudge.suggestedAction ? "" : "";
  const playbook = PLAYBOOKS[antiPattern];
  const playbookText = playbook
    ? formatPlaybooksForPrompt([playbook])
    : "No specific playbook for this nudge. Use your general coaching expertise.";

  const contextMessage = `[System context — the PM clicked "Think about this" on one of YOUR coaching nudges. They haven't said anything yet. Start by digging into the issue — don't praise them for noticing it, since you generated the nudge.]

Your nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

The ${nudgeContext.nudge.targetType} it's about:
${JSON.stringify(nudgeContext.target, null, 2)}`;

  const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];
  claudeMessages.push({ role: "user", content: contextMessage });

  if (messages && messages.length > 0) {
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: getSparSystemPrompt(playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);
    let suggestion = null;
    let displayText = text;

    if (result) {
      const parsed = result.parsed as { type?: string };
      if (parsed.type === "suggestion") {
        suggestion = parsed;
        displayText = result.displayText;
      }
    }

    return NextResponse.json({ text: displayText, suggestion });
  } catch (error) {
    console.error("Spar API error:", error);
    return NextResponse.json(
      { error: "Failed to get coaching response" },
      { status: 500 }
    );
  }
}
```

Note: The nudge object may or may not have an `antiPattern` field depending on whether it was generated by the old or new system. The code gracefully falls back to generic coaching if no playbook is found.

**Step 3: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/prompts.ts src/app/api/spar/route.ts
git commit -m "feat: enhance sparring with anti-pattern playbooks and admin instructions"
```

---

### Task 7: Update Nudge type to include antiPattern

**Files:**
- Modify: `src/types/board.ts` (Nudge interface, ~line 47-57)

**Step 1: Add antiPattern to Nudge interface**

The new nudge API returns `antiPattern` in each nudge. Add it to the Nudge type so it can be passed to the sparring panel:

In `src/types/board.ts`, add `antiPattern?: string;` to the Nudge interface (after the existing `suggestedAction?` field):

```typescript
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
  antiPattern?: string;
}
```

**Step 2: Verify the build passes**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build succeeds. The field is optional so no other code needs to change.

**Step 3: Commit**

```bash
git add src/types/board.ts
git commit -m "feat: add antiPattern field to Nudge type for playbook lookup in sparring"
```

---

### Task 8: Final build verification and push

**Step 1: Full build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Clean build, no errors.

**Step 2: Push all commits**

```bash
git push
```
