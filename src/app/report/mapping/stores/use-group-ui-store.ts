"use client";

import { create } from "zustand";

type GroupUiState = {
  editingGroup: string | null;
  editingGroupValue: string;
  editingGroupError: string;
  customGroups: string[];
  changingFieldGroup: string | null;
  changingFieldGroupValue: string;
  changingFieldGroupNewName: string;
  mergingGroups: boolean;
  mergeSourceGroups: string[];
  mergeTargetGroup: string;
  mergeOrderMode: "keep" | "alpha";
  mergeGroupsError: string;
  collapsedParentGroups: string[];
  setEditingGroup: (group: string | null) => void;
  setEditingGroupValue: (value: string) => void;
  setEditingGroupError: (error: string) => void;
  setCustomGroups: (groups: string[] | ((prev: string[]) => string[])) => void;
  setChangingFieldGroup: (fieldKey: string | null) => void;
  setChangingFieldGroupValue: (value: string) => void;
  setChangingFieldGroupNewName: (name: string) => void;
  setMergingGroups: (merging: boolean) => void;
  setMergeSourceGroups: (groups: string[] | ((prev: string[]) => string[])) => void;
  setMergeTargetGroup: (group: string) => void;
  setMergeOrderMode: (mode: "keep" | "alpha") => void;
  setMergeGroupsError: (error: string) => void;
  setCollapsedParentGroups: (groups: string[] | ((prev: string[]) => string[])) => void;
};

export const useGroupUiStore = create<GroupUiState>((set) => ({
  editingGroup: null,
  editingGroupValue: "",
  editingGroupError: "",
  customGroups: [],
  changingFieldGroup: null,
  changingFieldGroupValue: "",
  changingFieldGroupNewName: "",
  mergingGroups: false,
  mergeSourceGroups: [],
  mergeTargetGroup: "",
  mergeOrderMode: "keep",
  mergeGroupsError: "",
  collapsedParentGroups: [],
  setEditingGroup: (editingGroup) => set({ editingGroup }),
  setEditingGroupValue: (editingGroupValue) => set({ editingGroupValue }),
  setEditingGroupError: (editingGroupError) => set({ editingGroupError }),
  setCustomGroups: (groups) =>
    set((s) => ({ customGroups: typeof groups === "function" ? groups(s.customGroups) : groups })),
  setChangingFieldGroup: (changingFieldGroup) => set({ changingFieldGroup }),
  setChangingFieldGroupValue: (changingFieldGroupValue) => set({ changingFieldGroupValue }),
  setChangingFieldGroupNewName: (changingFieldGroupNewName) => set({ changingFieldGroupNewName }),
  setMergingGroups: (mergingGroups) => set({ mergingGroups }),
  setMergeSourceGroups: (groups) =>
    set((s) => ({
      mergeSourceGroups: typeof groups === "function" ? groups(s.mergeSourceGroups) : groups,
    })),
  setMergeTargetGroup: (mergeTargetGroup) => set({ mergeTargetGroup }),
  setMergeOrderMode: (mergeOrderMode) => set({ mergeOrderMode }),
  setMergeGroupsError: (mergeGroupsError) => set({ mergeGroupsError }),
  setCollapsedParentGroups: (groups) =>
    set((s) => ({
      collapsedParentGroups:
        typeof groups === "function" ? groups(s.collapsedParentGroups) : groups,
    })),
}));
