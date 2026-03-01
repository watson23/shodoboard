"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { INTAKE_SCRIPT } from "@/data/intake-script";
import ChatMessage from "./ChatMessage";

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

export default function IntakeConversation() {
  const router = useRouter();
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [nextStepIndex, setNextStepIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdvancing = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [visibleSteps, isTyping, scrollToBottom]);

  // Advance to the next AI message(s) automatically
  const advanceToNextAI = useCallback(() => {
    if (isAdvancing.current) return;
    if (nextStepIndex >= INTAKE_SCRIPT.length) return;

    const step = INTAKE_SCRIPT[nextStepIndex];
    if (step.role !== "ai") return;

    isAdvancing.current = true;
    setIsTyping(true);

    const showMessage = () => {
      setIsTyping(false);
      setVisibleSteps((prev) => [...prev, nextStepIndex]);

      const nextIdx = nextStepIndex + 1;
      setNextStepIndex(nextIdx);
      isAdvancing.current = false;

      // If the next step is also an AI message, chain it
      if (nextIdx < INTAKE_SCRIPT.length && INTAKE_SCRIPT[nextIdx].role === "ai") {
        setTimeout(() => {
          // We need to trigger this from the next render cycle
          setNextStepIndex((current) => {
            // Re-check: trigger advance for the chained AI message
            return current;
          });
        }, 300);
      }
    };

    setTimeout(showMessage, step.delay || 800);
  }, [nextStepIndex]);

  // Trigger AI advance when nextStepIndex changes and points to an AI message
  useEffect(() => {
    if (nextStepIndex < INTAKE_SCRIPT.length && INTAKE_SCRIPT[nextStepIndex].role === "ai" && !isAdvancing.current) {
      advanceToNextAI();
    }
  }, [nextStepIndex, advanceToNextAI]);

  // Start the conversation with the first AI message
  useEffect(() => {
    if (nextStepIndex === 0 && visibleSteps.length === 0) {
      advanceToNextAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserClick = () => {
    if (nextStepIndex >= INTAKE_SCRIPT.length) return;
    const step = INTAKE_SCRIPT[nextStepIndex];
    if (step.role !== "user") return;

    // Check if this is the final "Let's see it!" step
    const isFinal = nextStepIndex === INTAKE_SCRIPT.length - 1;

    // Show the user message
    setVisibleSteps((prev) => [...prev, nextStepIndex]);
    const nextIdx = nextStepIndex + 1;
    setNextStepIndex(nextIdx);

    if (isFinal) {
      // Navigate to board after a short pause
      setTimeout(() => {
        router.push("/board");
      }, 600);
    }
  };

  // Find the next user response to show as clickable
  const pendingUserStep =
    nextStepIndex < INTAKE_SCRIPT.length && INTAKE_SCRIPT[nextStepIndex].role === "user"
      ? INTAKE_SCRIPT[nextStepIndex]
      : null;

  const isFinalStep = nextStepIndex === INTAKE_SCRIPT.length - 1;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-2xl mx-auto">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 px-4 py-6"
      >
        {visibleSteps.map((stepIndex) => {
          const step = INTAKE_SCRIPT[stepIndex];
          return (
            <ChatMessage
              key={stepIndex}
              role={step.role}
              text={step.text}
            />
          );
        })}
        {isTyping && <TypingIndicator />}
      </div>

      {/* User response button */}
      {pendingUserStep && !isTyping && (
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={handleUserClick}
            className="w-full text-left bg-indigo-50 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl px-4 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group"
          >
            <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {pendingUserStep.text}
            </p>
            <p className="text-xs text-indigo-400 dark:text-indigo-500 mt-1.5 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
              {isFinalStep ? "Click to see your board" : "Click to respond"}
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
