export interface ActivityEvent {
  id: string;
  boardId: string;
  sessionId: string;
  userId?: string; // anonymous persistent user ID
  timestamp: string; // ISO 8601
  category: "state_change" | "ui_interaction" | "session";
  action: string;
  targetType?: "goal" | "outcome" | "item" | "nudge" | "focusItem" | "checklist";
  targetId?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

export interface SessionSummary {
  sessionId: string;
  boardId: string;
  userId?: string; // anonymous persistent user ID
  startedAt: string;
  endedAt?: string;
  userAgent: string;
  viewport: string;
}
