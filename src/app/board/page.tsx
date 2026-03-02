"use client";

import dynamic from "next/dynamic";
import { BoardProvider } from "@/hooks/useBoard";

const Board = dynamic(() => import("@/components/Board"), { ssr: false });

export default function DemoBoardPage() {
  return (
    <BoardProvider>
      <Board />
    </BoardProvider>
  );
}
