"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Copy, HeartHandshake, Loader2, UserRound } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useDonors } from "@/hooks/useDonors";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import type { FundTransaction } from "@rescue/types";

type DonorKind = "INDIVIDUAL" | "DONOR";
type DonateErrors = Partial<Record<"donorId" | "donorName" | "donorPhone" | "donorEmail" | "amount", string>>;

type DonationResponse = {
  data: FundTransaction;
  payment: {
    qrUrl: string;
    code: string;
    accountNumber: string;
    bank: string;
    accountName: string;
  };
};

const amounts = [100000, 200000, 500000, 1000000];

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

export default function DonatePage() {
  const router = useRouter();
  const { donors, loading: loadingDonors } = useDonors();
  const [donorKind, setDonorKind] = useState<DonorKind>("INDIVIDUAL");
  const [donorId, setDonorId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState(200000);
  const [customAmount, setCustomAmount] = useState("");
  const [payment, setPayment] = useState<DonationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DonateErrors>({});

  const selectedAmount = useMemo(() => {
    const manual = Number(customAmount);
    return customAmount ? manual : amount;
  }, [amount, customAmount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<DonationResponse>("/fund/donations", {
        donorKind,
        donorId: donorKind === "DONOR" ? donorId : undefined,
        donorName: donorKind === "INDIVIDUAL" ? donorName : undefined,
        donorPhone: donorKind === "INDIVIDUAL" ? donorPhone : undefined,
        donorEmail: donorKind === "INDIVIDUAL" ? donorEmail : undefined,
        amount: selectedAmount,
      });
      setPayment(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo giao dịch quyên góp");
    } finally {
      setSubmitting(false);
    }
  }

  function validateField(name: keyof DonateErrors, value: string) {
    const trimmed = value.trim();
    if (name === "donorId" && donorKind === "DONOR" && !trimmed) return "Vui lòng chọn nhà tài trợ.";
    if (name === "donorName" && donorKind === "INDIVIDUAL" && !trimmed) return "Họ tên bắt buộc nhập.";
    if (name === "donorPhone" && donorKind === "INDIVIDUAL") {
      if (!trimmed) return "Số điện thoại bắt buộc nhập.";
      if (!isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    }
    if (name === "donorEmail" && donorKind === "INDIVIDUAL" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    if (name === "amount" && (!Number(value) || Number(value) <= 0)) return "Số tiền quyên góp phải lớn hơn 0.";
    return "";
  }

  function validateForm() {
    const next: DonateErrors = {
      donorId: validateField("donorId", donorId),
      donorName: validateField("donorName", donorName),
      donorPhone: validateField("donorPhone", donorPhone),
      donorEmail: validateField("donorEmail", donorEmail),
      amount: validateField("amount", String(selectedAmount)),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as DonateErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function setFieldValue(name: keyof DonateErrors, value: string) {
    if (name === "donorId") setDonorId(value);
    if (name === "donorName") setDonorName(value);
    if (name === "donorPhone") setDonorPhone(value);
    if (name === "donorEmail") setDonorEmail(value);
    if (name === "amount") setCustomAmount(value.replace(/\D/g, ""));
    if (fieldErrors[name]) {
      const cleanedAmount = value.replace(/\D/g, "");
      setFieldErrors((current) => ({ ...current, [name]: validateField(name, name === "amount" ? (cleanedAmount || String(amount)) : value) || undefined }));
    }
  }

  function touchField(name: keyof DonateErrors, value: string) {
    setFieldErrors((current) => ({ ...current, [name]: validateField(name, value) || undefined }));
  }

  useEffect(() => {
    if (!payment) return;

    const timer = window.setInterval(async () => {
      const res = await apiClient.get<{ data: FundTransaction }>(`/fund/transactions/${payment.data.id}`);
      if (res.data.status === "THANH_CONG") {
        window.clearInterval(timer);
        router.replace(`/donate/success/${payment.data.id}`);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [payment, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-outline/30 bg-surface-card p-6 shadow-ambient lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Quỹ cứu trợ DPCT</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Quyên góp cho hoạt động cứu trợ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Khoản đóng góp của bạn sẽ được ghi nhận tự động và chuyển vào quỹ hỗ trợ người dân cần cứu trợ.
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
          Giới hạn mỗi giao dịch: {formatCurrency(499000000)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl border border-outline/30 bg-surface-card p-6 shadow-ambient">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setDonorKind("INDIVIDUAL"); setFieldErrors({}); }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${donorKind === "INDIVIDUAL" ? "border-primary/40 bg-primary/10 text-primary" : "border-outline/30 text-text-subtle hover:border-primary/30 hover:bg-surface-high"}`}
            >
              <UserRound className="h-5 w-5" />
              <span className="font-bold">Cá nhân</span>
            </button>
            <button
              type="button"
              onClick={() => { setDonorKind("DONOR"); setFieldErrors({}); }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${donorKind === "DONOR" ? "border-primary/40 bg-primary/10 text-primary" : "border-outline/30 text-text-subtle hover:border-primary/30 hover:bg-surface-high"}`}
            >
              <Building2 className="h-5 w-5" />
              <span className="font-bold">Nhà tài trợ</span>
            </button>
          </div>

          {donorKind === "DONOR" ? (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Chọn nhà tài trợ</span>
              <select
                value={donorId}
                onChange={(event) => setFieldValue("donorId", event.target.value)}
                onBlur={() => touchField("donorId", donorId)}
                aria-required
                aria-invalid={Boolean(fieldErrors.donorId)}
                className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.donorId ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`}
              >
                <option value="">{loadingDonors ? "Đang tải..." : "Chọn đơn vị đã đăng ký"}</option>
                {donors.map((donor) => (
                  <option key={donor.id} value={donor.id}>
                    {donor.name}
                  </option>
                ))}
              </select>
              {fieldErrors.donorId && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.donorId}</span>}
            </label>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Họ tên</span>
                <input value={donorName} onChange={(event) => setFieldValue("donorName", event.target.value)} onBlur={() => touchField("donorName", donorName)} aria-required aria-invalid={Boolean(fieldErrors.donorName)} className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.donorName ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`} />
                {fieldErrors.donorName && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.donorName}</span>}
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Số điện thoại</span>
                <input value={donorPhone} onChange={(event) => setFieldValue("donorPhone", event.target.value)} onBlur={() => touchField("donorPhone", donorPhone)} aria-required aria-invalid={Boolean(fieldErrors.donorPhone)} className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.donorPhone ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`} />
                {fieldErrors.donorPhone && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.donorPhone}</span>}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input type="email" value={donorEmail} onChange={(event) => setFieldValue("donorEmail", event.target.value)} onBlur={() => touchField("donorEmail", donorEmail)} aria-invalid={Boolean(fieldErrors.donorEmail)} className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.donorEmail ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`} />
                {fieldErrors.donorEmail && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.donorEmail}</span>}
              </label>
            </div>
          )}

          <div>
            <span className="text-sm font-bold text-slate-700">Số tiền quyên góp</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {amounts.map((option) => (
                <button key={option} type="button" onClick={() => { setAmount(option); setCustomAmount(""); setFieldErrors((current) => ({ ...current, amount: undefined })); }} className={`rounded-xl border px-3 py-3 text-sm font-bold ${!customAmount && amount === option ? "border-primary/40 bg-primary/10 text-primary" : "border-outline/30 text-text-subtle hover:bg-surface-high"}`}>
                  {formatCurrency(option)}
                </button>
              ))}
            </div>
            <input inputMode="numeric" value={customAmount} onChange={(event) => setFieldValue("amount", event.target.value)} onBlur={() => touchField("amount", String(selectedAmount))} placeholder="Hoặc nhập số tiền khác" aria-invalid={Boolean(fieldErrors.amount)} className={`mt-3 w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 ${fieldErrors.amount ? "border-danger focus:border-danger focus:ring-danger/20" : "border-outline/30 focus:border-primary/40 focus:ring-primary/20"}`} />
            {fieldErrors.amount && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.amount}</span>}
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-strong px-5 py-3 text-sm font-black text-white shadow-ambient disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
            Tạo mã QR quyên góp
          </button>
        </form>

        <div className="rounded-2xl border border-outline/30 bg-surface-card p-6 shadow-ambient">
          {payment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <CheckCircle2 className="h-5 w-5" />
                Đang chờ chuyển khoản
              </div>
              <img src={payment.payment.qrUrl} alt="Mã QR chuyển khoản quyên góp" className="mx-auto aspect-square w-full max-w-[320px] rounded-xl border border-slate-200 object-contain" />
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Ngân hàng</span><strong>{payment.payment.bank}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Số tài khoản</span><strong>{payment.payment.accountNumber}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Chủ tài khoản</span><strong>{payment.payment.accountName}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Số tiền</span><strong>{formatCurrency(payment.data.amount)}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Nội dung</span><strong>{payment.payment.code}</strong></div>
              </div>
              <button type="button" onClick={() => navigator.clipboard?.writeText(payment.payment.code)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-high px-4 py-3 text-sm font-bold text-primary">
                <Copy className="h-4 w-4" />
                Sao chép nội dung chuyển khoản
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">Sau khi giao dịch được ghi nhận, trang sẽ tự chuyển sang màn hình cảm ơn.</p>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-outline/40 bg-surface px-6 text-center">
              <HeartHandshake className="h-12 w-12 text-primary" />
              <h2 className="mt-4 text-xl font-black text-slate-900">Mã chuyển khoản sẽ hiển thị tại đây</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Hoàn tất thông tin bên trái để nhận mã chuyển khoản dành riêng cho khoản đóng góp này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
