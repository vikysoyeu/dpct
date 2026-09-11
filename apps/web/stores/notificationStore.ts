"use client";

import { create } from "zustand";

export type NotificationItem = {
  id: string;
  recipientKind: "USER" | "ADMIN";
  userId?: string | null;
  adminUserId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

type NotificationState = {
  items: NotificationItem[];
  unreadCount: number;
  setNotifications: (items: NotificationItem[], unreadCount: number) => void;
  addNotification: (item: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  setNotifications: (items, unreadCount) => set({ items, unreadCount }),
  addNotification: (item) =>
    set((state) => {
      if (state.items.some((existing) => existing.id === item.id)) return state;
      return {
        items: [item, ...state.items].slice(0, 50),
        unreadCount: state.unreadCount + (item.readAt ? 0 : 1),
      };
    }),
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
      unreadCount: Math.max(0, state.unreadCount - (state.items.find((item) => item.id === id && !item.readAt) ? 1 : 0)),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    })),
  reset: () => set({ items: [], unreadCount: 0 }),
}));
