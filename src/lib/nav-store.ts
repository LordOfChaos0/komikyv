"use client";

import { create } from "zustand";

export type ViewName =
  | "home"
  | "modules"
  | "lesson"
  | "dialog"
  | "flashcards"
  | "pronunciation"
  | "vocabulary"
  | "grammar"
  | "progress"
  | "achievements"
  | "leaderboard"
  | "profile"
  | "login"
  | "register"
  | "teacher-modules"
  | "teacher-module-edit"
  | "admin-dashboard"
  | "admin-moderation"
  | "admin-users"
  | "about";

interface NavState {
  view: ViewName;
  params: Record<string, any>;
  navigate: (view: ViewName, params?: Record<string, any>) => void;
  back: () => void;
  history: { view: ViewName; params: Record<string, any> }[];
}

export const useNav = create<NavState>((set, get) => ({
  view: "home",
  params: {},
  history: [],
  navigate: (view, params = {}) => {
    const s = get();
    set({
      view,
      params,
      history: [...s.history, { view: s.view, params: s.params }].slice(-20),
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  back: () => {
    const s = get();
    if (s.history.length > 0) {
      const prev = s.history[s.history.length - 1];
      set({
        view: prev.view,
        params: prev.params,
        history: s.history.slice(0, -1),
      });
    } else {
      set({ view: "home", params: {} });
    }
  },
}));
