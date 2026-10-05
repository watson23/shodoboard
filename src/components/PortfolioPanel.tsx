"use client";

import { useState } from "react";
import Link from "next/link";
import { Binoculars, ArrowsClockwise, X, SpinnerGap } from "@phosphor-icons/react";
import { getBoard } from "@/lib/firestore";
import type { UserBoardEntry } from "@/lib/firestore";
import type { PortfolioOutput } from "@/app/api/portfolio/route";

const KIND_LABEL: Record<PortfolioOutput["themes"][number]["kind"], string> = {
  "duplicated-intent": "Duplicated intent",
  "orphan-goal": "Orphan goal",
  "vocabulary-mismatch": "Same words, different meanings",
  "conflicting-bets": "Conflicting bets",
  "shared-dependency": "Shared dependency",
  "portfolio-balance": "Portfolio balance",
  other: "Observation",
};

/**
 * Cross-board coaching for everything on the dashboard. Loads every board
 * the viewer can already read, sends them together, and shows what a single
 * board's coach cannot see.
 */
export default function PortfolioPanel({ boards }: { boards: UserBoardEntry[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortfolioOutput | null>(null);

  const nameOf = (boardId: string) =>
    boards.find((b) => b.boardId === boardId)?.productName || boardId;

  const run = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const loaded = await Promise.all(
        boards.map(async (b) => {
          const doc = await getBoard(b.boardId);
          return doc ? { boardId: b.boardId, boardState: doc.boardState } : null;
        })
      );
      const payload = loaded.filter((b): b is NonNullable<typeof b> => b !== null);
      if (payload.length < 2) {
        setError("Portfolio coaching needs at least two boards.");
        return;
      }
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boards: payload }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setResult((await res.json()) as PortfolioOutput);
    } catch (err) {
      console.error("Portfolio coaching failed:", err);
      setError("The coach could not review your portfolio. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (boards.length < 2) return null;

  return (
    <>
      <button
        onClick={result ? () => setOpen(true) : run}
        className="inline-flex items-center gap-2 border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold rounded-xl px-6 py-2 text-sm transition-colors"
      >
        <Binoculars size={16} weight="duotone" />
        Coach my portfolio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-right flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <Binoculars size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Portfolio coaching</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Across {boards.length} boards
                </p>
              </div>
              <button
                onClick={run}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors disabled:opacity-40"
                title="Run again"
              >
                <ArrowsClockwise size={18} weight="bold" className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-6">
                  <SpinnerGap size={16} className="animate-spin" />
                  Reading all your boards together. This takes a little longer than one board.
                </div>
              )}

              {error && !loading && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}

              {result && !loading && (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>

                  <div className="space-y-4">
                    {result.themes.map((t, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-4 py-3"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
                          {KIND_LABEL[t.kind]}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{t.whyItMatters}</p>
                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
                          <span className="text-indigo-500 dark:text-indigo-400">→ </span>
                          {t.suggestedAction}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.boardIds.map((id) => (
                            <Link
                              key={id}
                              href={`/board/${id}`}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {nameOf(id)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.vocabulary.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Same words, different meanings
                      </h4>
                      <div className="space-y-3">
                        {result.vocabulary.map((v, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">“{v.term}”</span>
                            <ul className="mt-1 space-y-0.5 pl-3 border-l border-gray-200 dark:border-gray-700">
                              {v.usages.map((u, j) => (
                                <li key={j} className="text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-800 dark:text-gray-200">{nameOf(u.boardId)}:</span> {u.meaning}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
