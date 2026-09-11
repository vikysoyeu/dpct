"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore, type VolunteerUser } from "@/stores/authStore";
import { isValidEmail, isValidPhone } from "@/lib/validation";

type RegisterResponse = {
  token: string;
  volunteer: VolunteerUser;
};

type RegisterErrors = Partial<Record<"name" | "email" | "phone" | "password", string>>;

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const setVolunteerAuth = useAuthStore((s) => s.setVolunteerAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateField(fieldName: keyof RegisterErrors, value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      const fieldNames: Record<keyof RegisterErrors, string> = {
        name: "Họ tên",
        phone: "Số điện thoại",
        password: "Mật khẩu",
        email: "Email"
      };
      return `${fieldNames[fieldName]} bắt buộc nhập.`;
    }
    if (fieldName === "email" && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    if (fieldName === "phone" && !isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    return "";
  }

  function setFieldValue(fieldName: keyof RegisterErrors, value: string) {
    if (fieldName === "name") setName(value);
    if (fieldName === "email") setEmail(value);
    if (fieldName === "phone") setPhone(value);
    if (fieldName === "password") setPassword(value);
    if (fieldErrors[fieldName]) {
      setFieldErrors((current) => ({ ...current, [fieldName]: validateField(fieldName, value) || undefined }));
    }
  }

  function touchField(fieldName: keyof RegisterErrors, value: string) {
    setFieldErrors((current) => ({ ...current, [fieldName]: validateField(fieldName, value) || undefined }));
  }

  function validateForm() {
    const next: RegisterErrors = {
      name: validateField("name", name),
      email: validateField("email", email),
      phone: validateField("phone", phone),
      password: validateField("password", password),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as RegisterErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!validateForm()) return;
    setLoading(true);

    try {
      const res = await apiClient.post<RegisterResponse>("/auth/volunteer/register", {
        name,
        email,
        phone,
        password,
      });
      setVolunteerAuth(res.token, res.volunteer);
      setSuccess(true);
      setTimeout(() => router.replace("/volunteer/profile"), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng ký tài khoản.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-6 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-900">DPCT Volunteer</p>
          <h1 className="mt-2 text-3xl font-black">Đăng ký tình nguyện viên</h1>
          <p className="mt-2 text-sm text-slate-500">Tạo tài khoản trước, cập nhật hồ sơ chi tiết sau khi đăng nhập.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Đăng ký thành công, đang mở hồ sơ.
            </div>
          )}

          <Field label="Họ tên" value={name} onChange={(value) => setFieldValue("name", value)} onBlur={() => touchField("name", name)} error={fieldErrors.name} required />
          <Field label="Email" type="email" value={email} onChange={(value) => setFieldValue("email", value)} onBlur={() => touchField("email", email)} error={fieldErrors.email} required />
          <Field label="Số điện thoại" value={phone} onChange={(value) => setFieldValue("phone", value)} onBlur={() => touchField("phone", phone)} error={fieldErrors.phone} required />
          <Field label="Mật khẩu" type="password" value={password} onChange={(value) => setFieldValue("password", value)} onBlur={() => touchField("password", password)} error={fieldErrors.password} required />

          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Tạo tài khoản
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-black text-blue-900 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, onBlur, type = "text", required = false, error }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; type?: string; required?: boolean; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input aria-required={required} aria-invalid={Boolean(error)} type={type} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-1 ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-slate-200 focus:border-blue-300 focus:ring-blue-200"}`} />
      {error && <span className="mt-1 block text-xs font-bold text-danger">{error}</span>}
    </label>
  );
}
