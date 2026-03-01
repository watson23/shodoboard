"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { INTAKE_SCRIPT } from "@/data/intake-script";
import ChatMessage from "./ChatMessage";
import BoardTransition from "./BoardTransition";

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
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [nextStepIndex, setNextStepIndex] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [userTyping, setUserTyping] = useState<{
    stepIndex: number;
    charCount: number;
    fullText: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdvancing = useRef(false);
  const typingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizingTyping = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Auto-scroll when messages change or user is typing
  useEffect(() => {
    scrollToBottom();
  }, [visibleSteps, isTyping, userTyping?.charCount, scrollToBottom]);

  // Clean up typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingInterval.current) clearInterval(typingInterval.current);
    };
  }, []);

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
          setNextStepIndex((current) => current);
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

  // Detect when user typing animation completes
  useEffect(() => {
    if (!userTyping || userTyping.charCount < userTyping.fullText.length) return;
    if (finalizingTyping.current) return;
    finalizingTyping.current = true;

    if (typingInterval.current) {
      clearInterval(typingInterval.current);
      typingInterval.current = null;
    }

    const stepIdx = userTyping.stepIndex;
    const isFinal = stepIdx === INTAKE_SCRIPT.length - 1;

    setTimeout(() => {
      setUserTyping(null);
      setVisibleSteps((vs) => [...vs, stepIdx]);
      setNextStepIndex(stepIdx + 1);
      finalizingTyping.current = false;

      if (isFinal) {
        setTimeout(() => setShowTransition(true), 1000);
      }
    }, 200);
  }, [userTyping]);

  const handleUserClick = () => {
    if (nextStepIndex >= INTAKE_SCRIPT.length) return;
    if (userTyping) return;
    const step = INTAKE_SCRIPT[nextStepIndex];
    if (step.role !== "user") return;

    const stepIdx = nextStepIndex;
    const fullText = step.text;

    // Brief pause, then start typing animation
    setTimeout(() => {
      finalizingTyping.current = false;
      setUserTyping({ stepIndex: stepIdx, charCount: 0, fullText });

      typingInterval.current = setInterval(() => {
        setUserTyping((prev) => {
          if (!prev || prev.charCount >= prev.fullText.length) return prev;
          return { ...prev, charCount: prev.charCount + 1 };
        });
      }, 25);
    }, 500);
  };

  // Find the next user response to show as clickable
  const pendingUserStep =
    nextStepIndex < INTAKE_SCRIPT.length && INTAKE_SCRIPT[nextStepIndex].role === "user"
      ? INTAKE_SCRIPT[nextStepIndex]
      : null;

  const isFinalStep = nextStepIndex === INTAKE_SCRIPT.length - 1;

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

        {/* User message being typed */}
        {userTyping && (
          <div className="flex justify-end animate-slide-in">
            <div className="bg-indigo-500 dark:bg-indigo-600 rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%]">
              <p className="text-sm text-white leading-relaxed whitespace-pre-line">
                {userTyping.fullText.slice(0, userTyping.charCount)}
                <span className="inline-block w-0.5 h-4 bg-white/70 ml-0.5 align-middle animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {isTyping && <TypingIndicator />}
      </div>

      {/* User response button */}
      {pendingUserStep && !isTyping && !userTyping && (
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
