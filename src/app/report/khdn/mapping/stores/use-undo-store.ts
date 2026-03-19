"use client";

import { create } from "zustand";
import type { UndoSnapshot } from "../types";

const MAX_UNDO_STEPS = 20;

type UndoState = {
  undoHistory: UndoSnapshot[];
  /** Push a new snapshot. Keeps the most recent MAX_UNDO_STEPS entries. */
  pushUndo: (snapshot: UndoSnapshot) => void;
  /** Remove and return the latest snapshot, or null if history is empty. */
  popUndo: () => UndoSnapshot | null;
  /** Clear all history (e.g. after a successful save). */
  clearUndo: () => void;
  /** True when there is at least one snapshot to undo. */
  canUndo: () => boolean;
};

export const useUndoStore = create<UndoState>((set, get) => ({
  undoHistory: [],

  pushUndo: (snapshot) =>
    set((s) => ({
      undoHistory: [snapshot, ...s.undoHistory].slice(0, MAX_UNDO_STEPS),
    })),

  popUndo: () => {
    const { undoHistory } = get();
    if (undoHistory.length === 0) return null;
    const [latest, ...rest] = undoHistory;
    set({ undoHistory: rest });
    return latest;
  },

  clearUndo: () => set({ undoHistory: [] }),

  canUndo: () => get().undoHistory.length > 0,
}));
