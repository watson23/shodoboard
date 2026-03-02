"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatMessage from "./ChatMessage";
import BoardTransition from "./BoardTransition";
import { createBoard } from "@/lib/firestore";
import type { BoardState, Column } from "@/types/board";
import type { ConversationMessage } from "@/types/intake";
import { PaperPlaneRight, Kanban } from "@phosphor-icons/react";

// --- Types ---

interface IntakeConversationProps {
  backlog: string;
  goals: string;
}

interface ChatMsg {
  role: "ai" | "user";
  text: string;
}

interface BoardReadyData {
  type: "board_ready";
  goals: Array<{ statement: string; timeframe?: string; metrics?: string[] }>;
  outcomes: Array<{
    goalIndex: number;
    statement: string;
    behaviorChange?: string;
    measureOfSuccess?: string;
  }>;
  items: Array<{
    outcomeIndex: number | null;
    title: string;
    description?: string;
    type: string;
    column?: string;
  }>;
}

// --- Helpers ---

function transformBoardData(data: BoardReadyData): BoardState {
  const goals = data.goals.map((g, i) => ({
    id: `goal-${i + 1}`,
    statement: g.statement,
    timeframe: g.timeframe || "",
    metrics: g.metrics || [],
    order: i,
    collapsed: false,
  }));

  const outcomes = data.outcomes.map((o, i) => ({
    id: `outcome-${i + 1}`,
    goalId: o.goalIndex != null ? `goal-${o.goalIndex + 1}` : null,
    statement: o.statement,
    behaviorChange: o.behaviorChange || "",
    measureOfSuccess: o.measureOfSuccess || "",
    order: i,
    collapsed: false,
  }));

  const items = data.items.map((item, i) => ({
    id: `item-${i + 1}`,
    outcomeId:
      item.outcomeIndex != null ? `outcome-${item.outcomeIndex + 1}` : null,
    title: item.title,
    description: item.description || "",
    type: (item.type === "discovery" ? "discovery" : "delivery") as
      | "discovery"
      | "delivery",
    column: (item.column || "opportunities") as Column,
    order: i,
  }));

  return {
    goals,
    outcomes,
    items,
    nudges: [],
    discoveryPrompts: [],
  };
}

function toConversationMessages(msgs: ChatMsg[]): ConversationMessage[] {
  return msgs.map((m, i) => ({
    id: `msg-${i + 1}`,
    role: m.role,
    text: m.text,
  }));
}

// --- Sub-components ---

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-slide-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center" />
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function IntakeConversation({
  backlog,
  goals,
}: IntakeConversationProps) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [boardData, setBoardData] = useState<BoardReadyData | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMounted = useRef(false);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input after AI responds
  useEffect(() => {
    if (!isLoading && !boardData && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, boardData]);

  // Call the intake API
  const callIntakeApi = useCallback(
    async (conversationMessages: ChatMsg[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationMessages,
            backlog,
            goals,
          }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        // Add AI response to messages
        const aiMessage: ChatMsg = { role: "ai", text: data.text };
        setMessages((prev) => [...prev, aiMessage]);

        // Check if board data was returned
        if (data.boardData) {
          setBoardData(data.boardData);
        }
      } catch (err) {
        console.error("Intake API call failed:", err);
        setError(
          "Something went wrong talking to the AI. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [backlog, goals]
  );

  // On mount: send initial request with empty messages
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    callIntakeApi([]);
  }, [callIntakeApi]);

  // Handle user message submission
  const handleSend = () => {
    const text = userInput.trim();
    if (!text || isLoading || boardData) return;

    const userMessage: ChatMsg = { role: "user", text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setUserInput("");
    callIntakeApi(updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle board creation
  const handleCreateBoard = async () => {
    if (!boardData || isCreatingBoard) return;
    setIsCreatingBoard(true);

    try {
      const boardState = transformBoardData(boardData);
      const conversationHistory = toConversationMessages(messages);
      const boardId = await createBoard(boardState, conversationHistory);

      setShowTransition(true);

      // Brief delay for transition animation, then redirect
      setTimeout(() => {
        router.push(`/board/${boardId}`);
      }, 2000);
    } catch (err) {
      console.error("Failed to create board:", err);
      setError("Failed to create the board. Please try again.");
      setIsCreatingBoard(false);
    }
  };

  // Show transition animation
  if (showTransition) {
    return <BoardTransition />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-2xl mx-auto">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 px-4 py-6"
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} text={msg.text} />
        ))}

        {/* Typing indicator while waiting for AI */}
        {isLoading && <TypingIndicator />}

        {/* Error message */}
        {error && (
          <div className="flex gap-3 animate-slide-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center" />
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  callIntakeApi(messages);
                }}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 underline mt-1"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Create board button - shown when boardData is received */}
        {boardData && !isCreatingBoard && (
          <div className="flex justify-center pt-4 pb-2 animate-slide-in">
            <button
              onClick={handleCreateBoard}
              className="flex items-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-2xl px-8 py-4 transition-colors shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <Kanban size={22} weight="duotone" />
              Create your board
            </button>
          </div>
        )}

        {/* Creating board spinner */}
        {isCreatingBoard && !showTransition && (
          <div className="flex justify-center pt-4 pb-2 animate-slide-in">
            <div className="flex items-center gap-3 text-indigo-500 dark:text-indigo-400">
              <Kanban size={22} weight="duotone" className="animate-pulse" />
              <span className="text-sm font-medium">
                Creating your board...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !!boardData}
            placeholder={
              boardData
                ? "Conversation complete"
                : isLoading
                  ? "Waiting for AI..."
                  : "Type your response..."
            }
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !!boardData || !userInput.trim()}
            className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
            aria-label="Send message"
          >
            <PaperPlaneRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
