"use client";

import { useState } from "react";
import { RAW_BACKLOG } from "@/data/seed";
import IntakeConversation from "@/components/IntakeConversation";
import {
  Notebook,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";

type ConsentState = null | boolean;

function ConsentScreen({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck
            size={40}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tietosuoja ja datan käsittely
          </h1>
        </div>

        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            Shodoboard käyttää Anthropicin Claude-tekoälyä backlogisi
            analysointiin.
          </p>

          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Tietojesi käsittely:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>
                Backlog-tekstisi lähetetään Anthropicin Claude API:lle
                analysoitavaksi
              </li>
              <li>
                Anthropic ei käytä dataasi malliensa kouluttamiseen
              </li>
              <li>Data poistetaan 30 päivän kuluessa</li>
              <li>
                Taulusi data tallennetaan Firebase-tietokantaan
                (EU-palvelin)
              </li>
            </ul>
          </div>

          <p className="text-amber-600 dark:text-amber-400 font-medium">
            Suositus: Älä liitä henkilötietoja, asiakkaiden nimiä tai
            liikesalaisuuksia.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Ymmärrän ja jatkan
            <ArrowRight size={18} weight="bold" />
          </button>
          <button
            onClick={onDecline}
            className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Jatka ilman tekoälyä
          </button>
        </div>
      </div>
    </div>
  );
}

function BacklogInput({
  backlog,
  setBacklog,
  goalsInput,
  setGoalsInput,
  onStart,
}: {
  backlog: string;
  setBacklog: (v: string) => void;
  goalsInput: string;
  setGoalsInput: (v: string) => void;
  onStart: () => void;
}) {
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
            Paste your backlog, feature list, or current tasks — however
            messy.
          </p>
        </div>

        <textarea
          value={backlog}
          onChange={(e) => setBacklog(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
          placeholder="Paste your feature list, tasks, or ideas here..."
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Business goals or OKRs{" "}
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={goalsInput}
            onChange={(e) => setGoalsInput(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm leading-relaxed px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
            placeholder="If you have existing business goals, OKRs, or outcomes, paste them here..."
          />
        </div>

        <button
          onClick={onStart}
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

export default function IntakePage() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [started, setStarted] = useState(false);
  const [backlog, setBacklog] = useState(RAW_BACKLOG);
  const [goalsInput, setGoalsInput] = useState("");

  // Show consent screen first
  if (consent === null) {
    return (
      <ConsentScreen
        onAccept={() => setConsent(true)}
        onDecline={() => setConsent(false)}
      />
    );
  }

  // After consent, show conversation or backlog input
  if (started) {
    return <IntakeConversation backlog={backlog} goals={goalsInput} />;
  }

  // Consent declined — show info and allow proceeding without AI
  if (consent === false) {
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
              Manual mode
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Shodoboard works best with AI analysis, but you can still
              paste your backlog. Items will be placed in the
              &ldquo;Opportunities&rdquo; column for manual sorting.
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
            Create board
            <ArrowRight size={18} weight="bold" />
          </button>

          <button
            onClick={() => setConsent(null)}
            className="w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            &larr; Go back to enable AI
          </button>
        </div>
      </div>
    );
  }

  // Consent accepted — show backlog input with goals
  return (
    <BacklogInput
      backlog={backlog}
      setBacklog={setBacklog}
      goalsInput={goalsInput}
      setGoalsInput={setGoalsInput}
      onStart={() => setStarted(true)}
    />
  );
}
