"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Home, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { volunteerNavigationItems } from "@/lib/navigation";
import { useAuthStore } from "@/stores/authStore";
import { NotificationsBell } from "@/components/layout/notifications-bell";

type VolunteerShellProps = {
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function VolunteerShell({ children }: VolunteerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { volunteer, volunteerToken, logoutVolunteer } = useAuthStore();

  function handleLogout() {
    logoutVolunteer();
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

        <nav className="flex-1 space-y-1 px-3 pb-4">
          {volunteerNavigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border-r-4 px-4 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-blue-700 bg-slate-50 text-blue-800"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-4">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-blue-900"
          >
            <Home className="h-4 w-4" />
            Trang chính
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-slate-200 bg-white lg:left-64">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:justify-end lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-950 lg:hidden">
            <Home className="h-4 w-4" />
            Trang chính
          </Link>

          <div className="flex items-center gap-3">
            <NotificationsBell token={volunteerToken} />
            <Link
              href="/volunteer/profile"
              aria-label="Mở hồ sơ tình nguyện viên"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-900">
                {volunteer?.name ? volunteer.name.slice(0, 2).toUpperCase() : <UserRound className="h-4 w-4" />}
              </span>
            </Link>
            <button type="button" onClick={handleLogout} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-800" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="fixed left-0 right-0 top-16 z-20 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {volunteerNavigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={`volunteer-mobile-${item.href}`}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold",
                  active ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="px-4 pb-10 pt-28 sm:px-6 lg:pl-72 lg:pr-8 lg:pt-24">
        <div className="mx-auto max-w-[1520px]">{children}</div>
      </main>
    </div>
  );
}
