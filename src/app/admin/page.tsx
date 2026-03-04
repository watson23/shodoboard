"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  SignIn,
  SignOut,
  Spinner,
  ArrowSquareOut,
  DownloadSimple,
  ChartBar,
  Users,
  CalendarDots,
  Lightning,
  Megaphone,
} from "@phosphor-icons/react";

interface BoardStat {
  boardId: string;
  productName: string;
  cohort: string;
  createdAt: string | null;
  lastActive: string | null;
  lastHeartbeat: string | null;
  sessionCount: number;
  eventCount: number;
}

interface DashboardData {
  summary: {
    totalBoards: number;
    activeLastWeek: number;
    totalSessions: number;
    totalEvents: number;
  };
  boards: BoardStat[];
}

interface FeedbackItem {
  id: string;
  boardId: string;
  productName: string;
  category: string;
  message: string;
  createdAt: string | null;
}

interface FeedbackData {
  totalCount: number;
  items: FeedbackItem[];
}

export default function AdminPage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Not authorized. Your email may not be on the admin list.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);

      // Fetch feedback in parallel
      try {
        const fbRes = await fetch("/api/admin/feedback", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fbRes.ok) {
          const fbJson = await fbRes.json();
          setFeedbackData(fbJson);
        }
      } catch {
        // Feedback fetch is non-critical
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatCreatedDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Shodoboard Admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Google account to access the admin dashboard.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            <SignIn size={20} weight="bold" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Shodoboard Admin
            </h1>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <SignOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Spinner size={32} className="animate-spin text-indigo-500" />
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard
                icon={<ChartBar size={20} weight="fill" />}
                label="Total Boards"
                value={data.summary.totalBoards}
                color="indigo"
              />
              <SummaryCard
                icon={<Lightning size={20} weight="fill" />}
                label="Active (7d)"
                value={data.summary.activeLastWeek}
                color="green"
              />
              <SummaryCard
                icon={<Users size={20} weight="fill" />}
                label="Sessions"
                value={data.summary.totalSessions}
                color="blue"
              />
              <SummaryCard
                icon={<CalendarDots size={20} weight="fill" />}
                label="Events"
                value={data.summary.totalEvents}
                color="amber"
              />
              <SummaryCard
                icon={<Megaphone size={20} weight="fill" />}
                label="Feedback"
                value={feedbackData?.totalCount ?? 0}
                color="rose"
              />
            </div>

            {/* Board table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  All Boards ({data.boards.length})
                </h2>
                <a
                  href="/admin/activity"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <DownloadSimple size={14} />
                  Export JSON
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Cohort</th>
                      <th className="px-4 py-2 font-medium">Created</th>
                      <th className="px-4 py-2 font-medium">Last Active</th>
                      <th className="px-4 py-2 font-medium text-right">Sessions</th>
                      <th className="px-4 py-2 font-medium text-right">Events</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.boards.map((board) => (
                      <tr
                        key={board.boardId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {board.productName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {board.cohort}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {formatCreatedDate(board.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            {formatDate(board.lastActive)}
                            {board.lastHeartbeat && (Date.now() - new Date(board.lastHeartbeat).getTime()) < 3 * 60 * 1000 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Board open
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                          {board.sessionCount}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                          {board.eventCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/board/${board.boardId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                            title="Open board"
                          >
                            <ArrowSquareOut size={16} />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {data.boards.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          No boards found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Feedback section */}
            {feedbackData && feedbackData.items.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Recent Feedback ({feedbackData.totalCount})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {feedbackData.items.map((item) => (
                    <div key={item.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          item.category === "bug"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : item.category === "question"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        }`}>
                          {item.category}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {item.productName}
                        </span>
                        <span className="text-xs text-gray-300 dark:text-gray-600">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
    green: "text-green-500 bg-green-50 dark:bg-green-900/20",
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    rose: "text-rose-500 bg-rose-50 dark:bg-rose-900/20",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
