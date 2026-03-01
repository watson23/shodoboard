"use client";

import { useState } from "react";
import { X, Brain, ArrowRight, Lightbulb } from "@phosphor-icons/react";
import { MOCK_CONVERSATIONS, type MockMessage } from "@/data/mock-conversations";

interface SparringPanelProps {
  nudgeId: string;
  onClose: () => void;
}

export default function SparringPanel({ nudgeId, onClose }: SparringPanelProps) {
  const conversation = MOCK_CONVERSATIONS.find((c) => c.nudgeId === nudgeId);
  const [visibleCount, setVisibleCount] = useState(1);

  if (!conversation) return null;

  const allMessages = conversation.messages;
  const visibleMessages = allMessages.slice(0, visibleCount);
  const hasMore = visibleCount < allMessages.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <Lightbulb size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Sparring
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {conversation.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {visibleMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Advance button */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((c) => c + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
              >
                Continue conversation
                <ArrowRight size={12} weight="bold" />
              </button>
            </div>
          )}

          {!hasMore && (
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
              End of demo conversation
            </div>
          )}
        </div>

        {/* Disabled input */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
            <input
              type="text"
              disabled
              placeholder="Available in full version"
              className="flex-1 bg-transparent text-xs text-gray-400 dark:text-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MockMessage }) {
  if (message.role === "ai") {
    return (
      <div className="flex gap-2.5 animate-slide-in">
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain size={14} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end animate-slide-in">
      <div className="bg-indigo-500 dark:bg-indigo-600 rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%]">
        <p className="text-sm text-white leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}
