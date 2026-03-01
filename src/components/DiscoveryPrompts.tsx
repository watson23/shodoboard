"use client";

import { useBoard } from "@/hooks/useBoard";
import type { DiscoveryPrompt } from "@/types/board";
import { Lightbulb } from "@phosphor-icons/react";

interface DiscoveryPromptsProps {
  prompts: DiscoveryPrompt[];
}

export default function DiscoveryPrompts({ prompts }: DiscoveryPromptsProps) {
  const { dispatch } = useBoard();

  if (prompts.length === 0) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 bg-purple-50 dark:bg-purple-950/20 rounded-md p-2 space-y-1.5"
    >
      <div className="flex items-center gap-1 mb-1">
        <Lightbulb
          size={12}
          weight="duotone"
          className="text-purple-500 dark:text-purple-400"
        />
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
          Discovery
        </span>
      </div>
      {prompts.map((prompt) => (
        <label
          key={prompt.id}
          className="flex items-start gap-1.5 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={prompt.checked}
            onChange={() =>
              dispatch({
                type: "TOGGLE_DISCOVERY_PROMPT",
                promptId: prompt.id,
              })
            }
            className="mt-0.5 w-3 h-3 rounded accent-purple-500 flex-shrink-0"
          />
          <span
            className={`text-[11px] leading-snug transition-colors ${
              prompt.checked
                ? "text-purple-400 dark:text-purple-600 line-through"
                : "text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200"
            }`}
          >
            {prompt.text}
          </span>
        </label>
      ))}
    </div>
  );
}
