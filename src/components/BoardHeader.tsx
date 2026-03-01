"use client";

import Link from "next/link";
import { Sun, Moon, Monitor, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import { useBoard } from "@/hooks/useBoard";

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
    <header className="sticky top-0 z-30 bg-indigo-600 dark:bg-indigo-700 px-4 h-14 flex items-center gap-3">
      <ShodoLogoSmall />
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="font-bold text-white text-sm whitespace-nowrap">
          Shodoboard
        </h1>
        <span className="text-sm text-indigo-200 whitespace-nowrap">
          Food delivery app
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={18} weight="duotone" />
        </button>
        <Link
          href="/intake"
          onClick={() => dispatch({ type: "RESET_BOARD" })}
          className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          Start over
        </Link>
      </div>
    </header>
  );
}
