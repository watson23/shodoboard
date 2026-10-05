"use client";

import { useEffect, useRef, useState } from "react";
import { updateBoardState } from "@/lib/firestore";
import type { BoardState } from "@/types/board";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(boardId: string | null, state: BoardState) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);
  const latestState = useRef(state);

  // Always keep ref in sync with latest state (effects run in declaration order,
  // so this is updated before the save effect below reads it)
  useEffect(() => {
    latestState.current = state;
  }, [state]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!boardId) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- status mirrors a pending external save
    setSaveStatus("saving");
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateBoardState(boardId, latestState.current);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("error");
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [boardId, state]);

  return saveStatus;
}
