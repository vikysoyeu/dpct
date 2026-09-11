"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Pencil, Plus, RefreshCw, Save, Trash2, WalletCards, X } from "lucide-react";
import { useFundOverview, useFundTransactions, type FundTransactionInput } from "@/hooks/useFund";
import { TransactionMethod, TransactionStatus, TransactionType, type FundTransaction } from "@rescue/types";
import { isValidEmail, isValidPhone } from "@/lib/validation";

type FundFormState = {
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  type: FundTransaction["type"];
  method: FundTransaction["method"];
  amount: string;
  transactedAt: string;
  content: string;
  status: FundTransaction["status"];
  notes: string;
  sepayId: string;
};
type FundErrors = Partial<Record<"donorPhone" | "donorEmail" | "amount" | "transactedAt", string>>;

const emptyForm: FundFormState = {
  donorName: "",
  donorPhone: "",
  donorEmail: "",
  type: TransactionType.THU,
  method: TransactionMethod.CASH,
  amount: "",
  transactedAt: toDatetimeLocal(new Date().toISOString()),
  content: "",
  status: TransactionStatus.THANH_CONG,
  notes: "",
  sepayId: "",
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toInput(transaction: FundTransaction): FundFormState {
  return {
    donorName: transaction.donorName ?? "",
    donorPhone: transaction.donorPhone ?? "",
    donorEmail: transaction.donorEmail ?? "",
    type: transaction.type,
    method: transaction.method ?? "BANK_TRANSFER",
    amount: transaction.amount,
    transactedAt: toDatetimeLocal(transaction.transactedAt),
    content: transaction.content ?? "",
    status: transaction.status,
    notes: transaction.notes ?? "",
    sepayId: transaction.sepayId ?? "",
  };
}

function toPayload(form: FundFormState): FundTransactionInput {
  return {
    donorName: form.donorName || null,
    donorPhone: form.donorPhone || null,
    donorEmail: form.donorEmail || null,
    type: form.type,
    method: form.method,
    amount: Number(form.amount),
    transactedAt: new Date(form.transactedAt).toISOString(),
    content: form.content || null,
    status: form.status,
    notes: form.notes || null,
    sepayId: form.sepayId || null,
  };
}

function statusLabel(status: FundTransaction["status"]) {
  if (status === "THANH_CONG") return "Thành công";
  if (status === "CHO_DOI_SOAT") return "Chờ đối soát";
  return "Thất bại";
}

function methodLabel(method: FundTransaction["method"]) {
  if (method === "CASH") return "Tiền mặt";
  return "Chuyển khoản";
}

export default function AdminFundPage() {
  const { overview, loading, error, refetch } = useFundOverview();
  const { createTransaction, updateTransaction, deleteTransaction } = useFundTransactions();
  const [form, setForm] = useState<FundFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FundErrors>({});
  const transactions = overview?.transactions ?? [];

  const isValid = useMemo(() => Number.isInteger(Number(form.amount)) && Number(form.amount) > 0 && Boolean(form.transactedAt), [form.amount, form.transactedAt]);

  async function saveTransaction() {
    if (!validateForm()) {
      setFormError("Vui lòng nhập số tiền hợp lệ và thời gian giao dịch.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateTransaction(editingId, toPayload(form));
      } else {
        await createTransaction(toPayload(form));
      }
      setEditingId(null);
      setComposerOpen(false);
      setForm({ ...emptyForm, transactedAt: toDatetimeLocal(new Date().toISOString()) });
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể lưu giao dịch.");
    } finally {
      setSubmitting(false);
    }
  }

  function validateField(name: keyof FundErrors, value: string) {
    const trimmed = value.trim();
    if (name === "amount" && (!Number.isInteger(Number(trimmed)) || Number(trimmed) <= 0)) return "Số tiền phải là số nguyên lớn hơn 0.";
    if (name === "transactedAt" && !trimmed) return "Thời gian giao dịch bắt buộc nhập.";
    if (name === "donorPhone" && trimmed && !isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    if (name === "donorEmail" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    return "";
  }

  function validateForm() {
    const next: FundErrors = {
      donorPhone: validateField("donorPhone", form.donorPhone),
      donorEmail: validateField("donorEmail", form.donorEmail),
      amount: validateField("amount", form.amount),
      transactedAt: validateField("transactedAt", form.transactedAt),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as FundErrors;
    setFieldErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function updateField<K extends keyof FundFormState>(key: K, value: FundFormState[K]) {
    setForm({ ...form, [key]: value });
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: validateField(key as keyof FundErrors, String(value)) || undefined }));
    }
  }

  async function removeTransaction(transaction: FundTransaction) {
    if (!window.confirm(`Xóa giao dịch "${transaction.content ?? transaction.id.slice(0, 8)}"?`)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await deleteTransaction(transaction.id);
      if (editingId === transaction.id) {
        setEditingId(null);
        setComposerOpen(false);
        setForm({ ...emptyForm, transactedAt: toDatetimeLocal(new Date().toISOString()) });
      }
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể xóa giao dịch.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-800">Quản trị tài chính</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Quản lý Quỹ</h1>
          <p className="mt-2 text-sm text-slate-500">Theo dõi dòng tiền vào, tiền ra, tiền mặt và chuyển khoản.</p>
        </div>
        <button type="button" onClick={refetch} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-sm font-black text-white">
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {(error || formError) && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError ?? error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Số tiền hiện tại" value={loading ? "..." : formatCurrency(overview?.balance ?? "0")} icon={<WalletCards className="h-5 w-5 text-blue-800" />} />
        <StatCard label="Tổng tiền vào" value={loading ? "..." : formatCurrency(overview?.totalIn ?? "0")} valueClassName="text-emerald-700" icon={<ArrowDownLeft className="h-5 w-5 text-emerald-700" />} />
        <StatCard label="Tổng tiền ra" value={loading ? "..." : formatCurrency(overview?.totalOut ?? "0")} valueClassName="text-rose-700" icon={<ArrowUpRight className="h-5 w-5 text-rose-700" />} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!composerOpen ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ ...emptyForm, transactedAt: toDatetimeLocal(new Date().toISOString()) });
              setComposerOpen(true);
            }}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-black text-slate-900">Thêm giao dịch thủ công</div>
                <div className="text-xs font-medium text-slate-500">Bấm để mở form nhập giao dịch tiền mặt hoặc chuyển khoản</div>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Mở form
            </span>
          </button>
        ) : (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {editingId ? <Pencil className="h-5 w-5 text-blue-800" /> : <Plus className="h-5 w-5 text-blue-800" />}
                <h2 className="font-black text-slate-900">{editingId ? "Cập nhật giao dịch" : "Thêm giao dịch thủ công"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  if (!editingId) {
                    setForm({ ...emptyForm, transactedAt: toDatetimeLocal(new Date().toISOString()) });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Người giao dịch" value={form.donorName} onChange={(event) => setForm({ ...form, donorName: event.target.value })} />
                  <label><input className={`w-full rounded-xl border px-3 py-2 text-sm ${fieldErrors.donorPhone ? "border-red-500" : "border-slate-200"}`} placeholder="SĐT" value={form.donorPhone} onChange={(event) => updateField("donorPhone", event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, donorPhone: validateField("donorPhone", form.donorPhone) || undefined }))} />{fieldErrors.donorPhone && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.donorPhone}</span>}</label>
                  <label><input className={`w-full rounded-xl border px-3 py-2 text-sm ${fieldErrors.donorEmail ? "border-red-500" : "border-slate-200"}`} placeholder="Email" value={form.donorEmail} onChange={(event) => updateField("donorEmail", event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, donorEmail: validateField("donorEmail", form.donorEmail) || undefined }))} />{fieldErrors.donorEmail && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.donorEmail}</span>}</label>
                  <label><input className={`w-full rounded-xl border px-3 py-2 text-sm ${fieldErrors.amount ? "border-red-500" : "border-slate-200"}`} type="number" min="1" placeholder="Số tiền" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, amount: validateField("amount", form.amount) || undefined }))} />{fieldErrors.amount && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.amount}</span>}</label>
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FundTransaction["type"] })}>
                    <option value="THU">Tiền vào</option>
                    <option value="CHI">Tiền ra</option>
                  </select>
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as FundTransaction["method"] })}>
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                  </select>
                  <label><input className={`w-full rounded-xl border px-3 py-2 text-sm ${fieldErrors.transactedAt ? "border-red-500" : "border-slate-200"}`} type="datetime-local" value={form.transactedAt} onChange={(event) => updateField("transactedAt", event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, transactedAt: validateField("transactedAt", form.transactedAt) || undefined }))} />{fieldErrors.transactedAt && <span className="mt-1 block text-xs font-bold text-red-600">{fieldErrors.transactedAt}</span>}</label>
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FundTransaction["status"] })}>
                    <option value="THANH_CONG">Thành công</option>
                    <option value="CHO_DOI_SOAT">Chờ đối soát</option>
                    <option value="THAT_BAI">Thất bại</option>
                  </select>
                </div>
                <textarea className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nội dung" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
                <textarea className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Ghi chú" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Mã SePay nếu có" value={form.sepayId} onChange={(event) => setForm({ ...form, sepayId: event.target.value })} />
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
                  <div className="font-black text-slate-900">Gợi ý nhập nhanh</div>
                  <p className="mt-1 leading-6">
                    Dùng `Tiền mặt` cho giao dịch ghi nhận thủ công tại hiện trường, `Chuyển khoản` cho giao dịch ngân hàng hoặc đối soát SePay.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" disabled={submitting} onClick={saveTransaction} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {editingId ? "Lưu cập nhật" : "Thêm giao dịch"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setEditingId(null);
                        setComposerOpen(false);
                        setForm({ ...emptyForm, transactedAt: toDatetimeLocal(new Date().toISOString()) });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                    >
                      <X className="h-4 w-4" />
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Landmark className="h-5 w-5 text-blue-800" />
          <h2 className="font-black text-slate-900">Giao dịch quỹ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Mã</th>
                <th className="px-5 py-3">Người giao dịch</th>
                <th className="px-5 py-3">Loại</th>
                <th className="px-5 py-3">Phương thức</th>
                <th className="px-5 py-3">Số tiền</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">SePay</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center font-semibold text-slate-500">
                    {loading ? "Đang tải giao dịch..." : "Chưa có giao dịch quỹ."}
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">{transaction.content ?? transaction.id.slice(0, 8)}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{transaction.donorName ?? "Nhà tài trợ"}</div>
                      <div className="text-xs text-slate-500">{transaction.donorPhone ?? transaction.donorEmail ?? ""}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={transaction.type === "THU" ? "font-black text-emerald-700" : "font-black text-rose-700"}>
                        {transaction.type === "THU" ? "Tiền vào" : "Tiền ra"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{methodLabel(transaction.method ?? "BANK_TRANSFER")}</td>
                    <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(transaction.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${transaction.status === "THANH_CONG" ? "bg-emerald-50 text-emerald-700" : transaction.status === "CHO_DOI_SOAT" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                        {statusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{transaction.sepayId ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(transaction.transactedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setEditingId(transaction.id);
                            setForm(toInput(transaction));
                            setComposerOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
                          title="Cập nhật giao dịch"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={submitting} onClick={() => removeTransaction(transaction)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50" title="Xóa giao dịch">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, valueClassName = "text-slate-950" }: { label: string; value: string; icon: ReactNode; valueClassName?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        {icon}
      </div>
      <p className={`mt-4 text-2xl font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}
