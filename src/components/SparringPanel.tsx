"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Brain,
  PaperPlaneRight,
  Lightbulb,
  ArrowsClockwise,
  SpinnerGap,
} from "@phosphor-icons/react";
import type { Nudge, BusinessGoal, Outcome, WorkItem, BoardState } from "@/types/board";
import type { BoardChangeSuggestion, ChatTurn } from "@/lib/ai";
import { streamChat } from "@/lib/sse-client";
import SuggestionCard from "./SuggestionCard";

interface SparringPanelProps {
  nudge: Nudge;
  target: BusinessGoal | Outcome | WorkItem;
  boardState: BoardState;
  onClose: () => void;
  onApply?: (suggestion: BoardChangeSuggestion) => void;
}

interface Message extends ChatTurn {
  /** Indices of suggestions the PM applied from this message. */
  applied?: number[];
  /** True while the reply is still streaming in. */
  streaming?: boolean;
}

const MAX_TURNS = 4;

export default function SparringPanel({
  nudge,
  target,
  boardState,
  onClose,
  onApply,
}: SparringPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedInitial = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Send the conversation so far; the reply streams into a placeholder message
  const sendToApi = useCallback(
    async (conversation: Message[]) => {
      setIsLoading(true);
      setError(null);

      const history: ChatTurn[] = conversation.map((m) => ({
        role: m.role,
        text: m.text,
        suggestions: m.suggestions,
        appliedSuggestions: m.appliedSuggestions,
      }));

      let placeholderAdded = false;
      const updateLast = (patch: Partial<Message>) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], ...patch };
          return next;
        });

      try {
        const done = await streamChat<{ type: "done"; text: string; suggestions?: BoardChangeSuggestion[] }>(
          "/api/spar",
          {
            messages: history,
            nudgeContext: { nudge, target },
            boardState: {
              goals: boardState.goals,
              outcomes: boardState.outcomes,
              items: boardState.items,
            },
          },
          (accumulated) => {
            if (!placeholderAdded) {
              placeholderAdded = true;
              setMessages((prev) => [...prev, { role: "ai", text: accumulated, streaming: true }]);
            } else {
              updateLast({ text: accumulated });
            }
          }
        );

        const finalMessage: Message = {
          role: "ai",
          text: done.text,
          suggestions: done.suggestions && done.suggestions.length > 0 ? done.suggestions : undefined,
          applied: [],
        };
        if (placeholderAdded) {
          updateLast({ ...finalMessage, streaming: false });
        } else {
          setMessages((prev) => [...prev, finalMessage]);
        }
      } catch (err) {
        console.error("Spar error:", err);
        if (placeholderAdded) {
          setMessages((prev) => prev.slice(0, -1));
        }
        setError("Failed to get coaching response. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [nudge, target, boardState]
  );

  // Initial fetch on mount
  useEffect(() => {
    if (hasFetchedInitial.current) return;
    hasFetchedInitial.current = true;
    sendToApi([]);
  }, [sendToApi]);

  const handleSend = () => {
    const text = userInput.trim();
    if (!text || isLoading || turnCount >= MAX_TURNS) return;

    // Tell the coach whether its last proposal was applied
    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    const appliedSuggestions = lastAi?.suggestions
      ? (lastAi.applied?.length ?? 0) > 0
      : undefined;

    const userMessage: Message = { role: "user", text, appliedSuggestions };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setTurnCount((c) => c + 1);

    sendToApi(updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    setError(null);
    sendToApi(messages);
  };

  const handleApply = (messageIndex: number, suggestionIndex: number) => {
    const suggestion = messages[messageIndex]?.suggestions?.[suggestionIndex];
    if (!suggestion || !onApply) return;
    onApply(suggestion);
    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex ? { ...m, applied: [...(m.applied ?? []), suggestionIndex] } : m
      )
    );
  };

  const inputDisabled = isLoading || turnCount >= MAX_TURNS;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <Lightbulb
              size={18}
              weight="duotone"
              className="text-indigo-500 dark:text-indigo-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Sparring
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {nudge.message}
            </p>
          </div>
          {turnCount > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
              {turnCount}/{MAX_TURNS}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onApply={onApply ? (si) => handleApply(i, si) : undefined}
            />
          ))}

          {/* Thinking indicator (before the first streamed token) */}
          {isLoading && !messages[messages.length - 1]?.streaming && (
            <div className="flex gap-2.5 animate-slide-in">
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain
                  size={14}
                  weight="duotone"
                  className="text-indigo-500 dark:text-indigo-400"
                />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5">
                <SpinnerGap
                  size={16}
                  className="text-gray-400 dark:text-gray-500 animate-spin"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex flex-col items-center gap-2 py-3">
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
              >
                <ArrowsClockwise size={12} weight="bold" />
                Retry
              </button>
            </div>
          )}

          {/* Turn limit reached */}
          {turnCount >= MAX_TURNS && !isLoading && (
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
              Time to act -- update your board based on what you&apos;ve
              discussed.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={inputDisabled}
              placeholder={
                turnCount >= MAX_TURNS
                  ? "Conversation complete"
                  : "Type your response..."
              }
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={inputDisabled || !userInput.trim()}
              className="p-1.5 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onApply,
}: {
  message: Message;
  onApply?: (suggestionIndex: number) => void;
}) {
  if (message.role === "ai") {
    return (
      <div className="flex gap-2.5 animate-slide-in">
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain
            size={14}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400"
          />
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {message.text}
            {message.streaming && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-indigo-400 animate-pulse rounded-sm" />
            )}
          </p>
          {message.suggestions?.map((s, i) => (
            <SuggestionCard
              key={i}
              suggestion={s}
              applied={message.applied?.includes(i) ?? false}
              onApply={onApply ? () => onApply(i) : undefined}
            />
          ))}
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
