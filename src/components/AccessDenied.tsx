"use client";

import { LockSimple, SignIn } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";

interface AccessDeniedProps {
  ownerEmail?: string;
}

export default function AccessDenied({ ownerEmail }: AccessDeniedProps) {
  const { user, signIn } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 max-w-sm w-full text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/20">
          <LockSimple size={28} weight="duotone" className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1.5">
            This board is invite only
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask the board owner to add your email to the members list.
          </p>
        </div>
        {ownerEmail && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Board owner: {ownerEmail}
          </p>
        )}
        {!user ? (
          <button
            onClick={() => signIn()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <SignIn size={18} weight="bold" />
            Sign in to check access
          </button>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Signed in as
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user.email}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              You don&apos;t have access to this board.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
