"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { HelpCircle, LogOut, Settings, Siren, UserRound } from "lucide-react";
import { userNavigationItems, userTopTabs } from "@/lib/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { ReactNode } from "react";
import { NotificationsBell } from "@/components/layout/notifications-bell";

type DashboardShellProps = {
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { volunteer, volunteerToken, logoutVolunteer } = useAuthStore();

  function handleLogout() {
    if (volunteerToken) {
      logoutVolunteer();
    }
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 shadow-[0_10px_40px_rgba(15,23,42,0.08)] lg:flex">
        <div className="px-6 py-6">
          <Link href="/" aria-label="Về trang chủ" className="flex items-center gap-3 text-[15px] font-black uppercase tracking-[0.18em] text-blue-950">
            <img
              src="/cone.png"
              alt="Logo Điều phối cứu trợ"
              className="h-11 w-11 object-contain"
            />
            <span className="text-left leading-tight">
              Điều phối<br />Cứu trợ
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {userNavigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  active
                    ? "translate-x-1 bg-surface-card text-primary"
                    : "text-text-subtle hover:bg-surface-high hover:text-primary"
                )}
              >
                <item.Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-outline/30 px-4 py-4">
          <Link
            href="/rescue-request"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-strong px-4 py-3 text-sm font-bold text-white shadow-ambient"
          >
            <Siren className="h-4 w-4" />
            Báo cáo Khẩn cấp
          </Link>

          <Link
            href="/admin"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-high px-4 py-3 text-sm font-bold text-primary"
          >
            Trang quản trị
          </Link>

          <Link
            href="/volunteer/requests"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-high px-4 py-3 text-sm font-bold text-primary"
          >
            Trang tình nguyện viên
          </Link>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-outline/30 bg-surface-card lg:left-64">
        <div className="flex h-full items-center justify-end px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            {userTopTabs.map((tab) => (
              <Link
                key={`mobile-top-${tab.href}`}
                href={tab.href}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-3 text-xs font-black text-white shadow-ambient"
              >
                <tab.Icon className="h-4 w-4" />
                {tab.shortLabel}
              </Link>
            ))}
            <Link
              href={volunteerToken ? "/volunteer/profile" : "/login"}
              aria-label={volunteerToken ? "Mở hồ sơ tình nguyện viên" : "Đăng nhập tình nguyện viên"}
              title="Hồ sơ tình nguyện viên"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary ring-1 ring-primary/10"
            >
              {volunteer?.name ? volunteer.name.slice(0, 2).toUpperCase() : <UserRound className="h-4 w-4" />}
            </Link>
            <button type="button" onClick={handleLogout} className="rounded-full p-2 text-text-subtle hover:bg-surface-high hover:text-primary" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {userTopTabs.map((tab) => {
              const active = isActive(pathname, tab.href);

              return (
                <Link
                  key={tab.href + tab.label}
                  href={tab.href}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition-all",
                    active ? "bg-primary text-white shadow-ambient" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                  )}
                >
                  <tab.Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}

            <NotificationsBell token={volunteerToken} className="text-primary hover:bg-surface-high" />

            <Link
              href={volunteerToken ? "/volunteer/profile" : "/login"}
              aria-label={volunteerToken ? "Mở hồ sơ tình nguyện viên" : "Đăng nhập tình nguyện viên"}
              title="Hồ sơ tình nguyện viên"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary ring-1 ring-primary/10 hover:bg-primary hover:text-white"
            >
              {volunteer?.name ? volunteer.name.slice(0, 2).toUpperCase() : <UserRound className="h-4 w-4" />}
            </Link>

            <button type="button" onClick={handleLogout} className="rounded-full p-2 text-text-subtle hover:bg-surface-high hover:text-primary" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="fixed left-0 right-0 top-16 z-20 border-b border-outline/30 bg-surface-card px-4 py-2 lg:hidden">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {userNavigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold",
                  active ? "bg-primary text-white" : "bg-surface-high text-text-subtle"
                )}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="px-4 pb-10 pt-28 sm:px-6 lg:pl-72 lg:pr-8 lg:pt-24">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
