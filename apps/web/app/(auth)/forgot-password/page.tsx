"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";

type ForgotResponse = { message: string };

type FieldErrors = Partial<Record<"email" | "code" | "password" | "confirmPassword", string>>;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validateEmail() {
    if (!email.trim()) return "Email bắt buộc nhập.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Email không hợp lệ.";
    return "";
  }

  function validateReset() {
    const next: FieldErrors = {
      email: validateEmail(),
      code: /^\d{6}$/.test(code.trim()) ? "" : "Mã xác thực phải gồm 6 chữ số.",
      password: password.length >= 6 ? "" : "Mật khẩu phải có ít nhất 6 ký tự.",
      confirmPassword: confirmPassword === password ? "" : "Mật khẩu nhập lại không khớp.",
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as FieldErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  async function requestCode() {
    setError("");
    setMessage("");
    const emailError = validateEmail();
    setFieldErrors(emailError ? { email: emailError } : {});
    if (emailError) return;

    setLoading(true);
    try {
      const res = await apiClient.post<ForgotResponse>("/auth/volunteer/forgot-password", { email: email.trim() });
      setMessage(res.message);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi mã xác thực.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    await requestCode();
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!validateReset()) return;

    setLoading(true);
    try {
      const res = await apiClient.post<ForgotResponse>("/auth/volunteer/reset-password", {
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setMessage(res.message);
      setCode("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-6">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 sm:p-10">
        <Link href="/" aria-label="Về trang chủ" className="mb-8 flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          <img src="/cone.png" alt="Logo Điều phối cứu trợ" className="h-10 w-10 object-contain" />
          Điều phối cứu trợ
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-900">
            {step === "email" ? <Mail className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-black text-slate-900">Quên mật khẩu TNV</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Nhập email tài khoản tình nguyện viên để nhận mã xác thực đặt lại mật khẩu.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleRequestCode} noValidate className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
            <EmailField email={email} setEmail={setEmail} error={fieldErrors.email} />
            <button type="submit" disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi mã xác thực
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
            <EmailField email={email} setEmail={setEmail} error={fieldErrors.email} />
            <div className="mt-5">
              <label htmlFor="reset-code" className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mã xác thực</label>
              <input id="reset-code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-lg font-black tracking-[0.32em] outline-none transition-colors focus:ring-1 ${fieldErrors.code ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`} placeholder="000000" />
              {fieldErrors.code && <p className="mt-1 text-xs font-bold text-danger">{fieldErrors.code}</p>}
            </div>
            <PasswordField id="new-password" label="Mật khẩu mới" value={password} setValue={setPassword} error={fieldErrors.password} autoComplete="new-password" />
            <PasswordField id="confirm-password" label="Nhập lại mật khẩu" value={confirmPassword} setValue={setConfirmPassword} error={fieldErrors.confirmPassword} autoComplete="new-password" />
            <button type="submit" disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Đặt lại mật khẩu
            </button>
            <button type="button" onClick={() => void requestCode()} disabled={loading} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-blue-900 transition hover:bg-blue-50 disabled:opacity-60">
              Gửi lại mã
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Nhớ mật khẩu?{" "}
          <Link href="/login" className="font-black text-blue-900 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}

function EmailField({ email, setEmail, error }: { email: string; setEmail: (value: string) => void; error?: string }) {
  return (
    <div>
      <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Email TNV</label>
      <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`} placeholder="ten@example.com" />
      {error && <p className="mt-1 text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, setValue, error, autoComplete }: { id: string; label: string; value: string; setValue: (value: string) => void; error?: string; autoComplete: string }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</label>
      <input id={id} type="password" autoComplete={autoComplete} value={value} onChange={(e) => setValue(e.target.value)} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`} placeholder="••••••••" />
      {error && <p className="mt-1 text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}
