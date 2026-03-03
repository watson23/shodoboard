"use client";

import { use, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getBoard } from "@/lib/firestore";
import { BoardProvider } from "@/hooks/useBoard";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { BoardState } from "@/types/board";

const Board = dynamic(() => import("@/components/Board"), { ssr: false });

export default function DynamicBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getBoard(id)
      .then((doc) => {
        if (doc) {
          const boardState = doc.boardState;
          boardState.focusItems = boardState.focusItems ?? [];
          setBoardState(boardState);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load board:", err);
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Loading board...</p>
      </div>
    );
  }

  if (notFound || !boardState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Board not found</p>
      </div>
    );
  }

  return (
    <BoardProvider initialState={boardState}>
      <ErrorBoundary>
        <Board boardId={id} />
      </ErrorBoundary>
    </BoardProvider>
  );
}
