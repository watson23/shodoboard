"use client";

import { useState, useEffect, useCallback } from "react";
import { X, SignIn, Crown } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { useBoard } from "@/hooks/useBoard";
import { claimBoard, upsertUserBoardEntry } from "@/lib/firestore";
import type { BoardMember } from "@/lib/firestore";

interface BoardToastProps {
  boardId: string;
  ownerId?: string;
  members?: BoardMember[];
  onOwnershipChange?: (ownerId: string | undefined, ownerEmail: string | undefined) => void;
}

export default function BookmarkToast({
  boardId,
  ownerId,
  members,
  onOwnershipChange,
}: BoardToastProps) {
  const { user, signIn } = useAuth();
  const { state } = useBoard();
  const [visible, setVisible] = useState(false);
  const [acting, setActing] = useState(false);

  // Determine if user is owner or member
  const isOwner = !!(user && ownerId && user.uid === ownerId);
  const isMember = !!(
    user &&
    members?.some(
      (m) => m.email === (user.email ?? "").toLowerCase()
    )
  );
  const shouldSuppress = isOwner || isMember || !!(user && ownerId);

  useEffect(() => {
    if (shouldSuppress) return;

    const key = `board-toast-${boardId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "shown");

    const showTimer = setTimeout(() => setVisible(true), 5000);
    const hideTimer = setTimeout(() => setVisible(false), 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [boardId, shouldSuppress]);

  const handleClaimBoard = useCallback(
    async (claimUser: { uid: string; email: string | null; displayName: string | null }) => {
      setActing(true);
      try {
        await claimBoard(boardId, claimUser.uid, claimUser.email ?? "");
        await upsertUserBoardEntry(
          claimUser.uid,
          claimUser.email ?? "",
          claimUser.displayName ?? undefined,
          {
            boardId,
            productName: state.productName || "Untitled",
            role: "owner",
            lastVisitedAt: new Date().toISOString(),
            addedAt: new Date().toISOString(),
          }
        );
        onOwnershipChange?.(claimUser.uid, claimUser.email ?? undefined);
        setVisible(false);
      } catch (err) {
        console.error("Failed to claim board:", err);
      } finally {
        setActing(false);
      }
    },
    [boardId, state.productName, onOwnershipChange]
  );

  const handleSignIn = useCallback(async () => {
    setActing(true);
    try {
      const signedInUser = await signIn();
      if (signedInUser) {
        await handleClaimBoard(signedInUser);
      }
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      setActing(false);
    }
  }, [signIn, handleClaimBoard]);

  const handleClaim = useCallback(async () => {
    if (!user) return;
    await handleClaimBoard(user);
  }, [user, handleClaimBoard]);

  if (!visible || shouldSuppress) return null;

  // Anonymous user: show sign-in prompt
  if (!user) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
        <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl px-5 py-3 shadow-2xl text-sm">
          <SignIn size={18} weight="duotone" className="text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
          <span>Sign in to save this board to your account</span>
          <button
            onClick={handleSignIn}
            disabled={acting}
            className="ml-1 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {acting ? "Signing in..." : "Sign in"}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  // Signed-in user, board not claimed: show claim prompt
  if (!ownerId) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
        <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl px-5 py-3 shadow-2xl text-sm">
          <Crown size={18} weight="duotone" className="text-amber-300 dark:text-amber-600 flex-shrink-0" />
          <span>Claim this board to add it to your dashboard</span>
          <button
            onClick={handleClaim}
            disabled={acting}
            className="ml-1 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {acting ? "Claiming..." : "Claim"}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
