"use client";

import { Brain } from "@phosphor-icons/react";

interface ChatMessageProps {
  role: "ai" | "user";
  text: string;
}

export default function ChatMessage({ role, text }: ChatMessageProps) {
  if (role === "ai") {
    return (
      <div className="flex gap-3 animate-slide-in">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mt-1">
          <Brain
            size={18}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400"
          />
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end animate-slide-in">
      <div className="bg-indigo-500 dark:bg-indigo-600 rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]">
        <p className="text-sm text-white whitespace-pre-line leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
