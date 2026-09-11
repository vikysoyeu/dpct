import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminAuthGuard, AdminPermissionGuard } from "@/components/layout/admin-auth-guard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShell>
        <AdminPermissionGuard>{children}</AdminPermissionGuard>
      </AdminShell>
    </AdminAuthGuard>
  );
}
