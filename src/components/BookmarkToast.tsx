"use client";

import { useState, useEffect } from "react";
import { X, BookmarkSimple } from "@phosphor-icons/react";

interface BookmarkToastProps {
  boardId: string;
}

export default function BookmarkToast({ boardId }: BookmarkToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `bookmark-toast-${boardId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "shown");

    // Delay appearance slightly so it doesn't feel jarring
    const showTimer = setTimeout(() => setVisible(true), 2000);
    const hideTimer = setTimeout(() => setVisible(false), 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [boardId]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
      <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl px-5 py-3 shadow-2xl text-sm">
        <BookmarkSimple size={18} weight="duotone" className="text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
        <span>Bookmark this page to return to your board later</span>
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
