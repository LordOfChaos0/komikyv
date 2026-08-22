"use client";

import { create } from "zustand";
import { apiFetch } from "./api-client";

export interface CurrentUser {
  id: string;
  email: string;
  role: "student" | "teacher" | "admin";
  fullName: string | null;
  isActive: boolean;
  profile?: {
    level: string;
    xp: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityAt: string | null;
  } | null;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
  setUser: (u: CurrentUser | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  refresh: async () => {
    try {
      const data = await apiFetch<{ user: CurrentUser | null }>("/api/auth/me");
      set({ user: data.user, loading: false });
      return data.user;
    } catch {
      set({ user: null, loading: false });
      return null;
    }
  },
  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    set({ user: null });
  },
  setUser: (u) => set({ user: u, loading: false }),
}));
