"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  Brain,
  Kanban,
  SignIn,
  type IconProps,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { createBoard, getUserDoc } from "@/lib/firestore";
import type { UserBoardEntry } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/components/Dashboard";

function ShodoLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Indigo rounded background — matches shodolist style */}
      <rect width="128" height="128" rx="28" fill="#4f46e5" />

      {/* White content area */}
      <rect x="16" y="16" width="96" height="96" rx="8" fill="white" opacity="0.95" />

      {/* Column 1 — cards */}
      <rect x="22" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="22" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="22" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />

      {/* Column 2 — cards */}
      <rect x="50" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="50" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="50" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />

      {/* Column 3 — cards */}
      <rect x="78" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="78" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="78" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />

      {/* Checkmark circle — bottom right, matching shodolist placement */}
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

function Feature({
  Icon,
  title,
  description,
}: {
  Icon: ComponentType<IconProps>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
        <Icon
          size={20}
          weight="duotone"
          className="text-indigo-500 dark:text-indigo-400"
        />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[220px]">
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [boards, setBoards] = useState<UserBoardEntry[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBoards([]);
      setLoadingBoards(false);
      return;
    }
    getUserDoc(user.uid)
      .then((doc) => {
        setBoards(doc?.boards || []);
      })
      .catch((err) => {
        console.error("Failed to load user boards:", err);
        setBoards([]);
      })
      .finally(() => {
        setLoadingBoards(false);
      });
  }, [user, authLoading]);

  const handleStartEmpty = async () => {
    setCreating(true);
    try {
      const boardId = await createBoard({
        goals: [],
        outcomes: [],
        items: [],
        nudges: [],
        focusItems: [],
        discoveryPrompts: [],
      });
      router.push(`/board/${boardId}`);
    } catch (err) {
      console.error("Failed to create empty board:", err);
      setCreating(false);
    }
  };

  // Loading state — prevent flash
  if (authLoading || loadingBoards) {
    return <div className="min-h-screen" />;
  }

  // Signed-in user with boards — show Dashboard
  if (user && boards.length > 0) {
    return (
      <Dashboard
        boards={boards}
        email={user.email || ""}
        onSignOut={signOut}
        onCreateEmpty={handleStartEmpty}
      />
    );
  }

  // Landing page — anonymous or signed-in-no-boards
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-12">
      {/* Sign in button — anonymous users */}
      {!user && (
        <button
          onClick={signIn}
          className="absolute top-4 right-4 flex items-center gap-1.5 text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          Sign in
          <SignIn size={16} />
        </button>
      )}

      {/* Signed in indicator — user with no boards */}
      {user && boards.length === 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{user.email}</span>
          <button
            onClick={signOut}
            className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <ShodoLogo className="w-16 h-16 text-indigo-500 dark:text-indigo-400 mb-5" />
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
          Shodoboard
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
          Know why you&apos;re building it
        </p>

        <Link
          href="/intake"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-8 py-3 transition-colors shadow-sm hover:shadow-md"
        >
          Start with your backlog
        </Link>

        <button
          onClick={handleStartEmpty}
          disabled={creating}
          className="mt-3 inline-flex items-center justify-center border-2 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold rounded-xl px-8 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating board..." : "Start with empty board"}
        </button>

        <Link
          href="/board"
          className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          Try the demo
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-6 max-w-2xl w-full">
        <Feature
          Icon={Upload}
          title="Bring your backlog"
          description="Paste your feature list, tasks, or ideas and turn them into a plan."
        />
        <Feature
          Icon={Brain}
          title="AI coaches you"
          description="Guided conversation transforms features into outcomes. Nudges keep you honest."
        />
        <Feature
          Icon={Kanban}
          title="A board that works"
          description="Familiar kanban columns with discovery and measurement built in."
        />
      </div>

      {/* Creator bio */}
      <footer className="text-center pt-6 border-t border-gray-200 dark:border-gray-800 w-full max-w-sm">
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Built by{" "}
          <span className="font-medium text-gray-600 dark:text-gray-300">
            Jarkko Kailanto
          </span>{" "}
          — exploring how AI can help product teams stay focused on outcomes.
        </p>
      </footer>
    </div>
  );
}
