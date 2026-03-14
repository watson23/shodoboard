"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Question,
  X,
  CaretDown,
  CaretUp,
  Notebook,
  Kanban,
  TreeStructure,
  Brain,
  CursorClick,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { guideSections } from "@/lib/guide-content";
import type { GuideSection } from "@/lib/guide-content";

interface HelpPanelProps {
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; weight?: "duotone"; className?: string }>> = {
  Notebook,
  Kanban,
  TreeStructure,
  Brain,
  CursorClick,
};

function SectionAccordion({
  section,
  isExpanded,
  onToggle,
}: {
  section: GuideSection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[section.iconName];

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2.5 w-full px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {Icon && (
          <Icon
            size={16}
            weight="duotone"
            className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"
          />
        )}
        <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {section.title}
        </span>
        {isExpanded ? (
          <CaretUp size={14} weight="bold" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        ) : (
          <CaretDown size={14} weight="bold" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-5 pb-3 space-y-2">
          {section.content.map((paragraph, i) => (
            <p
              key={i}
              className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpPanel({ onClose }: HelpPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(guideSections.map((s) => s.id))
  );

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[380px] max-w-full bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-right flex flex-col border-l border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <Question
              size={18}
              weight="duotone"
              className="text-indigo-500 dark:text-indigo-400"
            />
          </div>
          <h3 className="flex-1 text-sm font-bold text-gray-900 dark:text-gray-100">
            Guide
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {guideSections.map((section) => (
            <SectionAccordion
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}

          {/* Footer link */}
          <div className="px-5 py-4">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Open full guide
              <ArrowSquareOut size={14} weight="duotone" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
