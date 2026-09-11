"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, UserRound } from "lucide-react";
import { VietnamAddressFields } from "@/components/address/VietnamAddressFields";
import { apiClient } from "@/lib/api";
import { useAuthStore, type VolunteerUser } from "@/stores/authStore";
import { isValidEmail, isValidPhone } from "@/lib/validation";

const SKILL_OPTIONS = ["sơ cứu", "y tế", "lái xuồng", "vận chuyển", "hậu cần", "nấu ăn", "kỹ thuật", "điều phối", "truyền thông"];
type ProfileErrors = Partial<Record<"name" | "phone" | "email" | "emergencyContactPhone", string>>;

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function VolunteerProfilePage() {
  const { volunteer, setVolunteer } = useAuthStore();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    ward: "",
    status: "AVAILABLE",
    vehicleType: "",
    availability: "",
    experience: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    password: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!volunteer) return;
    setForm({
      name: volunteer.name ?? "",
      phone: volunteer.phone ?? "",
      email: volunteer.email ?? "",
      dateOfBirth: toDateInput(volunteer.dateOfBirth),
      gender: volunteer.gender ?? "",
      address: volunteer.address ?? "",
      city: volunteer.city ?? "",
      ward: volunteer.ward ?? "",
      status: volunteer.status ?? "AVAILABLE",
      vehicleType: volunteer.vehicleType ?? "",
      availability: volunteer.availability ?? "",
      experience: volunteer.experience ?? "",
      emergencyContactName: volunteer.emergencyContactName ?? "",
      emergencyContactPhone: volunteer.emergencyContactPhone ?? "",
      password: "",
    });
    setSkills(volunteer.skills ?? []);
  }, [volunteer]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in fieldErrors) {
      const errorText = validateField(key as keyof ProfileErrors, value);
      setFieldErrors((current) => ({ ...current, [key]: errorText || undefined }));
    }
  };
  const toggleSkill = (skill: string) => setSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));

  function validateField(key: keyof ProfileErrors, value: string) {
    const trimmed = value.trim();
    if (key === "name" && !trimmed) return "Họ tên bắt buộc nhập.";
    if (key === "phone") {
      if (!trimmed) return "Số điện thoại bắt buộc nhập.";
      if (!isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    }
    if (key === "email" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    if (key === "emergencyContactPhone" && trimmed && !isValidPhone(trimmed)) return "Số điện thoại liên hệ khẩn cấp không hợp lệ.";
    return "";
  }

  function touchField(key: keyof ProfileErrors) {
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, form[key]) || undefined }));
  }

  function validateForm() {
    const next: ProfileErrors = {
      name: validateField("name", form.name),
      phone: validateField("phone", form.phone),
      email: validateField("email", form.email),
      emergencyContactPhone: validateField("emergencyContactPhone", form.emergencyContactPhone),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as ProfileErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!validateForm()) return;
    setLoading(true);

    try {
      const updated = await apiClient.patch<VolunteerUser>("/volunteer/profile", {
        ...form,
        skills,
        password: form.password || undefined,
      });
      setVolunteer(updated);
      setMessage("Đã cập nhật hồ sơ.");
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-ambient">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-black text-primary">
              {volunteer?.name ? volunteer.name.slice(0, 2).toUpperCase() : <UserRound className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-text-subtle">Hồ sơ tình nguyện viên</p>
              <h1 className="mt-1 text-2xl font-black text-primary">{volunteer?.name ?? "Tình nguyện viên"}</h1>
              <p className="mt-1 text-sm text-text-subtle">{volunteer?.phone ?? "Chưa có số điện thoại"}</p>
            </div>
          </div>
          <span className="w-fit rounded-xl bg-surface-low px-4 py-2 text-sm font-bold text-primary">
            {volunteer?.accountStatus === "CHO_DUYET" ? "Chờ duyệt" : "Đang hoạt động"}
          </span>
        </div>
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {message && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <ProfileSection title="Thông tin liên hệ" description="Thông tin để điều phối viên xác nhận và liên lạc khi cần.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ tên" value={form.name} onChange={(value) => update("name", value)} onBlur={() => touchField("name")} error={fieldErrors.name} required />
            <Field label="Số điện thoại" value={form.phone} onChange={(value) => update("phone", value)} onBlur={() => touchField("phone")} error={fieldErrors.phone} required />
            <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} onBlur={() => touchField("email")} error={fieldErrors.email} />
            <Field label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} />
            <Select label="Giới tính" value={form.gender} onChange={(value) => update("gender", value)} options={["Nam", "Nữ", "Khác", "Không muốn nêu"]} />
          </div>
        </ProfileSection>

        <ProfileSection title="Địa bàn hoạt động" description="Khu vực bạn có thể hỗ trợ nhanh nhất.">
          <VietnamAddressFields
            province={form.city}
            ward={form.ward}
            address={form.address}
            onProvinceChange={(value) => update("city", value)}
            onWardChange={(value) => update("ward", value)}
            onAddressChange={(value) => update("address", value)}
          />
        </ProfileSection>

        <ProfileSection title="Khả năng tham gia" description="Giúp điều phối viên chọn nhiệm vụ phù hợp với bạn.">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">Kỹ năng</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${skills.includes(skill) ? "bg-primary text-white" : "bg-surface-low text-text-subtle"}`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Trạng thái sẵn sàng" value={form.status} onChange={(value) => update("status", value)} options={[{ label: "Sẵn sàng", value: "AVAILABLE" }, { label: "Đang nhiệm vụ", value: "ON_MISSION" }, { label: "Nghỉ", value: "RESTING" }]} />
            <Field label="Phương tiện có thể dùng" value={form.vehicleType} onChange={(value) => update("vehicleType", value)} />
            <Field label="Thời gian có thể tham gia" value={form.availability} onChange={(value) => update("availability", value)} />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">Kinh nghiệm liên quan</span>
            <textarea value={form.experience} onChange={(event) => update("experience", event.target.value)} rows={4} className="w-full rounded-xl border border-outline/30 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
          </label>
        </ProfileSection>

        <ProfileSection title="Liên hệ khẩn cấp" description="Người có thể liên lạc khi bạn đang tham gia nhiệm vụ.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Người liên hệ" value={form.emergencyContactName} onChange={(value) => update("emergencyContactName", value)} />
            <Field label="Số điện thoại" value={form.emergencyContactPhone} onChange={(value) => update("emergencyContactPhone", value)} onBlur={() => touchField("emergencyContactPhone")} error={fieldErrors.emergencyContactPhone} />
          </div>
        </ProfileSection>

        <ProfileSection title="Bảo mật" description="Chỉ nhập khi bạn muốn đổi mật khẩu.">
          <Field label="Mật khẩu mới" type="password" value={form.password} onChange={(value) => update("password", value)} />
        </ProfileSection>

        <div className="sticky bottom-4 rounded-2xl border border-outline/15 bg-white/95 p-3 shadow-ambient backdrop-blur">
          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-strong disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu hồ sơ
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-ambient">
      <div>
        <h2 className="text-base font-black text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-subtle">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, onBlur, type = "text", required = false, error }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; type?: string; required?: boolean; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{label}</span>
      <input aria-required={required} aria-invalid={Boolean(error)} type={type} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} className={`w-full rounded-xl border bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:ring-1 ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`} />
      {error && <span className="mt-1 block text-xs font-bold text-danger">{error}</span>}
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder = "Chọn" }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | { label: string; value: string }>; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-outline/30 bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20">
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
