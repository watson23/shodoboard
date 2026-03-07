"use client";

import { useState, useRef, useEffect } from "react";
import { X, Link, Check, Plus, Trash, UserCirclePlus, Crown, Globe, LockSimple } from "@phosphor-icons/react";
import {
  updateBoardAccessMode,
  addBoardMember,
  removeBoardMember,
  unclaimBoard,
  removeUserBoardEntry,
} from "@/lib/firestore";
import type { BoardMember, BoardVisitor } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";

interface ManageBoardModalProps {
  boardId: string;
  ownerEmail: string;
  accessMode: "link" | "invite_only";
  members: BoardMember[];
  recentVisitors: BoardVisitor[];
  onAccessModeChange: (mode: "link" | "invite_only") => void;
  onMembersChange: (members: BoardMember[]) => void;
  onUnclaim: () => void;
  onClose: () => void;
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ManageBoardModal({
  boardId,
  ownerEmail,
  accessMode,
  members,
  recentVisitors,
  onAccessModeChange,
  onMembersChange,
  onUnclaim,
  onClose,
}: ManageBoardModalProps) {
  const { user } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);
  const [changingMode, setChangingMode] = useState(false);
  const [confirmUnclaim, setConfirmUnclaim] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAccessModeChange = async (mode: "link" | "invite_only") => {
    if (mode === accessMode || changingMode) return;
    setChangingMode(true);
    try {
      await updateBoardAccessMode(boardId, mode);
      onAccessModeChange(mode);
    } catch (err) {
      console.error("Failed to update access mode:", err);
    } finally {
      setChangingMode(false);
    }
  };

  const handleAddMember = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Enter a valid email address");
      return;
    }
    if (email === ownerEmail.toLowerCase()) {
      setEmailError("Owner already has access");
      return;
    }
    if (members.some((m) => m.email === email)) {
      setEmailError("Already a member");
      return;
    }
    setEmailError(null);
    setAdding(true);
    try {
      const updated = await addBoardMember(boardId, email);
      onMembersChange(updated);
      setEmailInput("");
      emailInputRef.current?.focus();
    } catch (err) {
      console.error("Failed to add member:", err);
      setEmailError("Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    setRemoving((prev) => new Set(prev).add(email));
    try {
      const updated = await removeBoardMember(boardId, email);
      onMembersChange(updated);
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  const handleAddVisitorAsMember = async (email: string) => {
    setAdding(true);
    try {
      const updated = await addBoardMember(boardId, email);
      onMembersChange(updated);
    } catch (err) {
      console.error("Failed to add visitor as member:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleUnclaim = async () => {
    setUnclaiming(true);
    try {
      await unclaimBoard(boardId);
      if (user) {
        removeUserBoardEntry(user.uid, boardId);
      }
      onUnclaim();
      onClose();
    } catch (err) {
      console.error("Failed to unclaim:", err);
    } finally {
      setUnclaiming(false);
    }
  };

  // Filter visitors who aren't already members
  const memberEmails = new Set([ownerEmail.toLowerCase(), ...members.map((m) => m.email)]);
  const filteredVisitors = recentVisitors.filter(
    (v) => !memberEmails.has(v.email.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto animate-[slide-in_0.15s_ease-out]">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 z-10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Manage board
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Access mode */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Who can access
            </label>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAccessModeChange("link")}
                disabled={changingMode}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
                  accessMode === "link"
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                }`}
              >
                <Globe size={16} weight={accessMode === "link" ? "fill" : "regular"} />
                Anyone with link
              </button>
              <button
                onClick={() => handleAccessModeChange("invite_only")}
                disabled={changingMode}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
                  accessMode === "invite_only"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                }`}
              >
                <LockSimple size={16} weight={accessMode === "invite_only" ? "fill" : "regular"} />
                Invite only
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
              {accessMode === "link"
                ? "Anyone with the board URL can view and edit."
                : "Only you and invited members can access this board."}
            </p>
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check size={14} weight="bold" className="text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Link size={14} />
                Copy board link
              </>
            )}
          </button>

          {/* Members section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Members
              </label>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                {members.length + 1}
              </span>
            </div>

            {/* Owner */}
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-2">
              <Crown size={14} weight="fill" className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                  {ownerEmail}
                </span>
              </div>
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                owner
              </span>
            </div>

            {/* Members list */}
            {members.map((member) => (
              <div
                key={member.email}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="w-3.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                    {member.email}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    Added {formatRelativeTime(member.addedAt)}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.email)}
                  disabled={removing.has(member.email)}
                  className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title="Remove member"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}

            {/* Add member input */}
            <div className="flex gap-2 mt-2">
              <input
                ref={emailInputRef}
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddMember();
                }}
                placeholder="Add member by email"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleAddMember}
                disabled={adding || !emailInput.trim()}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                Add
              </button>
            </div>
            {emailError && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{emailError}</p>
            )}
          </div>

          {/* Recent visitors */}
          {filteredVisitors.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent visitors
              </label>
              <div className="mt-2 space-y-0.5">
                {filteredVisitors.map((visitor) => (
                  <div
                    key={visitor.uid}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="w-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate block">
                        {visitor.email}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Last visited {formatRelativeTime(visitor.lastVisitedAt)}
                      </span>
                    </div>
                    {!members.some((m) => m.email === visitor.email.toLowerCase()) && (
                      <button
                        onClick={() => handleAddVisitorAsMember(visitor.email)}
                        disabled={adding}
                        className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        title="Add as member"
                      >
                        <UserCirclePlus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            {!confirmUnclaim ? (
              <button
                onClick={() => setConfirmUnclaim(true)}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Remove ownership of this board
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-500 dark:text-red-400">
                  This will reset all access settings. Are you sure?
                </span>
                <button
                  onClick={handleUnclaim}
                  disabled={unclaiming}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                >
                  {unclaiming ? "Removing..." : "Yes, remove"}
                </button>
                <button
                  onClick={() => setConfirmUnclaim(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
