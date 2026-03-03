"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Brain,
  PaperPlaneRight,
  ArrowsClockwise,
  SpinnerGap,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { BoardState } from "@/types/board";

interface BoardSparringModalProps {
  onClose: () => void;
}

interface Message {
  role: "ai" | "user";
  text: string;
}

export default function BoardSparringModal({ onClose }: BoardSparringModalProps) {
  const { state } = useBoard();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
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

  // Focus input when messages arrive
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const sendToApi = useCallback(
    async (conversationMessages: Message[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/board-spar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            boardState: buildBoardPayload(state),
          }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        const aiMessage: Message = { role: "ai", text: data.text };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        console.error("Board spar error:", err);
        setError("Yhteys epäonnistui. Yritä uudelleen.");
      } finally {
        setIsLoading(false);
      }
    },
    [state]
  );

  // Initial fetch on mount
  useEffect(() => {
    if (hasFetchedInitial.current) return;
    hasFetchedInitial.current = true;
    sendToApi([]);
  }, [sendToApi]);

  const handleSend = () => {
    const text = userInput.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput("");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <ChatCircleDots
              size={18}
              weight="duotone"
              className="text-indigo-500 dark:text-indigo-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Spar about your board
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Coaching conversation about your board as a whole
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
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
                Yritä uudelleen
              </button>
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
              disabled={isLoading}
              placeholder="Kysy tai kommentoi..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !userInput.trim()}
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

function MessageBubble({ message }: { message: Message }) {
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

/** Build a minimal board payload for the API (exclude nudges, prompts, focus items) */
function buildBoardPayload(state: BoardState) {
  return {
    productName: state.productName,
    goals: state.goals,
    outcomes: state.outcomes,
    items: state.items,
  };
}
