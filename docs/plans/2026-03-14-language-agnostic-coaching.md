# Language-Agnostic Coaching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all coaching auto-detect and respond in the user's language. Remove hardcoded Finnish from prompts, playbooks, UI labels, and exports. The app becomes language-agnostic — any language Claude supports works out of the box.

**Architecture:** Replace every "Always respond in Finnish" directive with "Detect the user's language from their board content and respond in the same language." Translate all Finnish coaching content (instructions, playbooks, entity defaults, UI strings, export text) to English. The AI prompt system is the only translation layer — no i18n library needed.

**Tech Stack:** TypeScript, Next.js (existing stack — no new dependencies)

---

## Inventory of Changes

| File | What's Finnish | Action |
|------|---------------|--------|
| `src/lib/prompts.ts` | 6 system prompts with Finnish language directives + Finnish instruction blocks | Rewrite language directives to auto-detect; translate Finnish instruction blocks to English |
| `src/lib/coaching-instructions.ts` | 10 Finnish coaching directives | Translate to English |
| `src/lib/coaching-knowledge.ts` | ~70 Finnish `exampleQuestions` + ~40 Finnish `suggestedActions` across 24 playbooks | Translate all to English |
| `src/lib/entities.ts` | Default names: "Uusi tavoite", "Uusi tulos", "Uusi työ" | Change to "New goal", "New outcome", "New work" |
| `src/lib/sparring.ts` | Fallback "Uusi työ" on line 33 | Change to "New work" |
| `src/lib/export.ts` | Full Finnish export (markdown + HTML) — headings, labels, findings, priority badges | Translate to English |
| `src/components/CoachingAgenda.tsx` | Priority labels, status buttons, action button, empty/error states, strengths header | Translate to English |
| `src/app/intake/page.tsx` | Consent screen (already bilingual FI+EN) | Make English primary, Finnish secondary — or English-only |

---

### Task 1: Translate coaching instructions to English

**Files:**
- Modify: `src/lib/coaching-instructions.ts`

**Step 1: Replace Finnish directives with English**

Replace the entire `ADMIN_COACHING_INSTRUCTIONS` constant. Translate each directive preserving meaning:

```typescript
export const ADMIN_COACHING_INSTRUCTIONS = `
- Use Marty Cagan's "empowered teams" framework: teams own outcomes, not outputs
- Emphasize the importance of discovery work — every outcome needs validation before building
- Challenge feature factory thinking: listing features is not product strategy
- Be direct and provocative, but constructive — the PM needs a mirror, not a cheerleader
- Always suggest a concrete action the PM can take on their board RIGHT NOW
- Don't suggest metrics that require complex analytics tools — favor simple behavior metrics
- Remember: "shipped" doesn't mean "done" — done means measured impact
- Challenge goals boldly — don't accept themes ("Growth", "User experience") as goals. A goal must connect to concrete business value.
- Always ask "so what?" about goals — if the goal succeeds, what happens to the business? If there's no answer, the goal is too abstract.
- Favor goals with a baseline and target — without both, you can't measure progress
`.trim();
```

**Step 2: Update the file comment**

Change the guideline comment from "Write in Finnish (the coaching language)" to "Write in English (the AI will deliver coaching in the user's language)".

**Step 3: Commit**

```bash
git add src/lib/coaching-instructions.ts
git commit -m "chore: translate coaching instructions from Finnish to English"
```

---

### Task 2: Make system prompts language-agnostic

**Files:**
- Modify: `src/lib/prompts.ts`

This is the largest task. Each of the 6 prompt functions needs its language directive and Finnish instruction blocks translated.

**Step 1: Update `getIntakeSystemPrompt()`**

Replace the entire function body. Key changes:
- Replace `SÄVY:` block (lines 6-7) with English equivalent
- Replace `ENSIMMÄINEN VASTAUS:` block (lines 8-14) with English
- Replace `TÄRKEÄÄ — Älä jää yksityiskohtiin:` block (lines 17-20)
- Replace `ENNEN TAULUN LUONTIA` block (lines 22-27)
- Replace `Keskustelun aikana:` block (lines 29-30)
- Replace `TAVOITTEIDEN LAATU` block (lines 32-48)
- Replace `LANGUAGE: Always respond in Finnish...` (line 58) with auto-detect directive
- Replace `PUUTTUVAT TIEDOT` block (lines 62-65)
- Replace Finnish UI text references ("Luon taulun sinulle", "Rakennetaan taulu tämän pohjalta") in line 69

