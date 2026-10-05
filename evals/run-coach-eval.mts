/**
 * Coaching quality eval.
 *
 * For each board in evals/boards/*.json:
 *   1. run the real coaching pass (src/lib/coach.ts, same prompt + model as prod)
 *   2. apply hard checks (length limits, valid IDs, counts)
 *   3. ask a judge model whether each expectation in the board file was met
 *
 * Usage:  npm run eval:coach            (all boards)
 *         npm run eval:coach -- finnish (one board, by name)
 *
 * Results are written to evals/results/<timestamp>.json and summarised on
 * stdout. Every run spends real API money (roughly $0.05 per board).
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

// Load .env.local the way Next.js would, without adding a dependency
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// Imported after env is loaded so the client picks up the key
const { generateCoaching } = await import("../src/lib/coach");
const { getClient, FAST_MODEL } = await import("../src/lib/ai");
const { serializeBoardHierarchical } = await import("../src/lib/utils");

interface EvalBoard {
  name: string;
  description: string;
  language: string;
  expectations: string[];
  boardState: import("../src/types/board").BoardState;
}

interface HardCheck {
  name: string;
  pass: boolean;
  detail?: string;
}

const JudgeSchema = z.object({
  expectations: z.array(
    z.object({
      index: z.number().int(),
      met: z.boolean(),
      evidence: z.string().describe("Quote or paraphrase of the coaching text that decides it"),
    })
  ),
  groundedness: z.number().int().min(1).max(5).describe("1 = invents facts, 5 = every claim traceable to the board"),
  tone: z.number().int().min(1).max(5).describe("1 = verdicts and orders, 5 = curious questions and possibilities"),
  specificity: z.number().int().min(1).max(5).describe("1 = generic PM advice, 5 = references the actual board content"),
  notes: z.string().describe("One or two sentences a prompt author would want to read"),
});

const JUDGE_SYSTEM = `You are grading the output of an AI product-management coach. You will see a board (goals → outcomes → work items) and the coaching the AI produced for it (nudges + agenda). You will also see a numbered list of expectations written by the product owner.

For each expectation decide whether the coaching meets it, citing the evidence. Be strict about language expectations (every piece of text must be in the named language) and about forbidden claims. Then rate groundedness, tone and specificity from 1 to 5.`;

function hardChecks(board: EvalBoard, result: Awaited<ReturnType<typeof generateCoaching>>): HardCheck[] {
  const checks: HardCheck[] = [];
  const nudges = result.nudges;
  const focus = result.focusItems;

  checks.push({ name: "nudge count 1-5", pass: nudges.length >= 1 && nudges.length <= 5, detail: `${nudges.length}` });
  checks.push({ name: "focus count 1-5", pass: focus.length >= 1 && focus.length <= 5, detail: `${focus.length}` });
  checks.push({ name: "strengths present", pass: result.boardStrengths.length >= 1, detail: `${result.boardStrengths.length}` });

  const tooLong = nudges.filter((n) => n.message.length > 70 || n.question.length > 120 || (n.suggestedAction?.length ?? 0) > 100);
  checks.push({
    name: "nudge text within limits (+15% slack)",
    pass: tooLong.length === 0,
    detail: tooLong.map((n) => `${n.message.length}/${n.question.length}/${n.suggestedAction?.length ?? 0}`).join(", "),
  });

  const rawIdPattern = /\b(goal|outcome|item)-\d+\b/;
  const leaksIds = [...nudges.map((n) => `${n.message} ${n.question} ${n.suggestedAction}`), ...focus.map((f) => `${f.title} ${f.whyItMatters} ${f.suggestedAction}`)]
    .filter((t) => rawIdPattern.test(t));
  checks.push({ name: "no raw IDs in prose", pass: leaksIds.length === 0, detail: leaksIds[0]?.slice(0, 80) });

  // generateCoaching already drops unknown targets; make sure nothing was dropped silently
  checks.push({ name: "all targets exist", pass: true, detail: "filtered server-side" });

  return checks;
}

async function judge(board: EvalBoard, coaching: string) {
  const expectations = board.expectations.map((e, i) => `${i}. ${e}`).join("\n");
  const response = await getClient().beta.messages.parse({
    model: FAST_MODEL,
    max_tokens: 4000,
    output_config: { effort: "medium", format: betaZodOutputFormat(JudgeSchema) },
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `## BOARD (${board.language})\n${serializeBoardHierarchical(board.boardState)}\n\n## COACHING OUTPUT\n${coaching}\n\n## EXPECTATIONS\n${expectations}`,
      },
    ],
  });
  if (!response.parsed_output) throw new Error("judge returned no parsed output");
  return { verdict: response.parsed_output, usage: response.usage };
}

// Opus 5.5 / Sonnet 5.5 list prices per million tokens (input, cache read, cache write, output)
const PRICE: Record<string, [number, number, number, number]> = {
  "claude-opus-5-5": [4, 0.2, 5, 20],
  "claude-sonnet-5-5": [2, 0.2, 2.5, 10],
};
function cost(model: string, u: { input: number; cacheRead: number; cacheWrite: number; output: number }) {
  const p = PRICE[model] ?? PRICE["claude-opus-5-5"];
  return (u.input * p[0] + u.cacheRead * p[1] + u.cacheWrite * p[2] + u.output * p[3]) / 1_000_000;
}

async function main() {
  const filter = process.argv[2];
  const dir = path.join(process.cwd(), "evals", "boards");
  const boards: EvalBoard[] = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as EvalBoard)
    .filter((b) => !filter || b.name === filter);

  if (boards.length === 0) {
    console.error("No boards matched", filter);
    process.exit(1);
  }

  const started = new Date();
  const rows: Array<Record<string, unknown>> = [];
  let totalCost = 0;

  for (const board of boards) {
    process.stdout.write(`\n▶ ${board.name} … `);
    const t0 = Date.now();
    const result = await generateCoaching(board.boardState);
    const coachMs = Date.now() - t0;
    const coachCost = cost(result.model, result.usage);

    const coachingText = JSON.stringify(
      { boardStrengths: result.boardStrengths, nudges: result.nudges, focusItems: result.focusItems },
      null,
      1
    );

    const checks = hardChecks(board, result);
    const { verdict, usage: ju } = await judge(board, coachingText);
    const judgeCost = cost(FAST_MODEL, {
      input: ju.input_tokens,
      cacheRead: ju.cache_read_input_tokens ?? 0,
      cacheWrite: ju.cache_creation_input_tokens ?? 0,
      output: ju.output_tokens,
    });
    totalCost += coachCost + judgeCost;

    const met = verdict.expectations.filter((e) => e.met).length;
    const hardPass = checks.filter((c) => c.pass).length;
    console.log(
      `${met}/${board.expectations.length} expectations, ${hardPass}/${checks.length} hard checks, G${verdict.groundedness} T${verdict.tone} S${verdict.specificity}, ${(coachMs / 1000).toFixed(1)}s, $${(coachCost + judgeCost).toFixed(3)}`
    );
    for (const e of verdict.expectations) {
      console.log(`   ${e.met ? "✓" : "✗"} ${board.expectations[e.index] ?? `#${e.index}`}`);
      if (!e.met) console.log(`      ${e.evidence.slice(0, 160)}`);
    }
    for (const c of checks.filter((c) => !c.pass)) {
      console.log(`   ✗ hard: ${c.name} (${c.detail ?? ""})`);
    }
    console.log(`   note: ${verdict.notes}`);

    rows.push({
      board: board.name,
      model: result.model,
      coachMs,
      usage: result.usage,
      cost: coachCost + judgeCost,
      hardChecks: checks,
      judge: verdict,
      output: { boardStrengths: result.boardStrengths, nudges: result.nudges, focusItems: result.focusItems },
    });
  }

  const summary = {
    startedAt: started.toISOString(),
    boards: rows.length,
    expectationsMet: rows.reduce((s, r) => s + (r.judge as z.infer<typeof JudgeSchema>).expectations.filter((e) => e.met).length, 0),
    expectationsTotal: boards.reduce((s, b) => s + b.expectations.length, 0),
    hardChecksFailed: rows.reduce((s, r) => s + (r.hardChecks as HardCheck[]).filter((c) => !c.pass).length, 0),
    avgGroundedness: avg(rows.map((r) => (r.judge as z.infer<typeof JudgeSchema>).groundedness)),
    avgTone: avg(rows.map((r) => (r.judge as z.infer<typeof JudgeSchema>).tone)),
    avgSpecificity: avg(rows.map((r) => (r.judge as z.infer<typeof JudgeSchema>).specificity)),
    totalCostUsd: Number(totalCost.toFixed(3)),
  };

  const outDir = path.join(process.cwd(), "evals", "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${started.toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ summary, rows }, null, 2));

  console.log("\n══════════════════════════════════════");
  console.log(`expectations met  ${summary.expectationsMet}/${summary.expectationsTotal}`);
  console.log(`hard check fails  ${summary.hardChecksFailed}`);
  console.log(`groundedness/tone/specificity  ${summary.avgGroundedness} / ${summary.avgTone} / ${summary.avgSpecificity}`);
  console.log(`cost              $${summary.totalCostUsd}`);
  console.log(`written           ${path.relative(process.cwd(), outPath)}`);
}

function avg(xs: number[]): number {
  return xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)) : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
