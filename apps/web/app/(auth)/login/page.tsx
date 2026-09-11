"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore, type VolunteerUser } from "@/stores/authStore";

type AdminLoginResponse = {
  token: string;
  admin: { id: string; username: string; displayName: string; role?: "ADMIN" | "ADMIN_TNV" | "ADMIN_YCCT" | "ADMIN_KHO" };
};

type VolunteerLoginResponse = {
  token: string;
  volunteer: VolunteerUser;
};

type LoginErrors = Partial<Record<"identifier" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setVolunteerAuth = useAuthStore((s) => s.setVolunteerAuth);
  const [role, setRole] = useState<"volunteer" | "admin">("volunteer");
  const [nextPath, setNextPath] = useState("/volunteer/requests");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/volunteer/requests");
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (role === "admin") {
        const res = await apiClient.post<AdminLoginResponse>("/auth/admin/login", {
          username,
          password,
        });
        setAuth(res.token, res.admin);
        router.replace("/admin");
        return;
      }

      const res = await apiClient.post<VolunteerLoginResponse>("/auth/volunteer/login", {
        identifier,
        password,
      });
      setVolunteerAuth(res.token, res.volunteer);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  function validateField(name: keyof LoginErrors, value: string) {
    if (value.trim()) return "";
    if (name === "password") return "Mật khẩu bắt buộc nhập.";
    return role === "admin" ? "Tên đăng nhập admin bắt buộc nhập." : "Username, email hoặc SĐT bắt buộc nhập.";
  }

  function validateForm() {
    const loginValue = role === "admin" ? username : identifier;
    const next: LoginErrors = {
      identifier: validateField("identifier", loginValue),
      password: validateField("password", password),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as LoginErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function setIdentifierValue(value: string) {
    if (role === "admin") setUsername(value);
    else setIdentifier(value);
    if (fieldErrors.identifier) {
      setFieldErrors((current) => ({ ...current, identifier: validateField("identifier", value) || undefined }));
    }
  }

  function setPasswordValue(value: string) {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((current) => ({ ...current, password: validateField("password", value) || undefined }));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-6">
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col justify-between bg-blue-950 p-8 text-white">
            <div>
              <Link href="/" aria-label="Về trang chủ" className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white/75">
                <img
                  src="/cone.png"
                  alt="Logo Điều phối cứu trợ"
                  className="h-11 w-11 object-contain"
                />
                <span className="text-left leading-tight">
                  Điều phối<br />Cứu trợ
                </span>
              </Link>
              <h1 className="mt-8 text-4xl font-black tracking-tight">Đăng nhập hệ thống</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
                Tình nguyện viên đăng nhập bằng username, email hoặc số điện thoại để cập nhật hồ sơ và tham gia điều phối.
              </p>
            </div>

            <div className="mt-10 grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
              <button
                type="button"
                onClick={() => setRole("volunteer")}
                className={`flex items-center justify-between rounded-xl px-4 py-4 text-left transition ${role === "volunteer" ? "bg-white text-blue-950" : "text-white/80 hover:bg-white/10"}`}
              >
                <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]">
                  <UserRound className="h-4 w-4" /> Tình nguyện viên
                </span>
                <span className="text-xs font-bold">TNV</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center justify-between rounded-xl px-4 py-4 text-left transition ${role === "admin" ? "bg-white text-blue-950" : "text-white/80 hover:bg-white/10"}`}
              >
                <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em]">
                  <ShieldCheck className="h-4 w-4" /> Quản trị viên
                </span>
                <span className="text-xs font-bold">Admin</span>
              </button>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-900">
                {role === "admin" ? <ShieldCheck className="h-7 w-7" /> : <UserRound className="h-7 w-7" />}
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {role === "admin" ? "Đăng nhập quản trị" : "Đăng nhập tình nguyện viên"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {role === "admin" ? "Dùng tài khoản admin được cấp quyền riêng." : "Dùng tài khoản đã đăng ký để vào khu vực điều phối."}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {role === "admin" ? "Tên đăng nhập admin" : "Username, email hoặc SĐT"}
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    value={role === "admin" ? username : identifier}
                    onChange={(e) => setIdentifierValue(e.target.value)}
                    onBlur={() => setFieldErrors((current) => ({ ...current, identifier: validateField("identifier", role === "admin" ? username : identifier) || undefined }))}
                    aria-required
                    aria-invalid={Boolean(fieldErrors.identifier)}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 ${fieldErrors.identifier ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`}
                    placeholder={role === "admin" ? "admin" : "tnv-001 hoặc 09..."}
                  />
                  {fieldErrors.identifier && <p className="mt-1 text-xs font-bold text-danger">{fieldErrors.identifier}</p>}
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Mật khẩu
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    onBlur={() => setFieldErrors((current) => ({ ...current, password: validateField("password", password) || undefined }))}
                    aria-required
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 ${fieldErrors.password ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`}
                    placeholder="••••••••"
                  />
                  {fieldErrors.password && <p className="mt-1 text-xs font-bold text-danger">{fieldErrors.password}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {role === "admin" ? "Đăng nhập admin" : "Đăng nhập TNV"}
              </button>
              {role === "volunteer" && (
                <div className="mt-4 text-center">
                  <Link href="/forgot-password" className="text-sm font-black text-blue-900 hover:underline">
                    Quên mật khẩu TNV?
                  </Link>
                </div>
              )}
            </form>

            {role === "volunteer" && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="font-black text-blue-900 hover:underline">
                  Đăng ký tình nguyện viên
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
