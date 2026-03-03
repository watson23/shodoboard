"use client";

import { useState } from "react";
import { Sun, Moon, Monitor, Check, Lightning, Export, ListChecks, TreeStructure, Kanban, Link, ChatCircleDots } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import { useBoard } from "@/hooks/useBoard";
import { openPrintableExport } from "@/lib/export";
import type { SaveStatus } from "@/hooks/useAutoSave";

function ShodoLogoSmall() {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7 flex-shrink-0"
    >
      <rect width="128" height="128" rx="28" fill="#4f46e5" />
      <rect x="16" y="16" width="96" height="96" rx="8" fill="white" opacity="0.95" />
      <rect x="22" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="22" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="22" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <rect x="50" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="50" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="50" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <rect x="78" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="78" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="78" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <circle cx="100" cy="100" r="18" fill="#4f46e5" />
      <polyline points="90,100 97,107 110,93" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BoardHeaderProps {
  saveStatus?: SaveStatus;
  boardId?: string;
  productName?: string;
  onRefreshNudges?: () => void;
  nudgesLoading?: boolean;
  onToggleAgenda?: () => void;
  agendaOpen?: boolean;
  viewMode?: "hierarchy" | "kanban";
  onViewModeChange?: (mode: "hierarchy" | "kanban") => void;
  onBoardSpar?: () => void;
}

export default function BoardHeader({ saveStatus, boardId, productName, onRefreshNudges, nudgesLoading, onToggleAgenda, agendaOpen, viewMode, onViewModeChange, onBoardSpar }: BoardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { state, dispatch } = useBoard();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select+copy
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    openPrintableExport(state);
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-30 bg-indigo-600 dark:bg-indigo-700 px-4 h-14 flex items-center gap-3">
      <ShodoLogoSmall />
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="font-bold text-white text-sm whitespace-nowrap">
          Shodoboard
        </h1>
        {productName && (
          <span className="text-sm text-indigo-200 whitespace-nowrap">
            {productName}
          </span>
        )}
      </div>

      {onViewModeChange && (
        <div className="flex items-center bg-indigo-500/30 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("hierarchy")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "hierarchy"
                ? "bg-white/20 text-white font-semibold"
                : "text-indigo-200 hover:text-white"
            }`}
          >
            <TreeStructure size={14} weight="duotone" />
            Tree View
          </button>
          <button
            onClick={() => onViewModeChange("kanban")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "kanban"
                ? "bg-white/20 text-white font-semibold"
                : "text-indigo-200 hover:text-white"
            }`}
          >
            <Kanban size={14} weight="duotone" />
            Board
          </button>
        </div>
      )}

      {/* Save status / demo label */}
      <div className="ml-auto flex items-center gap-3">
        {!boardId && (
          <span className="text-xs text-indigo-200/70 bg-indigo-500/30 px-2 py-0.5 rounded">
            Demo
          </span>
        )}
        {boardId && saveStatus === "saving" && (
          <span className="text-xs text-indigo-200">Saving...</span>
        )}
        {boardId && saveStatus === "saved" && (
          <span className="text-xs text-indigo-200 flex items-center gap-1">
            <Check size={12} weight="bold" />
            Saved
          </span>
        )}
        {boardId && saveStatus === "error" && (
          <span className="text-xs text-red-300">Save error</span>
        )}
      </div>

      {boardId && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500"
          title="Copy board link"
        >
          <Link size={14} weight="bold" />
          {copied ? "Copied!" : "Copy link"}
        </button>
      )}

      <div className="flex items-center gap-2">
        {onToggleAgenda && (
          <button
            onClick={onToggleAgenda}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              agendaOpen
                ? "bg-indigo-600 text-white"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
            title="Valmennusagenda"
          >
            <ListChecks size={16} weight="duotone" />
            <span className="hidden sm:inline">Agenda</span>
          </button>
        )}
        {onBoardSpar && (
          <button
            onClick={onBoardSpar}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
            title="Spar with AI coach about your board"
          >
            <ChatCircleDots size={16} weight="duotone" />
            <span className="hidden sm:inline">Spar</span>
          </button>
        )}
        {boardId && onRefreshNudges && (
          <button
            onClick={onRefreshNudges}
            disabled={nudgesLoading}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh AI nudges"
          >
            <Lightning
              size={14}
              weight="duotone"
              className={nudgesLoading ? "animate-pulse" : ""}
            />
            {nudgesLoading ? "Thinking..." : "Refresh nudges"}
          </button>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500"
          title="Export board as PDF"
        >
          <Export size={14} weight="bold" />
          Export
        </button>
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={18} weight="duotone" />
        </button>
      </div>
    </header>
  );
}
