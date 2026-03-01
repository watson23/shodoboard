"use client";

import Link from "next/link";
import { Kanban, Sun, Moon, Monitor, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import { useBoard } from "@/hooks/useBoard";

export default function BoardHeader() {
  const { theme, setTheme } = useTheme();
  const { dispatch } = useBoard();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
      <Kanban
        size={24}
        weight="duotone"
        className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"
      />
      <h1 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
        Food Delivery App
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={18} weight="duotone" />
        </button>
        <Link
          href="/intake"
          onClick={() => dispatch({ type: "RESET_BOARD" })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          Start over
        </Link>
      </div>
    </header>
  );
}
