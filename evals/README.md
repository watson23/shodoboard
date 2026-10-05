# Coaching evals

A small, honest way to answer "did that prompt or model change make the coaching better?"

## What it measures

Each file in `boards/` is a board plus a list of **expectations**: the things a good coach must notice (or must not claim) on that board. The runner:

1. runs the production coaching pass (`src/lib/coach.ts`, same prompt, model and effort as the app),
2. applies **hard checks** that need no judgement: counts, text length limits, no raw IDs leaking into prose,
3. asks a **judge model** (Sonnet 5.5) whether each expectation was met, with evidence, and rates groundedness, tone and specificity from 1 to 5.

The headline number is *expectations met*. The 1-5 ratings are a smell test, not a score to optimise.

## Running

```bash
npm run eval:coach              # all boards
npm run eval:coach -- finnish   # one board
```

Needs `ANTHROPIC_API_KEY` in `.env.local`. A full run costs roughly $0.30 and takes two to three minutes. Results land in `results/<timestamp>.json` (git-ignored) with the full coaching output, so a regression can be read, not just counted.

## Adding a board

Copy any file in `boards/`, change the content, and write expectations that are **checkable from the output alone**. Good expectation: "Flags outcome-1 as an output, not a behavior change". Bad expectation: "Gives good advice". Include at least one *negative* expectation per board (something the coach must not say), otherwise a coach that flags everything scores perfectly.

The boards here cover:

| board | tests |
|---|---|
| feature-factory | theme-as-goal, outputs-as-outcomes, no discovery, no measures |
| healthy | strengths recognised, no invented problems |
| finnish | language fidelity, measure mismatch, missing baseline |
| shipped-not-measured | shipped-not-learning, vanity metric |
| misaligned | goal/outcome alignment, statement vs behavior mismatch, duplicate intent |
| empty-goal | empty goal, task-as-goal, grouping orphan work |

## Using it

Run it before and after a prompt change, compare `expectations met` and read the `✗` lines. If a change helps one board and hurts another, the eval has done its job: that is a real trade-off to decide, not noise.
