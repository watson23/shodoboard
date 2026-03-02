import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BoardState } from "@/types/board";
import type { ConversationMessage } from "@/types/intake";

export interface BoardDocument {
  boardState: BoardState;
  intakeHistory?: ConversationMessage[];
  consentGiven: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

const BOARDS_COLLECTION = "boards";

export async function createBoard(
  boardState: BoardState,
  intakeHistory?: ConversationMessage[]
): Promise<string> {
  const boardRef = doc(collection(db, BOARDS_COLLECTION));
  await setDoc(boardRef, {
    boardState,
    intakeHistory: intakeHistory ?? [],
    consentGiven: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return boardRef.id;
}

export async function getBoard(boardId: string): Promise<BoardDocument | null> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return null;
  return snap.data() as BoardDocument;
}

export async function updateBoardState(
  boardId: string,
  boardState: BoardState
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(boardRef, {
    boardState,
    updatedAt: serverTimestamp(),
  });
}
