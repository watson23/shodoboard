"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ConnectorPath {
  id: string;
  d: string;
}

interface TreeConnectorsProps {
  goalId: string;
  outcomeIds: string[];
}

export default function TreeConnectors({ goalId, outcomeIds }: TreeConnectorsProps) {
  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const goalEl = document.getElementById(goalId);
    if (!goalEl) return;

    const containerRect = container.getBoundingClientRect();
    const goalRect = goalEl.getBoundingClientRect();

    // Start point: bottom-center of goal card
    const startX = goalRect.left + goalRect.width / 2 - containerRect.left;
    const startY = goalRect.bottom - containerRect.top;

    const newPaths: ConnectorPath[] = [];

    for (const outcomeId of outcomeIds) {
      const outcomeEl = document.getElementById(outcomeId);
      if (!outcomeEl) continue;

      const outcomeRect = outcomeEl.getBoundingClientRect();
      // End point: left-center of outcome card
      const endX = outcomeRect.left - containerRect.left;
      const endY = outcomeRect.top + 20 - containerRect.top; // ~center of header

      // Midpoint Y for the horizontal rail
      const midY = startY + 16;

      // Path: vertical down from goal, then horizontal, then vertical to outcome
      const d = `M ${startX} ${startY} L ${startX} ${midY} L ${endX - 8} ${midY} Q ${endX} ${midY} ${endX} ${midY + 8} L ${endX} ${endY}`;

      newPaths.push({ id: outcomeId, d });
    }

    setPaths(newPaths);
  }, [goalId, outcomeIds]);

  useEffect(() => {
    computePaths();

    // Recompute on resize
    const observer = new ResizeObserver(() => computePaths());
    const container = containerRef.current;
    if (container) observer.observe(container);

    return () => observer.disconnect();
  }, [computePaths]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0">
      <svg className="w-full h-full overflow-visible">
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            className="stroke-indigo-300 dark:stroke-indigo-500"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}
