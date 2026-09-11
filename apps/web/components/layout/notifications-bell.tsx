"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { NotificationItem, useNotificationStore } from "@/stores/notificationStore";

type NotificationsResponse = {
  data: NotificationItem[];
  unreadCount: number;
};

type NotificationsBellProps = {
  token?: string | null;
  className?: string;
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function NotificationsBell({ token, className }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { items, unreadCount, setNotifications, markRead, markAllRead, reset } = useNotificationStore();

  useSocket(token);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }

    let cancelled = false;
    apiClient
      .get<NotificationsResponse>("/notifications")
      .then((response) => {
        if (!cancelled) setNotifications(response.data, response.unreadCount);
      })
      .catch(() => {
        if (!cancelled) setNotifications([], 0);
      });

    return () => {
      cancelled = true;
    };
  }, [reset, setNotifications, token]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleMarkRead(id: string) {
    markRead(id);
    await apiClient.patch(`/notifications/${id}/read`, {}).catch(() => undefined);
  }

  async function handleMarkAllRead() {
    markAllRead();
    await apiClient.patch("/notifications/read-all", {}).catch(() => undefined);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={clsx("relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-800", className)}
        aria-label="Mở thông báo"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">Thông báo</p>
              <p className="text-xs font-medium text-slate-500">{unreadCount} chưa đọc</p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-800"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">Chưa có thông báo</div>
            ) : (
              items.map((item) => {
                const content = (
                  <div
                    className={clsx(
                      "grid gap-1 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50",
                      !item.readAt && "bg-blue-50/70",
                    )}
                    onClick={() => handleMarkRead(item.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      {!item.readAt ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" /> : null}
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-600">{item.message}</p>
                    <p className="text-[11px] font-bold text-slate-400">{timeLabel(item.createdAt)}</p>
                  </div>
                );

                return item.link ? (
                  <Link key={item.id} href={item.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.id} type="button" className="block w-full">
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
