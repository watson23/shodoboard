"use client";

import { useDraggable } from "@dnd-kit/core";
import { DotsSixVertical } from "@phosphor-icons/react";

interface DraggableCardProps {
  id: string;
  children: React.ReactNode;
}

export default function DraggableCard({ id, children }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(2deg)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/drag ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-20 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <DotsSixVertical
          size={14}
          weight="bold"
          className="text-gray-400 dark:text-gray-500"
        />
      </div>
      {children}
    </div>
  );
}
