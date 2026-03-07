"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check, Lightning, Export, ListChecks, TreeStructure, Kanban, Link, ChatCircleDots, Megaphone, PencilSimple, DotsThree, UserCircle, SignIn, GearSix, Crown } from "@phosphor-icons/react";
import FeedbackModal from "./FeedbackModal";
import ManageBoardModal from "./ManageBoardModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useBoard } from "@/hooks/useBoard";
import { openPrintableExport } from "@/lib/export";
import { claimBoard, upsertUserBoardEntry, updateUserBoardProductName } from "@/lib/firestore";
import type { BoardMember, BoardVisitor } from "@/lib/firestore";
import type { SaveStatus } from "@/hooks/useAutoSave";

function ShodoLogoSmall() {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7 flex-shrink-0"
    >
      <rect width="128" height="128" rx="28" fill="#4f46e5" />
      <rect x="16" y="16" width="96" height="96" rx="8" fill="white" opacity="0.95" />
      <rect x="22" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="22" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="22" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <rect x="50" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="50" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="50" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <rect x="78" y="28" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.2" />
      <rect x="78" y="48" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.35" />
      <rect x="78" y="68" width="24" height="16" rx="3" fill="#4f46e5" opacity="0.5" />
      <circle cx="100" cy="100" r="18" fill="#4f46e5" />
      <polyline points="90,100 97,107 110,93" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BoardHeaderProps {
  saveStatus?: SaveStatus;
  boardId?: string;
  productName?: string;
  ownerId?: string;
  ownerEmail?: string;
  accessMode?: "link" | "invite_only";
  members?: BoardMember[];
  recentVisitors?: BoardVisitor[];
  onOwnershipChange?: (ownerId: string | undefined, ownerEmail: string | undefined) => void;
  onAccessChange?: (accessMode: "link" | "invite_only", members: BoardMember[]) => void;
  onRefreshNudges?: () => void;
  nudgesLoading?: boolean;
  onToggleAgenda?: () => void;
  agendaOpen?: boolean;
  viewMode?: "hierarchy" | "kanban";
  onViewModeChange?: (mode: "hierarchy" | "kanban") => void;
  onBoardSpar?: () => void;
}

export default function BoardHeader({ saveStatus, boardId, productName, ownerId, ownerEmail, accessMode, members, recentVisitors, onOwnershipChange, onAccessChange, onRefreshNudges, nudgesLoading, onToggleAgenda, agendaOpen, viewMode, onViewModeChange, onBoardSpar }: BoardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, signIn } = useAuth();
  const { state, dispatch } = useBoard();
  const [copied, setCopied] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(productName || "");
  const [claiming, setClaiming] = useState(false);
  const [manageBoardOpen, setManageBoardOpen] = useState(false);
  const [showClaimExplainer, setShowClaimExplainer] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleNameSubmit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== productName) {
      dispatch({ type: "SET_PRODUCT_NAME", name: trimmed });
      if (user && boardId) {
        updateUserBoardProductName(user.uid, boardId, trimmed);
      }
    } else {
      setNameValue(productName || "");
    }
    setEditingName(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select+copy
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setMenuOpen(false);
  };

  const handleExport = () => {
    openPrintableExport(state);
    setMenuOpen(false);
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
    setMenuOpen(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      let claimUser = user;
      if (!claimUser) {
        claimUser = await signIn();
      }
      if (claimUser && boardId) {
        await claimBoard(boardId, claimUser.uid, claimUser.email || "");
        onOwnershipChange?.(claimUser.uid, claimUser.email || undefined);
        upsertUserBoardEntry(
          claimUser.uid,
          claimUser.email || "",
          claimUser.displayName || undefined,
          {
            boardId: boardId!,
            productName: state.productName || "Untitled",
            role: "owner",
            lastVisitedAt: new Date().toISOString(),
            addedAt: new Date().toISOString(),
          }
        );
      }
    } catch (err) {
      console.error("Failed to claim board:", err);
    } finally {
      setClaiming(false);
      setMenuOpen(false);
    }
  };

  const isClaimed = !!ownerId;
  const isOwner = user && ownerId === user.uid;

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme";

  return (
    <header className="sticky top-0 z-30 bg-indigo-600 dark:bg-indigo-700 px-4 h-14 flex items-center gap-3">
      <ShodoLogoSmall />
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="font-bold text-white text-sm whitespace-nowrap">
          Shodoboard
        </h1>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") {
                setNameValue(productName || "");
                setEditingName(false);
              }
            }}
            className="text-sm text-white bg-indigo-500/40 border border-indigo-400/50 rounded px-1.5 py-0.5 outline-none focus:border-white/50 min-w-[120px]"
            placeholder="Product name"
          />
        ) : (
          <button
            onClick={() => {
              setNameValue(productName || "");
              setEditingName(true);
            }}
            className="group flex items-center gap-1 text-sm text-indigo-200 hover:text-white transition-colors whitespace-nowrap"
            title="Click to rename"
          >
            {productName || "Untitled"}
            <PencilSimple size={12} className="opacity-0 group-hover:opacity-70 transition-opacity" />
          </button>
        )}
      </div>

      {onViewModeChange && (
        <div className="flex items-center bg-indigo-500/30 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("hierarchy")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "hierarchy"
                ? "bg-white/20 text-white font-semibold"
                : "text-indigo-200 hover:text-white"
            }`}
          >
            <TreeStructure size={14} weight="duotone" />
            Tree View
          </button>
          <button
            onClick={() => onViewModeChange("kanban")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              viewMode === "kanban"
                ? "bg-white/20 text-white font-semibold"
                : "text-indigo-200 hover:text-white"
            }`}
          >
            <Kanban size={14} weight="duotone" />
            Board
          </button>
        </div>
      )}

      {/* Save status / demo label */}
      <div className="ml-auto flex items-center gap-3">
        {!boardId && (
          <span className="text-xs text-indigo-200/70 bg-indigo-500/30 px-2 py-0.5 rounded">
            Demo
          </span>
        )}
        {boardId && saveStatus === "saving" && (
          <span className="text-xs text-indigo-200">Saving...</span>
        )}
        {boardId && saveStatus === "saved" && (
          <span className="text-xs text-indigo-200 flex items-center gap-1">
            <Check size={12} weight="bold" />
            Saved
          </span>
        )}
        {boardId && saveStatus === "error" && (
          <span className="text-xs text-red-300">Save error</span>
        )}
      </div>

      {/* Primary actions — always visible */}
      <div className="flex items-center gap-2">
        {onToggleAgenda && (
          <button
            onClick={onToggleAgenda}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              agendaOpen
                ? "bg-indigo-600 text-white"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
            title="Coaching Agenda"
          >
            <ListChecks size={16} weight="duotone" />
            <span className="hidden sm:inline">Agenda</span>
          </button>
        )}
        {onBoardSpar && (
          <button
            onClick={onBoardSpar}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
            title="Spar with AI coach about your board"
          >
            <ChatCircleDots size={16} weight="duotone" />
            <span className="hidden sm:inline">Spar</span>
          </button>
        )}
        {boardId && onRefreshNudges && (
          <button
            onClick={onRefreshNudges}
            disabled={nudgesLoading}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh AI nudges"
          >
            <Lightning
              size={14}
              weight="duotone"
              className={nudgesLoading ? "animate-pulse" : ""}
            />
            {nudgesLoading ? "Thinking..." : "Refresh nudges"}
          </button>
        )}
        <button
          onClick={() => setFeedbackOpen(true)}
          className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 transition-colors"
          title="Send feedback"
        >
          <Megaphone size={16} weight="duotone" />
        </button>

        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 transition-colors"
            title="More options"
          >
            <DotsThree size={20} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] z-50 animate-[slide-in_0.1s_ease-out]">
              {boardId && (
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Link size={16} className="text-gray-400 dark:text-gray-500" />
                  {copied ? "Copied!" : "Copy link"}
                </button>
              )}
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Export size={16} className="text-gray-400 dark:text-gray-500" />
                Export as PDF
              </button>
              {boardId && (
                <>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  {!isClaimed && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setShowClaimExplainer(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {user ? (
                        <UserCircle size={16} className="text-gray-400 dark:text-gray-500" />
                      ) : (
                        <SignIn size={16} className="text-gray-400 dark:text-gray-500" />
                      )}
                      {user ? "Claim this board" : "Sign in to claim this board"}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setManageBoardOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <GearSix size={16} className="text-gray-400 dark:text-gray-500" />
                      Manage board
                    </button>
                  )}
                  {isClaimed && !isOwner && (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <UserCircle size={14} weight="fill" />
                        Claimed by {ownerEmail}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={cycleTheme}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ThemeIcon size={16} className="text-gray-400 dark:text-gray-500" />
                {themeLabel}
              </button>
            </div>
          )}
        </div>
      </div>
      {feedbackOpen && (
        <FeedbackModal
          boardId={boardId}
          productName={productName}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
      {showClaimExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 dark:bg-black/50"
            onClick={() => setShowClaimExplainer(false)}
          />
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 text-center space-y-4 animate-[slide-in_0.15s_ease-out]"
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowClaimExplainer(false);
            }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Crown size={24} weight="duotone" className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Claim this board
            </h3>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>
                Claiming makes you the owner, giving you access controls and visibility into who visits.
              </p>
              <p>
                You can fully use and share this board without claiming — claiming just gives you more control.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => setShowClaimExplainer(false)}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClaimExplainer(false);
                  handleClaim();
                }}
                disabled={claiming}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {claiming ? "Claiming..." : "Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
      {manageBoardOpen && boardId && ownerEmail && (
        <ManageBoardModal
          boardId={boardId}
          ownerEmail={ownerEmail}
          accessMode={accessMode ?? "link"}
          members={members ?? []}
          recentVisitors={recentVisitors ?? []}
          onAccessModeChange={(mode) => {
            onAccessChange?.(mode, members ?? []);
          }}
          onMembersChange={(updatedMembers) => {
            onAccessChange?.(accessMode ?? "link", updatedMembers);
          }}
          onUnclaim={() => {
            onOwnershipChange?.(undefined, undefined);
          }}
          onClose={() => setManageBoardOpen(false)}
        />
      )}
    </header>
  );
}
