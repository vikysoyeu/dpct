"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiClient } from "@/lib/api";
import { useVolunteers } from "@/hooks/useVolunteers";
import { useAdminRoles } from "@/hooks/useAdminRescue";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import { useAuthStore } from "@/stores/authStore";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/admin-permissions";

type AdminAccount = {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  createdAt: string;
  updatedAt?: string;
};

type AccountKind = "admin" | "volunteer";
type AccountErrors = Partial<Record<"username" | "password" | "displayName" | "name" | "phone" | "email", string>>;

const ACCOUNT_STATUS = {
  HOAT_DONG: "Hoạt động",
  CHO_DUYET: "Chờ duyệt",
  TAM_DUNG: "Tạm dừng",
  KHOA: "Khóa",
};

export default function AdminSystemPage() {
  const { admin } = useAuthStore();
  const { volunteers, loading: loadingVolunteers, updateVolunteer, deleteVolunteer, refetch } = useVolunteers();
  const { roles } = useAdminRoles();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [kind, setKind] = useState<AccountKind>("volunteer");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AccountErrors>({});
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    name: "",
    phone: "",
    email: "",
    skills: "",
    accountStatus: "HOAT_DONG",
    roleIds: [] as number[],
    adminRole: "ADMIN_TNV" as AdminRole,
  });

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const data = await apiClient.get<AdminAccount[]>("/auth/admin/users");
      setAdmins(data);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredVolunteers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return volunteers.filter((volunteer) => `${volunteer.name} ${volunteer.phone} ${volunteer.email ?? ""} ${volunteer.username ?? ""}`.toLowerCase().includes(keyword));
  }, [volunteers, query]);

  const filteredAdmins = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return admins.filter((item) => `${item.username} ${item.displayName}`.toLowerCase().includes(keyword));
  }, [admins, query]);

  async function createAccount() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (kind === "admin") {
        await apiClient.post("/auth/admin/users", {
          username: form.username,
          password: form.password,
          displayName: form.displayName,
          role: form.adminRole,
        });
        await fetchAdmins();
      } else {
        await apiClient.post("/admin/volunteer-accounts", {
          username: form.username,
          password: form.password || undefined,
          email: form.email || undefined,
          name: form.name,
          phone: form.phone,
          accountStatus: form.accountStatus,
          skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
          roleIds: form.roleIds,
        });
        await refetch();
      }
      setForm({ username: "", password: "", displayName: "", name: "", phone: "", email: "", skills: "", accountStatus: "HOAT_DONG", roleIds: [], adminRole: "ADMIN_TNV" });
      setFieldErrors({});
    } finally {
      setSubmitting(false);
    }
  }

  function validateField(key: keyof AccountErrors, value: string) {
    const trimmed = value.trim();
    if (kind === "admin") {
      if (key === "username" && !trimmed) return "Username admin bắt buộc nhập.";
      if (key === "displayName" && !trimmed) return "Tên hiển thị bắt buộc nhập.";
      if (key === "password" && !trimmed) return "Mật khẩu bắt buộc nhập.";
    } else {
      if (key === "name" && !trimmed) return "Họ tên bắt buộc nhập.";
      if (key === "phone") {
        if (!trimmed) return "SĐT bắt buộc nhập.";
        if (!isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
      }
      if (key === "email" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    }
    return "";
  }

  function validateForm() {
    const next: AccountErrors = kind === "admin"
      ? {
        username: validateField("username", form.username),
        displayName: validateField("displayName", form.displayName),
        password: validateField("password", form.password),
      }
      : {
        name: validateField("name", form.name),
        phone: validateField("phone", form.phone),
        email: validateField("email", form.email),
      };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as AccountErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function updateField(key: keyof typeof form, value: string) {
    setForm({ ...form, [key]: value });
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: validateField(key as keyof AccountErrors, value) || undefined }));
    }
  }

  async function updateAdmin(id: string, displayName: string, role: AdminRole, password?: string) {
    await apiClient.patch(`/auth/admin/users/${id}`, { displayName, role, password: password || undefined });
    await fetchAdmins();
  }

  async function deleteAdmin(id: string) {
    await apiClient.del(`/auth/admin/users/${id}`);
    await fetchAdmins();
  }

  async function updateVolunteerAccount(id: string, input: Record<string, unknown>) {
    await apiClient.patch(`/admin/volunteer-accounts/${id}`, input);
    await refetch();
  }

  const loading = loadingAdmins || loadingVolunteers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin - Quản lý Phân quyền"
        subtitle="Tạo tài khoản TNV/Admin, cập nhật trạng thái tài khoản, vai trò đội và khóa/xóa khi cần."
        actions={[{ href: "/admin/resources", label: "Nguồn lực" }, { href: "/admin", label: "Tổng quan", variant: "secondary" }]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Tài khoản Admin" value={loadingAdmins ? "..." : String(admins.length)} />
        <Stat label="Tài khoản TNV" value={loadingVolunteers ? "..." : String(volunteers.length)} />
        <Stat label="Vai trò đội" value={String(roles.length)} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setKind("volunteer")} className={`rounded-lg px-4 py-2 text-sm font-bold ${kind === "volunteer" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>TNV</button>
            <button type="button" onClick={() => setKind("admin")} className={`rounded-lg px-4 py-2 text-sm font-bold ${kind === "admin" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>Admin</button>
          </div>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:w-80" placeholder="Tìm tài khoản..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>

        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <div className={kind === "admin" ? "grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]" : "grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr_auto]"}>
            {kind === "admin" ? (
              <>
                <AccountInput error={fieldErrors.username} placeholder="Username admin" value={form.username} onChange={(value) => updateField("username", value)} onBlur={() => setFieldErrors((current) => ({ ...current, username: validateField("username", form.username) || undefined }))} />
                <AccountInput error={fieldErrors.displayName} placeholder="Tên hiển thị" value={form.displayName} onChange={(value) => updateField("displayName", value)} onBlur={() => setFieldErrors((current) => ({ ...current, displayName: validateField("displayName", form.displayName) || undefined }))} />
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.adminRole} onChange={(event) => setForm({ ...form, adminRole: event.target.value as AdminRole })}>
                  {Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <AccountInput error={fieldErrors.password} placeholder="Mật khẩu" type="password" value={form.password} onChange={(value) => updateField("password", value)} onBlur={() => setFieldErrors((current) => ({ ...current, password: validateField("password", form.password) || undefined }))} />
              </>
            ) : (
              <>
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
                <AccountInput error={fieldErrors.name} placeholder="Họ tên" value={form.name} onChange={(value) => updateField("name", value)} onBlur={() => setFieldErrors((current) => ({ ...current, name: validateField("name", form.name) || undefined }))} />
                <AccountInput error={fieldErrors.phone} placeholder="SĐT" value={form.phone} onChange={(value) => updateField("phone", value)} onBlur={() => setFieldErrors((current) => ({ ...current, phone: validateField("phone", form.phone) || undefined }))} />
                <AccountInput error={fieldErrors.email} placeholder="Email" value={form.email} onChange={(value) => updateField("email", value)} onBlur={() => setFieldErrors((current) => ({ ...current, email: validateField("email", form.email) || undefined }))} />
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.accountStatus} onChange={(event) => setForm({ ...form, accountStatus: event.target.value })}>
                  {Object.entries(ACCOUNT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Kỹ năng, cách nhau dấu phẩy" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
              </>
            )}
            <button type="button" disabled={submitting} onClick={createAccount} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Tạo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải tài khoản</div>
          ) : kind === "admin" ? (
            <AdminTable accounts={filteredAdmins} currentAdminId={admin?.id} onSave={updateAdmin} onDelete={deleteAdmin} />
          ) : (
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">TNV</th>
                  <th className="px-5 py-3">Liên hệ</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Kỹ năng</th>
                  <th className="px-5 py-3 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVolunteers.map((volunteer) => (
                  <tr key={volunteer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-950">{volunteer.name}</div>
                      <div className="text-xs text-slate-500">{volunteer.username ?? "chưa có username"}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{volunteer.phone}<br />{volunteer.email ?? ""}</td>
                    <td className="px-5 py-4">
                      <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" value={volunteer.accountStatus ?? "HOAT_DONG"} onChange={(event) => updateVolunteerAccount(volunteer.id, { accountStatus: event.target.value })}>
                        {Object.entries(ACCOUNT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input className="w-64 rounded-lg border border-slate-200 px-2 py-1 text-xs" defaultValue={volunteer.skills.join(", ")} onBlur={(event) => updateVolunteer(volunteer.id, { skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => { if (window.confirm(`Xóa TNV "${volunteer.name}"?`)) deleteVolunteer(volunteer.id); }} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminTable({ accounts, currentAdminId, onSave, onDelete }: { accounts: AdminAccount[]; currentAdminId?: string; onSave: (id: string, displayName: string, role: AdminRole, password?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, { displayName: string; role: AdminRole; password: string }>>({});

  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-3">Username</th>
          <th className="px-5 py-3">Tên hiển thị</th>
          <th className="px-5 py-3">Quyền</th>
          <th className="px-5 py-3">Mật khẩu mới</th>
          <th className="px-5 py-3">Ngày tạo</th>
          <th className="px-5 py-3 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {accounts.map((account) => {
          const draft = drafts[account.id] ?? { displayName: account.displayName, role: account.role, password: "" };
          return (
            <tr key={account.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-bold text-slate-950">{account.username}</td>
              <td className="px-5 py-4"><input className="rounded-lg border border-slate-200 px-2 py-1" value={draft.displayName} onChange={(event) => setDrafts({ ...drafts, [account.id]: { ...draft, displayName: event.target.value } })} /></td>
              <td className="px-5 py-4">
                <select className="rounded-lg border border-slate-200 px-2 py-1" value={draft.role} onChange={(event) => setDrafts({ ...drafts, [account.id]: { ...draft, role: event.target.value as AdminRole } })}>
                  {Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </td>
              <td className="px-5 py-4"><input className="rounded-lg border border-slate-200 px-2 py-1" type="password" placeholder="Để trống nếu không đổi" value={draft.password} onChange={(event) => setDrafts({ ...drafts, [account.id]: { ...draft, password: event.target.value } })} /></td>
              <td className="px-5 py-4 text-slate-500">{new Date(account.createdAt).toLocaleDateString("vi-VN")}</td>
              <td className="px-5 py-4 text-right">
                <button type="button" onClick={() => onSave(account.id, draft.displayName, draft.role, draft.password)} className="rounded-lg p-2 text-blue-800 hover:bg-blue-50"><Save className="h-4 w-4" /></button>
                <button type="button" disabled={account.id === currentAdminId} onClick={() => { if (window.confirm(`Xóa admin "${account.username}"?`)) onDelete(account.id); }} className="ml-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <ShieldCheck className="h-4 w-4 text-blue-800" />
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function AccountInput({ value, onChange, onBlur, placeholder, type = "text", error }: { value: string; onChange: (value: string) => void; onBlur: () => void; placeholder: string; type?: string; error?: string }) {
  return (
    <label>
      <input
        className={`w-full rounded-xl border px-3 py-2 text-sm ${error ? "border-red-500" : "border-slate-200"}`}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="mt-1 block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}
