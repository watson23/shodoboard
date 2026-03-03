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
      // End point: top-center of outcome card
      const endX = outcomeRect.left + outcomeRect.width / 2 - containerRect.left;
      const endY = outcomeRect.top - containerRect.top;

      // Horizontal rail sits halfway between goal bottom and outcome top
      const midY = startY + (endY - startY) / 2;

      const r = 8; // corner radius

      // Path: down from goal → corner → horizontal to outcome center → corner → down into card
      const dirX = endX > startX ? 1 : endX < startX ? -1 : 0;

      let d: string;
      if (dirX === 0) {
        // Outcome directly below goal — straight vertical line
        d = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        // Org-chart style: vertical → corner → horizontal → corner → vertical
        d = [
          `M ${startX} ${startY}`,
          `L ${startX} ${midY - r}`,
          `Q ${startX} ${midY} ${startX + dirX * r} ${midY}`,
          `L ${endX - dirX * r} ${midY}`,
          `Q ${endX} ${midY} ${endX} ${midY + r}`,
          `L ${endX} ${endY}`,
        ].join(" ");
      }

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
