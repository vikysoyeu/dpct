export type AdminRole = "ADMIN" | "ADMIN_TNV" | "ADMIN_YCCT" | "ADMIN_KHO";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "Admin tổng",
  ADMIN_TNV: "Admin Nguồn lực",
  ADMIN_YCCT: "Admin Yêu cầu cứu trợ",
  ADMIN_KHO: "Admin Kho + Quỹ",
};

const routePermissions: Array<{ prefix: string; roles: AdminRole[] }> = [
  { prefix: "/admin/resources", roles: ["ADMIN_TNV"] },
  { prefix: "/admin/needs", roles: ["ADMIN_YCCT"] },
  { prefix: "/admin/inventory", roles: ["ADMIN_KHO"] },
  { prefix: "/admin/fund", roles: ["ADMIN_KHO"] },
  { prefix: "/admin/locations", roles: ["ADMIN", "ADMIN_YCCT"] },
  { prefix: "/admin/system", roles: ["ADMIN"] },
];

export function canAccessAdminPath(role: string | undefined | null, pathname: string) {
  if (role === "ADMIN") return true;
  if (pathname === "/admin") return true;
  const rule = routePermissions.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (!rule) return false;
  return !!role && rule.roles.includes(role as AdminRole);
}
