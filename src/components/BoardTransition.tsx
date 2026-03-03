"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BoardTransitionProps {
  redirectTo?: string;
}

export default function BoardTransition({ redirectTo = "/board" }: BoardTransitionProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"building" | "ready">("building");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("ready"), 1200);
    const timer2 = setTimeout(() => router.push(redirectTo), 1800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [router, redirectTo]);

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center z-50">
      <div
        className={`flex flex-col items-center transition-all duration-500 ${
          phase === "building"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 -translate-y-4"
        }`}
      >
        <svg
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-14 h-14 mb-4 animate-pulse"
        >
          <rect width="128" height="128" rx="28" fill="#4f46e5" />
          <rect x="16" y="16" width="96" height="96" rx="8" fill="white" opacity="0.95" />
          <rect x="22" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
          <rect x="22" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
          <rect x="22" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
          <rect x="50" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
          <rect x="50" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
          <rect x="50" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
          <rect x="78" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
          <rect x="78" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
          <rect x="78" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
          <circle cx="100" cy="100" r="18" fill="#4f46e5" />
          <polyline points="90,100 97,107 110,93" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-indigo-600 dark:text-indigo-400 text-base font-bold tracking-tight">
          Shodoboard
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Building your board...
        </p>
      </div>
    </div>
  );
}