The new LANGUAGE directive for ALL prompts:

```
LANGUAGE: Detect the language of the user's board content (goals, outcomes, items, backlog text). Respond in the same language. If the content is mixed or language is unclear, default to English. Keep all generated text (item titles, goal statements, outcome statements, descriptions, metrics, coaching messages) in the detected language.
```

The new TONE directive (replacing SÄVY):

```
TONE: Professional and matter-of-fact. Speak like an experienced colleague — directly, clearly, without sugar-coating. Don't praise unnecessarily ("Amazing!", "Great!"). Don't use exclamation marks. Corrections and questions can be stated directly without a softening positive frame. Be friendly but don't try to be enthusiastic.
```

**Step 2: Update `getNudgeSystemPrompt()`**

- Replace line 127 `LANGUAGE:` directive with the auto-detect version
- Replace line 129 `TONE:` to English (already partially English, just remove Finnish phrasing references)
- Replace Finnish example text in lines 159, 203-205 with English equivalents
- Update the character limits to remove Finnish-specific examples — use English examples instead:
  - message example: "Outcome is an output, not a behavior change" or "Measure missing"
  - suggestedAction: use "Consider...", "Try adding...", "What if..." instead of "Harkitse...", "Kokeile lisätä...", "Entä jos..."

**Step 3: Update `getSparSystemPrompt()`**

- Replace line 243 `LANGUAGE:` directive with auto-detect version
- Replace Finnish coaching style examples (lines 232, 234, 236) with English equivalents:
  - "What if the outcome was phrased like: '...'? How does that sound?" instead of "Entä jos outcome olisi muotoiltu näin..."
  - "What decision do you need to move forward?" instead of "Minkä päätöksen tarvitset tähän?"

**Step 4: Update `getBoardSparSystemPrompt()`**

- Replace lines 283-285 (LANGUAGE + SÄVY blocks) with English auto-detect + tone
- Replace Finnish coaching style examples in lines 291, 293, 297 with English

**Step 5: Update `getFocusSystemPrompt()`**

- Replace line 329 `LANGUAGE:` directive with auto-detect version

**Step 6: Update `getDiscoveryPromptSystemPrompt()`**

- Replace line 395 `LANGUAGE:` directive with auto-detect version

**Step 7: Update column mapping comments**

The column mapping (lines 108-116) already has both English and Finnish terms. Keep as-is — this allows the AI to recognize columns in either language.

