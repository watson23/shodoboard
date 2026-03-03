# Coaching Engine Redesign

## Problem

The AI coaching system generates nudges that don't match board reality (hallucinated signals), has shallow coaching knowledge, and forces exactly 5 nudges even when fewer real issues exist.

## Philosophy

Coaching is grounded in Marty Cagan's empowered teams model: teams own outcomes not outputs, discovery before delivery, prototype-test-learn cycles. The AI coach challenges feature factory patterns and steers PMs toward outcome-driven thinking.

## Architecture: Two-Layer Signal Detection

### Layer 1: Structural signals (pre-computed in code)

Deterministic detection from board state. The AI cannot contradict these facts.

| Signal | Detection logic | Severity |
|--------|----------------|----------|
| `unmeasured-outcome` | `outcome.measureOfSuccess === ""` | high |
| `output-only-goal` | All items under goal are delivery, 0 discovery | high |
| `shipped-not-learning` | ≥1 item in shipped, 0 in measuring for that outcome | medium |
| `orphan-work` | `item.outcomeId === null` | low per item, high if >3 |
| `scope-creep` | >7 items under a single goal | medium |
| `stale-discovery` | Discovery item still in opportunities | low |
| `no-discovery-board-wide` | Zero discovery items on the entire board | high |
| `discovery-delivery-ratio` | Board-wide ratio below 20% discovery | medium |
| `bottleneck` | ≥4 items in one column for an outcome, 0 in the next | medium |
| `empty-goal` | Goal has 0 outcomes linked | high |
| `measuring-without-measure` | Item in measuring column but outcome has no measureOfSuccess | medium |
| `all-early-stage` | All items for an outcome are in opportunities/discovering | low |
| `unbalanced-outcomes` | One outcome under a goal has 6+ items, another has ≤1 | low |

### Layer 2: Content quality signals (AI-evaluated)

The AI reads board text and evaluates quality. These require judgment.

| Signal | What AI evaluates |
|--------|-------------------|
| `output-not-outcome` | Outcome statement describes a feature/output, not a behavior change |
| `weak-measure` | Measure is vague, unmeasurable, or a vanity metric |
| `measure-mismatch` | Measure doesn't track the stated behavior change |
| `assumption-risk` | Item in ready/building has untested assumptions in its description |
| `goal-framing` | Goal is an activity target, not a business outcome |
| `solution-as-problem` | Item describes a solution without articulating the problem |
| `missing-who` | Outcome doesn't specify which users/segment changes behavior |
| `vague-goal` | Goal is too generic to be actionable |
| `duplicate-intent` | Multiple items/outcomes addressing the same thing |
| `timeframe-mismatch` | Goal timeframe doesn't match scope of work underneath |
| `discovery-quality` | Discovery item lacks a clear hypothesis or learning goal |

### Open coaching slot

The AI is explicitly told: "Beyond the defined signals, flag any other product thinking issues you notice as `other` with a clear explanation." This preserves AI creativity while keeping structured signals hallucination-free.

## Coaching Knowledge Base

Each anti-pattern gets a structured playbook:

```typescript
interface AntiPatternPlaybook {
  id: string;
  name: string;
  layer: "structural" | "content";
  philosophy: string;        // Cagan-aligned WHY this matters
  coachingApproach: string;  // HOW to coach about it
  exampleQuestions: string[]; // Bank of sharp coaching questions
  suggestedActions: string[]; // Concrete board actions
}
```

Only the relevant playbooks for detected signals are injected into the prompt — not the entire knowledge base.

## Admin Instructions

A `src/lib/coaching-instructions.ts` file exports a string that gets injected into all coaching prompts. Edit in Claude Code or directly in the repo to tune coaching behavior without changing prompt logic.

## Prompt Architecture

```
BoardState
    |
    |---> analyzeBoardSignals()  -->  structural signals (code)
    |
    |---> serializeBoardForAI()  -->  board content (full JSON with IDs)
    |
    |---> getPlaybooks(signals)  -->  relevant coaching knowledge
    |
    └---> ADMIN_COACHING_INSTRUCTIONS  -->  admin overrides
            |
            v
    +-----------------------------+
    |  AI PROMPT                  |
    |  1. Structural facts        |
    |  2. Board content (full)    |
    |  3. Coaching playbooks      |
    |  4. Admin instructions      |
    |  5. "Also spot other issues"|
    |  --> Generate 0-5 nudges    |
    +-----------------------------+
```

The AI still sees the full board (needed for targeting and content analysis) but cannot contradict pre-computed structural facts.

## Impact on AI Touchpoints

### Nudge API (`/api/nudge`)
Biggest change. Receives structural facts + board content + playbooks + admin instructions. Generates 0-5 nudges (dynamic, not forced). Each nudge grounded in a verified signal or AI content analysis.

### Focus API (`/api/focus`)
Same signal-driven approach. Constraint changes from "exactly 3-5" to "1-5 based on what's real."

### Sparring API (`/api/spar`)
Lighter change. System prompt now includes the relevant playbook for the nudge's anti-pattern, giving AI a coaching progression. Admin instructions injected.

### Intake API (`/api/intake`)
No change in this iteration. Could benefit from coaching knowledge later.

## New/Changed Files

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/board-signals.ts` | New | `analyzeBoardSignals()` — Layer 1 structural detection |
| `src/lib/coaching-knowledge.ts` | New | Anti-pattern playbooks with Cagan philosophy |
| `src/lib/coaching-instructions.ts` | New | Admin-editable coaching directives |
| `src/lib/prompts.ts` | Modified | Nudge, focus, spar prompts rebuilt |
| `src/app/api/nudge/route.ts` | Modified | Signal-driven, dynamic 0-5 |
| `src/app/api/focus/route.ts` | Modified | Signal-driven, 1-5 |
| `src/app/api/spar/route.ts` | Modified | Playbook + admin instructions |

## Design Decisions

- **Pre-computed structural signals** eliminate hallucination about board state
- **Full board content still sent** so AI can evaluate text quality and target correctly
- **Dynamic 0-5 nudges** prevents filler; empty state means the board is healthy
- **Open coaching slot** preserves AI ability to spot novel issues
- **Admin instructions file** enables fast iteration without prompt refactoring
- **Playbook-per-signal** keeps prompts focused and token-efficient
