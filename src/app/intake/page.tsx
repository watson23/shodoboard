"use client";

import { useState } from "react";
import { RAW_BACKLOG } from "@/data/seed";
import IntakeConversation from "@/components/IntakeConversation";
import { Notebook, ArrowRight } from "@phosphor-icons/react";

export default function IntakePage() {
  const [started, setStarted] = useState(false);
  const [backlog, setBacklog] = useState(RAW_BACKLOG);

  if (started) {
    return <IntakeConversation />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <Notebook
            size={40}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            What are you working on?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Paste your backlog, feature list, or current tasks — however messy.
          </p>
        </div>

        <textarea
          value={backlog}
          onChange={(e) => setBacklog(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
          placeholder="Paste your feature list, tasks, or ideas here..."
        />

        <button
          onClick={() => setStarted(true)}
          disabled={!backlog.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
        >
          Let&apos;s go
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
