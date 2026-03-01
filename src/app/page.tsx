"use client";

import { Kanban } from "@phosphor-icons/react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <Kanban
        size={64}
        weight="duotone"
        className="text-indigo-500 dark:text-indigo-400 mb-4"
      />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Shodoboard
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Know why you&apos;re building it
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Board coming soon
      </p>
    </div>
  );
}
