"use client";

import { useDroppable } from "@dnd-kit/core";

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export default function DroppableColumn({
  id,
  children,
  className = "",
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors ${
        isOver
          ? "bg-indigo-50/50 dark:bg-indigo-950/20"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
