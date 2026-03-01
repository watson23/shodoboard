"use client";

import Link from "next/link";
import { Kanban } from "@phosphor-icons/react";

export default function BoardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
      <Kanban
        size={48}
        weight="duotone"
        className="text-indigo-500 dark:text-indigo-400 mb-4"
      />
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Board coming in the next tasks
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        The full board will be built in Tasks 7-12.
      </p>
      <Link
        href="/"
        className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