**Step 8: Run build to verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat: make all coaching prompts language-agnostic with auto-detection"
```

---

### Task 3: Translate playbook example questions and suggested actions

**Files:**
- Modify: `src/lib/coaching-knowledge.ts`

**Step 1: Translate all 24 playbooks**

For each playbook, translate `exampleQuestions[]` and `suggestedActions[]` from Finnish to English. The `philosophy`, `coachingApproach`, `name`, and `id` fields are already in English — leave them untouched.

Here are the translations for all 24 playbooks (translate each array in-place):

**unmeasured-outcome:**
```typescript
exampleQuestions: [
  "If this outcome succeeds, what would you see in user data a month from now?",
  "What is the concrete behavior change you could measure?",
  "How would you distinguish success from failure — what's the threshold?",
],
suggestedActions: [
  "Define a concrete measure: [behavior] [direction] [target value] [timeframe]",
  "Ask the team: 'If this succeeds, what do we see in the data?'",
],
```

**output-only-goal:**
```typescript
exampleQuestions: [
  "What assumptions do you need to validate before building this?",
  "When did you last talk to users about this problem?",
  "If this feature doesn't work, how will you find out — before or after building?",
],
suggestedActions: [
  "Add at least one discovery item for each outcome",
  "Conduct 3-5 user interviews before moving anything to the Ready column",
],
```

**shipped-not-learning:**
```typescript
exampleQuestions: [
  "Have you looked at the data since this was released?",
  "What did you expect to see in user data — and did it happen?",
  "Who on the team is responsible for tracking impact?",
],
suggestedActions: [
  "Move shipped items to the measuring column and define what you're tracking",
  "Schedule 30 min with the team: 'What did we learn from the last release?'",
],
```

**orphan-work:**
```typescript
exampleQuestions: [
  "What behavior changes as a result of this?",
  "Does this relate to an outcome that isn't on the board yet?",
  "If you didn't do this, what would happen — who suffers?",
],
suggestedActions: [
  "Link to an existing outcome or create a new outcome this belongs to",
  "If this is tech debt, ask: 'What user problem gets worse if we don't fix this?'",
],
```

**scope-creep:**
```typescript
exampleQuestions: [
  "If you could only do 3 of these, which would you pick?",
  "Is this one big goal or actually two separate ones?",
  "Which of these are must-have vs nice-to-have this quarter?",
],
suggestedActions: [
  "Prioritize the 3 most important items and defer the rest to next quarter",
  "Consider splitting the goal into two more focused goals",
],
```

**stale-discovery:**
```typescript
exampleQuestions: [
  "When are you actually going to start this — this week?",
  "What's the smallest possible way to test this assumption?",
  "Can you talk to 3 users this week?",
],
suggestedActions: [
  "Move to the discovering column and book the first interview this week",
  "Convert from broad research to a small experiment: 'This week I'll learn X'",
],
```

**no-discovery-board-wide:**
```typescript
exampleQuestions: [
  "How do you know you're building the right thing?",
  "What's the biggest assumption this plan rests on?",
  "When did you last talk to users?",
],
suggestedActions: [
  "Add at least one discovery item for each outcome",
  "Start with the riskiest assumption: what could make this entire plan worthless?",
],
```

**discovery-delivery-ratio:**
```typescript
exampleQuestions: [
  "Which of these delivery items are based on validated insights vs assumptions?",
  "If the budget tightened, which items would you cut — and is that decision based on data?",
],
suggestedActions: [
  "Identify 2-3 high-risk delivery items and add a preceding discovery phase for each",
],
```

**bottleneck:**
```typescript
exampleQuestions: [
  "Why aren't these items progressing — what's blocking them?",
  "Is there a dependency on another team or decision?",
],
suggestedActions: [
  "Identify the blocker and raise it in the team's next standup/planning",
],
```

**empty-goal:**
```typescript
exampleQuestions: [
  "What behavior changes would indicate progress toward this goal?",
  "How would you break this into 1-3 concrete outcomes?",
],
suggestedActions: [
  "Add 1-3 outcomes that describe measurable behavior changes",
],
```

**measuring-without-measure:**
```typescript
exampleQuestions: [
  "What specific data point are you tracking right now?",
  "How do you distinguish success from failure?",
],
suggestedActions: [
  "Define the outcome's measure of success before continuing to measure",
],
```

**all-early-stage:**
```typescript
exampleQuestions: [
  "Is this intentionally deferred or is something blocking progress?",
  "What would be the first step to move this forward?",
],
suggestedActions: [
  "Pick one item and make it active — what's the smallest first step?",
],
```

**unbalanced-outcomes:**
```typescript
exampleQuestions: [
  "Is this large outcome actually one thing or should it be split?",
  "Is the small outcome missing items or is it already in good shape?",
],
suggestedActions: [
  "Consider splitting the large outcome into two more focused ones",
],
```

**output-not-outcome:**
```typescript
exampleQuestions: [
  "If this succeeds perfectly, what would users do differently?",
  "This sounds like a feature — what's the behavior change behind it?",
],
suggestedActions: [
  "Reframe the outcome: '[User segment] [does something] [measurably differently]'",
],
```

**weak-measure:**
```typescript
exampleQuestions: [
  "Does this actually measure the behavior change you want?",
  "Could this metric go up without anything actually improving?",
],
suggestedActions: [
  "Switch to a metric that directly reflects the behavior change",
],
```

**measure-mismatch:**
```typescript
exampleQuestions: [
  "If this metric improves, does it definitely mean the outcome is achieved?",
  "Could the metric improve even if users don't change their behavior?",
],
suggestedActions: [
  "Switch to a metric that directly reflects the outcome's behavior change",
],
```

**assumption-risk:**
```typescript
exampleQuestions: [
  "What's the biggest assumption behind this — and has it been tested?",
  "If this assumption is wrong, what happens?",
],
suggestedActions: [
  "Identify the riskiest assumption and add a discovery item to test it",
],
```

**goal-framing:**
```typescript
exampleQuestions: [
  "What's the business result you want — not what you plan to do?",
  "If the 'launch' succeeds but results don't change, is the goal achieved?",
],
suggestedActions: [
  "Reframe the goal: '[Business metric] [direction] [target value] [timeframe]'",
],
```

**solution-as-problem:**
```typescript
exampleQuestions: [
  "What problem does this solve — and for whom?",
  "How do you know this is the right solution?",
],
suggestedActions: [
  "Add the problem this solves to the description, or add a discovery item to validate the need",
],
```

**missing-who:**
```typescript
exampleQuestions: [
  "Which users exactly — new, returning, a specific segment?",
  "When you say 'users', do you mean everyone or a specific group?",
],
suggestedActions: [
  "Specify the outcome: '[Specific user segment] does [concrete thing]'",
],
```

**vague-goal:**
```typescript
exampleQuestions: [
  "What's the one number that tells you whether you succeeded?",
  "When you say 'improve', how much is enough?",
],
suggestedActions: [
  "Make it specific: '[Metric] [direction] [target value] [timeframe]'",
],
```

**duplicate-intent:**
```typescript
exampleQuestions: [
  "These two seem to address the same thing — should they be merged?",
  "How do these differ concretely?",
],
suggestedActions: [
  "Merge the overlapping items or clarify how they differ",
],
```

**timeframe-mismatch:**
```typescript
exampleQuestions: [
  "Is this timeframe realistic for a change of this scope?",
  "Should you scale the goal or extend the timeframe?",
],
suggestedActions: [
  "Check whether the timeframe aligns with the scope of the outcomes",
],
```

**discovery-quality:**
```typescript
exampleQuestions: [
  "What's the one question you want answered?",
  "How will the result of this change what you build?",
],
suggestedActions: [
  "Add a hypothesis to the description: 'We believe [X], and we'll test it by [method]'",
],
```

**weak-goal-metric:**
```typescript
exampleQuestions: [
  "If this metric improves, does the business actually get better — or does it just feel that way?",
  "Could this metric rise without anyone's behavior changing?",
  "What's the one number whose movement tells you that you've succeeded?",
],
suggestedActions: [
  "Replace the vanity metric with a behavior-based metric that reflects real change",
  "Ask: 'If this number goes up, what does it mean for our customers?'",
],
```

**statement-behavior-mismatch:**
```typescript
exampleQuestions: [
  "The outcome statement and behavior change tell different stories — which one is right?",
  "If the behavior change happens, does the outcome statement also come true — or are they disconnected?",
  "Which one better describes what you're actually going for?",
],
suggestedActions: [
  "Align the statement and behavior change — they should tell the same story from different angles",
  "If they conflict, pick one and adjust the other to match",
],
```

**misaligned-item:**
```typescript
exampleQuestions: [
  "How does this work change user behavior in the way the outcome describes?",
  "If this item is completed, does the outcome's metric move — why?",
  "Is this under the right outcome or should it be linked to a different one?",
],
suggestedActions: [
  "Check the chain: item -> outcome's behavior change. If the link is weak, consider relinking",
  "If the item doesn't clearly support any outcome, consider whether it's needed right now",
],
```

**no-metrics-goal:**
```typescript
exampleQuestions: [
  "Six months from now, how will you know if you succeeded or not?",
  "If you could track only one number, what would it be?",
  "If you had to report to leadership, what number would you show?",
],
suggestedActions: [
  "Define 1-2 metrics that reflect real progress, not activity",
  "Start by measuring the current state: what's the baseline you can set a target against?",
],
```

**impact-disconnected-goal:**
```typescript
exampleQuestions: [
  "If this goal succeeds, what changes in the business — revenue, retention, costs?",
  "Who benefits from this concretely — which user segment or stakeholder?",
  "What's the value chain: goal -> behavior change -> business impact?",
],
suggestedActions: [
  "Add a value connection to the goal: '[Metric] improves because [user segment] [changes behavior]'",
  "Ask: 'If this succeeds, what do I tell leadership — why does this matter?'",
],
```

**goal-missing-baseline:**
```typescript
exampleQuestions: [
  "What's the current level of this metric — do you know?",
  "If you don't know the current level, how will you judge if the change is enough?",
  "Should the first step be measuring the current state before setting a target?",
],
suggestedActions: [
  "Add the current level to the goal: '[Metric] current X -> target Y [timeframe]'",
  "If the current level is unknown, add a discovery item to measure it",
],
```

**goal-outcome-alignment:**
```typescript
exampleQuestions: [
  "If this outcome is achieved, do the goal's metrics move?",
  "How does this outcome connect to the goal — what's the chain?",
  "Can the goal succeed without this outcome — or fail despite it?",
],
suggestedActions: [
  "Check the connection between outcome and goal metrics — explain how the outcome affects the goal",
  "If the connection is weak, consider moving the outcome under a more fitting goal",
],
```

**Step 2: Commit**

```bash
git add src/lib/coaching-knowledge.ts
git commit -m "chore: translate all playbook questions and actions from Finnish to English"
```

---

### Task 4: Translate entity defaults and sparring fallback

**Files:**
- Modify: `src/lib/entities.ts`
- Modify: `src/lib/sparring.ts`

**Step 1: Update entity defaults**

In `entities.ts`, change:
- `"Uusi tavoite"` -> `"New goal"` (line 7)
- `"Uusi tulos"` -> `"New outcome"` (line 20)
- `"Uusi työ"` -> `"New work"` (line 33)

**Step 2: Update sparring fallback**

In `sparring.ts`, change:
- `"Uusi työ"` -> `"New work"` (line 33)

**Step 3: Commit**

```bash
git add src/lib/entities.ts src/lib/sparring.ts
git commit -m "chore: translate entity default names from Finnish to English"
```

---

### Task 5: Translate CoachingAgenda UI labels

**Files:**
- Modify: `src/components/CoachingAgenda.tsx`

**Step 1: Translate priority badges**

In the `PriorityBadge` component (around line 48), change:
- `"Tärkeä"` -> `"Important"`
- `"Huomionarvoinen"` -> `"Noteworthy"`
- `"Hyvä tietää"` -> `"Good to know"`

**Step 2: Translate status buttons**

In the `StatusButton` component (around line 77):
- `"Valmis"` (line 91) -> `"Done"`
- `"Kesken"` (line 103) -> `"In progress"`
- `"Aloita"` (line 114) -> `"Start"`

**Step 3: Translate action button**

- `"Pohdi tätä"` (line 195) -> `"Explore this"`

**Step 4: Translate empty/error states**

- `"Agendan lataus epäonnistui"` (line 295) -> `"Failed to load agenda"`
- `"AI-analyysi ei vastannut ajoissa. Kokeile uudelleen."` (line 298) -> `"AI analysis didn't respond in time. Try again."`
- `"Yritä uudelleen"` (line 305) -> `"Try again"`
- `"Ei fokuskohteita"` (line 322) -> `"No focus items"`
- `"Lisää tavoitteita ja tuloksia taulullesi, niin valmennus tunnistaa tärkeimmät kehityskohteet."` (line 325) -> `"Add goals and outcomes to your board, and coaching will identify the most important areas for improvement."`

**Step 5: Translate strengths header**

- `"Vahvuudet"` (line 337) -> `"Strengths"`

**Step 6: Commit**

```bash
git add src/components/CoachingAgenda.tsx
git commit -m "chore: translate CoachingAgenda UI labels from Finnish to English"
```

---

### Task 6: Translate export (markdown + HTML)

**Files:**
- Modify: `src/lib/export.ts`

**Step 1: Translate `priorityBadge()` function**

- `"🔴 Korkea"` -> `"🔴 High"`
- `"🟡 Keskitaso"` -> `"🟡 Medium"`
- `"🟢 Matala"` -> `"🟢 Low"`

**Step 2: Translate `generateMarkdownExport()` — all Finnish strings**

- `"# Shodoboard — Pitch Deck"` -> keep as-is (brand name)
- `"Luotu:"` -> `"Created:"`; change locale from `"fi-FI"` to `undefined` (uses system locale)
- `"## 1. Yhteenveto"` -> `"## 1. Summary"`
- `"Taulu on tyhjä..."` -> `"Board is empty. Start by adding goals, outcomes, and work items."`
- `"Backlogissa oli..."` summary sentence -> translate to English
- `"| Mittari | Arvo |"` -> `"| Metric | Value |"`
- `"| Tavoitteita |"` -> `"| Goals |"`, etc. for all table rows
- `"## 2. Keskeiset havainnot"` -> `"## 2. Key Findings"`
- All `findings` titles and explanations -> translate
- `"Merkittäviä havaintoja ei tunnistettu — hyvä työ!"` -> `"No significant findings — good work!"`
- `"## 3. Suositellut painopisteet"` -> `"## 3. Recommended Focus Areas"`
- `"Suositeltu toimenpide:"` -> `"Recommended action:"`
- `"Taulun yleiskatsaus"` -> `"Board Overview"`
- `"Aikajänne:"` -> `"Timeframe:"`
- `"⚠️ Mittari puuttuu"` -> `"⚠️ Measure missing"`
- `"Mittari:"` -> `"Measure:"`
- `"Orpot itemit (ei outcome-yhteyttä)"` -> `"Orphan items (no outcome link)"`
- `"Avoimet kysymykset"` -> `"Open Questions"`
- All open question templates -> translate
- `"Seuraavat askeleet"` -> `"Next Steps"`
- All next step templates -> translate
- `"*Luotu Shodoboardilla*"` -> `"*Created with Shodoboard*"`

**Step 3: Translate `openPrintableExport()` — all Finnish strings in HTML**

Same strings as above, plus:
- `lang="fi"` -> `lang="en"` in `<html>` tag
- All Finnish labels in the HTML template
- Change date locale from `"fi-FI"` to `undefined`

**Step 4: Commit**

```bash
git add src/lib/export.ts
git commit -m "chore: translate export from Finnish to English"
```

---

### Task 7: Simplify consent screen

**Files:**
- Modify: `src/app/intake/page.tsx`

The consent screen is already bilingual (Finnish primary, English secondary). Since the app is now English-first:

**Step 1: Make English the primary language**

- Swap so English text is primary (larger, darker) and Finnish is secondary (smaller, lighter)
- Change heading: keep bilingual but English first:
  - `"Privacy and data handling"` (primary)
  - `"Tietosuoja ja datan käsittely"` (secondary, smaller)
- Swap all bullet point pairs so English is first
- Button text:
  - `"I understand, continue"` (primary) with Finnish `"Ymmärrän ja jatkan"` as secondary small text below — or just English-only
  - `"Continue without AI"` with Finnish `"Jatka ilman tekoälyä"` as secondary — or just English-only

**Step 2: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "chore: make consent screen English-primary, Finnish-secondary"
```

---

### Task 8: Build and smoke test

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run lint if available**

Run: `npm run lint`
Expected: No new lint errors

**Step 3: Commit any fixes**

If build/lint reveals issues, fix and commit.

---

## Notes for the implementer

- **Do NOT add any i18n library.** The AI is the translation layer.
- **Keep Finnish column name recognition** in the intake prompt's column mapping — existing Finnish boards need to be parseable.
- **The consent screen** is the one place where keeping bilingual text makes sense, since users haven't yet shown their language preference.
- **Export is now English-only.** This is acceptable since the user said UI can be English-only. The AI-generated coaching content within the export (focus items, strengths) will be in whatever language the AI detected.
- **Prompt character limits** for nudge messages/questions/actions: keep the same character limits but update the example text to English.
