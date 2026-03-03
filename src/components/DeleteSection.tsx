"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";

interface DeleteSectionProps {
  label: string;
  onConfirm: () => void;
}

export default function DeleteSection({ label, onConfirm }: DeleteSectionProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
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
