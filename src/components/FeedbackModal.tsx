"use client";

import { useState, useRef, useEffect } from "react";
import { X, PaperPlaneTilt, Check } from "@phosphor-icons/react";

type Category = "idea" | "bug" | "question";

interface FeedbackModalProps {
  boardId?: string;
  productName?: string;
  onClose: () => void;
}

export default function FeedbackModal({ boardId, productName, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-close after success
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [submitted, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: boardId || "demo",
          productName: productName || "Demo",
          category,
          message: message.trim(),
        }),
      });
      setSubmitted(true);
    } catch {
      // Silently fail — don't interrupt the user's flow
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const categories: { key: Category; label: string }[] = [
    { key: "idea", label: "Idea" },
    { key: "bug", label: "Bug" },
    { key: "question", label: "Question" },
  ];

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center animate-[slide-in_0.15s_ease-out]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
            <Check size={24} weight="bold" className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Thanks for the feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 animate-[slide-in_0.15s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat.key
                  ? cat.key === "idea"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : cat.key === "bug"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />

        {/* Submit */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to send
          </span>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
