"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Kanban } from "@phosphor-icons/react";

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
        className={`transition-all duration-500 ${
          phase === "building"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 -translate-y-4"
        }`}
      >
        <Kanban
          size={48}
          weight="duotone"
          className="text-indigo-500 dark:text-indigo-400 mx-auto mb-4 animate-pulse"
        />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          Building your board...
        </p>
      </div>
    </div>
  );
}
