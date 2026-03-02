"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

interface SlidePanelProps {
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function SlidePanel({ onClose, title, icon, children }: SlidePanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animationName: "slide-in-right" }}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
