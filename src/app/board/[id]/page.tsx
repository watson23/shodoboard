"use client";

import { use, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getBoard, recordBoardVisitor } from "@/lib/firestore";
import type { BoardMember, BoardVisitor } from "@/lib/firestore";
import { BoardProvider } from "@/hooks/useBoard";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import AccessDenied from "@/components/AccessDenied";
import type { BoardState } from "@/types/board";

const Board = dynamic(() => import("@/components/Board"), { ssr: false });

export default function DynamicBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [ownerEmail, setOwnerEmail] = useState<string | undefined>();
  const [accessMode, setAccessMode] = useState<"link" | "invite_only">("link");
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<BoardVisitor[]>([]);

  useEffect(() => {
    getBoard(id)
      .then((doc) => {
        if (doc) {
          const boardState = doc.boardState;
          boardState.focusItems = boardState.focusItems ?? [];
          setBoardState(boardState);
          setOwnerId(doc.ownerId);
          setOwnerEmail(doc.ownerEmail);
          setAccessMode(doc.accessMode ?? "link");
          setMembers(doc.members ?? []);
          setRecentVisitors(doc.recentVisitors ?? []);
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

  // Record visitor (fire-and-forget)
  useEffect(() => {
    if (!loading && boardState && user?.email) {
      recordBoardVisitor(id, user.uid, user.email).catch(() => {});
    }
  }, [loading, boardState, user, id]);

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

  // Access enforcement for invite-only boards
  if (accessMode === "invite_only" && ownerId) {
    // Wait for auth to resolve before checking access
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500 dark:text-gray-400">Checking access...</p>
        </div>
      );
    }

    const isOwner = user?.uid === ownerId;
    const isMember = user?.email
      ? members.some((m) => m.email === user.email!.toLowerCase())
      : false;

    if (!isOwner && !isMember) {
      return <AccessDenied ownerEmail={ownerEmail} />;
    }
  }

  return (
    <BoardProvider initialState={boardState}>
      <ErrorBoundary>
        <Board
          boardId={id}
          ownerId={ownerId}
          ownerEmail={ownerEmail}
          accessMode={accessMode}
          members={members}
          recentVisitors={recentVisitors}
          onOwnershipChange={(newOwnerId, newOwnerEmail) => {
            setOwnerId(newOwnerId);
            setOwnerEmail(newOwnerEmail);
            if (!newOwnerId) {
              // Board unclaimed — reset access
              setAccessMode("link");
              setMembers([]);
              setRecentVisitors([]);
            }
          }}
          onAccessChange={(newAccessMode, newMembers) => {
            setAccessMode(newAccessMode);
            setMembers(newMembers);
          }}
        />
      </ErrorBoundary>
    </BoardProvider>
  );
}
