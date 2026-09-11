"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api";
import { ADMIN_ROLE_LABELS, canAccessAdminPath } from "@/lib/admin-permissions";

type AdminAuthGuardProps = {
  children: ReactNode;
};

type MeResponse = {
  id: string;
  username: string;
  displayName: string;
  role?: "ADMIN" | "ADMIN_TNV" | "ADMIN_YCCT" | "ADMIN_KHO";
};

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const { token, admin, loading, setAuth, logout, setLoading } = useAuthStore();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    // If we already have admin data with role, we're good.
    if (admin?.role) {
      setLoading(false);
      return;
    }

    // Verify token by calling /auth/admin/me
    apiClient
      .get<MeResponse>("/auth/admin/me")
      .then((data) => {
        setAuth(token, data);
      })
      .catch(() => {
        logout();
        router.replace("/login");
      });
  }, [token, admin, router, setAuth, logout, setLoading]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-semibold text-text-subtle">
            Đang kiểm tra quyền truy cập...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminPermissionGuard({ children }: AdminAuthGuardProps) {
  const pathname = usePathname();
  const { admin } = useAuthStore();

  if (!canAccessAdminPath(admin?.role, pathname)) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-800">Không có quyền</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">Bạn không có quyền truy cập chức năng này</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Tài khoản hiện tại là {admin?.role ? ADMIN_ROLE_LABELS[admin.role] : "admin chưa gán quyền"}. Vui lòng dùng tài khoản có quyền phù hợp hoặc liên hệ Quản trị viên hệ thống.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
