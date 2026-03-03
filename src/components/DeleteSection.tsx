"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";

interface DeleteSectionProps {
  label: string;
  onConfirm: () => void;
  /** Number of child entities that would be affected */
  childCount?: number;
  /** Label for children, e.g. "outcomes", "items" */
  childLabel?: string;
  /** Called when user chooses to delete children too */
  onConfirmWithChildren?: () => void;
}

export default function DeleteSection({ label, onConfirm, childCount, childLabel, onConfirmWithChildren }: DeleteSectionProps) {
  const [confirming, setConfirming] = useState(false);
  const hasChildren = childCount != null && childCount > 0 && onConfirmWithChildren;

  if (confirming) {
    return (
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        {hasChildren ? (
          <>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2">
              This has {childCount} {childLabel || "children"}. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirmWithChildren}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Trash size={12} weight="bold" />
                Delete everything
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Trash size={12} weight="bold" />
                Delete &amp; keep {childLabel || "children"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Trash size={12} weight="bold" />
                Yes, delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
      >
        <Trash size={12} weight="bold" />
        {label}
      </button>
    </div>
  );
}
