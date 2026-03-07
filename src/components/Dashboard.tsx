"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignOut, Crown, Users } from "@phosphor-icons/react";
import { getBoard, cleanStaleUserBoardEntries } from "@/lib/firestore";
import type { UserBoardEntry } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ShodoLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
      <polyline
        points="90,100 97,107 110,93"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DashboardProps {
  boards: UserBoardEntry[];
  email: string;
  onSignOut: () => void;
  onCreateEmpty: () => void;
}

export default function Dashboard({
  boards,
  email,
  onSignOut,
  onCreateEmpty,
}: DashboardProps) {
  const { user } = useAuth();
  const [validBoards, setValidBoards] = useState<UserBoardEntry[] | null>(null);

  useEffect(() => {
    if (!user || boards.length === 0) return;

    let cancelled = false;

    async function validateBoards() {
      const results = await Promise.all(
        boards.map(async (b) => {
          try {
            const boardDoc = await getBoard(b.boardId);
            return boardDoc ? b : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const valid = results.filter((b): b is UserBoardEntry => b !== null);
      setValidBoards(valid);

      if (valid.length !== boards.length) {
        const validBoardIds = valid.map((b) => b.boardId);
        cleanStaleUserBoardEntries(user!.uid, validBoardIds);
      }
    }

    validateBoards();

    return () => {
      cancelled = true;
    };
  }, [user, boards]);

  const displayBoards = validBoards ?? boards;
  const sortedBoards = [...displayBoards].sort(
    (a, b) =>
      new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 h-14 flex items-center">
        <div className="flex items-center gap-2.5">
          <ShodoLogo className="w-8 h-8" />
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            Shodoboard
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {email}
          </span>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <SignOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
          Your boards
        </h2>

        {/* Board grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sortedBoards.map((b) => (
            <Link
              key={b.boardId}
              href={`/board/${b.boardId}`}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {b.productName || "Untitled"}
                </h3>
                {b.role === "owner" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    <Crown size={10} weight="fill" />
                    Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    <Users size={10} weight="fill" />
                    Member
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {timeAgo(b.lastVisitedAt)}
              </p>
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/intake"
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors shadow-sm hover:shadow-md text-center"
          >
            Start with your backlog
          </Link>
          <button
            onClick={onCreateEmpty}
            className="border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold rounded-xl px-6 py-2 text-sm transition-colors"
          >
            Start with empty board
          </button>
        </div>
      </main>
    </div>
  );
}
