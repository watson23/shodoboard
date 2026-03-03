"use client";

import { useState } from "react";
import { getAllBoardsActivity } from "@/lib/firestore";
import { DownloadSimple, Spinner } from "@phosphor-icons/react";

export default function AdminActivityPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const boards = await getAllBoardsActivity();
      const totalEvents = boards.reduce((sum, b) => sum + b.events.length, 0);
      const totalSessions = boards.reduce(
        (sum, b) => sum + b.sessions.length,
        0
      );

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalBoards: boards.length,
        totalSessions,
        totalEvents,
        boards,
      };

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shodoboard-activity-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(
        `Exported ${totalEvents} events across ${boards.length} boards (${totalSessions} sessions)`
      );
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("Export failed — check console for details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Shodoboard Activity Export
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download all activity logs across all boards as a single JSON file for
          analysis.
        </p>

        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? (
            <Spinner size={20} className="animate-spin" />
          ) : (
            <DownloadSimple size={20} weight="bold" />
          )}
          {loading ? "Exporting..." : "Download All Activity"}
        </button>

        {status && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        )}
      </div>
    </div>
  );
}
