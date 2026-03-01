"use client";

import Link from "next/link";
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

      <Link
        href="/intake"
        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-8 py-3 transition-colors"
      >
        Start with your backlog
      </Link>

      <Link
        href="/board"
        className="mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        Skip to example board
      </Link>
    </div>
  );
}
