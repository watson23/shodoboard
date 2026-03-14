"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  Notebook,
  Kanban,
  TreeStructure,
  Brain,
  CursorClick,
  ArrowLeft,
  type IconProps,
} from "@phosphor-icons/react";
import { guideSections } from "@/lib/guide-content";

const ICONS: Record<string, ComponentType<IconProps>> = {
  Notebook,
  Kanban,
  TreeStructure,
  Brain,
  CursorClick,
};

export default function GuidePage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <Link
          href="/"
          className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          Shodoboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-1">
          How Shodoboard works
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          A quick guide to reading and using your board
        </p>

        {/* Sections */}
        <div className="space-y-0">
          {guideSections.map((section, i) => {
            const Icon = ICONS[section.iconName];
            return (
              <section
                key={section.id}
                className={
                  i > 0
                    ? "border-t border-gray-100 dark:border-gray-800 pt-6 pb-6"
                    : "pb-6"
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                    {Icon && (
                      <Icon
                        size={16}
                        weight="duotone"
                        className="text-indigo-500 dark:text-indigo-400"
                      />
                    )}
                  </div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {section.title}
                  </h2>
                </div>
                <div className="pl-11 space-y-2">
                  {section.content.map((paragraph, j) => (
                    <p
                      key={j}
                      className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Back link */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            Back to Shodoboard
          </Link>
        </div>
      </div>
    </div>
  );
}
