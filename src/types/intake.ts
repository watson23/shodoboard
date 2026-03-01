export type IntakeStage =
  | "input"           // user sees/edits the backlog dump
  | "analyzing"       // AI is "thinking" (fake delay)
  | "conversation"    // back-and-forth with AI
  | "generating"      // AI is "building the board" (fake delay)
  | "complete";       // board is ready, show transition

export type MessageRole = "ai" | "user";

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  text: string;
  proposal?: {
    type: "grouping" | "goal" | "outcome" | "board_ready";
    data: unknown;
  };
}

export interface IntakeState {
  stage: IntakeStage;
  rawInput: string;
  messages: ConversationMessage[];
  currentStep: number;
}
