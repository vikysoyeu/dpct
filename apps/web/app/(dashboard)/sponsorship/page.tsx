"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HandHeart, Loader2, Package, Plus, Send, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiClient } from "@/lib/api";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import type { ApiListResponse, Donor, DonorGoods, ItemCategory, Location, RescueRequest } from "@rescue/types";

type DonorMode = "EXISTING" | "NEW";

type RescueRequestOption = RescueRequest & {
  location?: Location | null;
};

type PublicDonor = Pick<Donor, "id" | "name" | "type" | "createdAt" | "updatedAt"> & {
  goods?: Array<DonorGoods & { itemCategory?: ItemCategory | null }>;
};

type GoodsLine = {
  id: string;
  itemCategoryId: string;
  quantity: string;
  description: string;
};

type SponsorshipErrors = Partial<Record<"donorId" | "name" | "phone" | "email" | "goods", string>>;

type NewDonorForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  notes: string;
};

const initialDonor: NewDonorForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  type: "",
  notes: "",
};

const initialGoods: GoodsLine[] = [{ id: "goods-1", itemCategoryId: "", quantity: "", description: "" }];

function requestStatusLabel(status: string) {
  if (status === "CHO_TIEP_NHAN") return "Chờ tiếp nhận";
  if (status === "DANG_THUC_HIEN") return "Đang thực hiện";
  if (status === "HOAN_THANH") return "Hoàn thành";
  if (status === "HUY_BO") return "Hủy bỏ";
  return status;
}

export default function SponsorshipPage() {
  const [donorMode, setDonorMode] = useState<DonorMode>("NEW");
  const [donors, setDonors] = useState<PublicDonor[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [requests, setRequests] = useState<RescueRequestOption[]>([]);
  const [donorId, setDonorId] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [newDonor, setNewDonor] = useState<NewDonorForm>(initialDonor);
  const [goods, setGoods] = useState<GoodsLine[]>(initialGoods);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SponsorshipErrors>({});

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setMessage(null);
      try {
        const [donorRes, categoryRes, requestRes] = await Promise.all([
          apiClient.get<ApiListResponse<PublicDonor>>("/donors"),
          apiClient.get<ApiListResponse<ItemCategory>>("/item-categories"),
          apiClient.get<ApiListResponse<RescueRequestOption>>("/rescue-requests?status=ALL"),
        ]);
        if (cancelled) return;
        setDonors(donorRes.data);
        setItemCategories(categoryRes.data);
        setRequests(requestRes.data);
        if (donorRes.data.length === 0) setDonorMode("NEW");
      } catch (error) {
        if (!cancelled) setMessage({ type: "error", text: error instanceof Error ? error.message : "Không tải được dữ liệu tài trợ." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryById = useMemo(() => new Map(itemCategories.map((item) => [item.id, item])), [itemCategories]);
  const selectedDonor = donorId ? donors.find((donor) => donor.id === donorId) : null;
  const selectedRequest = requestCode ? requests.find((request) => request.code === requestCode) ?? null : null;
  const validGoods = goods.filter((item) => item.itemCategoryId && Number(item.quantity) > 0);
  const canSubmit = !submitting;

  function updateDonor<K extends keyof NewDonorForm>(key: K, value: NewDonorForm[K]) {
    setNewDonor((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: validateField(key as keyof SponsorshipErrors, value) || undefined }));
    }
    setMessage(null);
  }

  function updateGoods(id: string, patch: Partial<Omit<GoodsLine, "id">>) {
    setGoods((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setFieldErrors((current) => ({ ...current, goods: undefined }));
    setMessage(null);
  }

  function addGoods() {
    setGoods((current) => [...current, { id: `goods-${Date.now()}`, itemCategoryId: "", quantity: "", description: "" }]);
    setMessage(null);
  }

  function removeGoods(id: string) {
    setGoods((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
    setMessage(null);
  }

  function switchMode(nextMode: DonorMode) {
    setDonorMode(nextMode);
    setFieldErrors({});
    setMessage(null);
  }

  async function submitSponsorship() {
    if (!validateForm()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post("/sponsorships", {
        donorMode,
        donorId: donorMode === "EXISTING" ? donorId : undefined,
        donorName: donorMode === "NEW" ? newDonor.name : undefined,
        donorPhone: donorMode === "NEW" ? newDonor.phone : undefined,
        donorEmail: donorMode === "NEW" ? newDonor.email : undefined,
        donorAddress: donorMode === "NEW" ? newDonor.address : undefined,
        donorType: donorMode === "NEW" ? newDonor.type : undefined,
        donorNotes: donorMode === "NEW" ? newDonor.notes : undefined,
        requestId: selectedRequest?.id || undefined,
        goods: validGoods.map((item) => ({
          itemCategoryId: item.itemCategoryId,
          quantity: Number(item.quantity),
          description: item.description,
        })),
      });
      setMessage({ type: "success", text: "Đã ghi nhận thông tin tài trợ hàng hóa." });
      setNewDonor(initialDonor);
      setGoods(initialGoods);
      setRequestCode("");
      if (donorMode === "NEW") setDonorId("");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không gửi được thông tin tài trợ." });
    } finally {
      setSubmitting(false);
    }
  }

  function validateField(key: keyof SponsorshipErrors, value: string) {
    const trimmed = value.trim();
    if (key === "donorId" && donorMode === "EXISTING" && !trimmed) return "Vui lòng chọn nhà tài trợ.";
    if (key === "name" && donorMode === "NEW" && !trimmed) return "Tên nhà tài trợ bắt buộc nhập.";
    if (key === "phone" && donorMode === "NEW" && trimmed && !isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    if (key === "email" && donorMode === "NEW" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    if (key === "goods" && validGoods.length === 0) return "Vui lòng nhập ít nhất một hàng hóa và số lượng hợp lệ.";
    return "";
  }

  function touchField(key: keyof SponsorshipErrors, value: string) {
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, value) || undefined }));
  }

  function validateForm() {
    const next: SponsorshipErrors = {
      donorId: validateField("donorId", donorId),
      name: validateField("name", newDonor.name),
      phone: validateField("phone", newDonor.phone),
      email: validateField("email", newDonor.email),
      goods: validateField("goods", ""),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as SponsorshipErrors;
    setFieldErrors(filtered);
    if (Object.keys(filtered).length > 0) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra thông tin tài trợ." });
      return false;
    }
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tài trợ"
        subtitle="Ghi nhận nhà tài trợ và hàng hóa hỗ trợ cho các yêu cầu cứu trợ."
        actions={[{ href: "/rescue-request", label: "Gửi yêu cầu", variant: "secondary" }]}
      />

      {message && (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5 rounded-2xl bg-surface-card p-5 shadow-ambient">
          <div className="flex flex-col gap-3 border-b border-outline/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Nhà tài trợ</h2>
              <p className="mt-1 text-sm text-text-subtle">
                {donorMode === "EXISTING" ? "Chọn nhà tài trợ đã có trong hệ thống." : "Tạo hồ sơ nhà tài trợ mới."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchMode(donorMode === "EXISTING" ? "NEW" : "EXISTING")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-black text-primary hover:bg-primary hover:text-white"
            >
              <HandHeart className="h-4 w-4" />
              {donorMode === "EXISTING" ? "Nhà tài trợ mới?" : "Đã có hồ sơ?"}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3 text-sm font-semibold text-text-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải dữ liệu...
            </div>
          ) : donorMode === "EXISTING" ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Nhà tài trợ cũ</span>
                <select
                  value={donorId}
                  onChange={(event) => { setDonorId(event.target.value); setFieldErrors((current) => ({ ...current, donorId: validateField("donorId", event.target.value) || undefined })); }}
                  onBlur={() => touchField("donorId", donorId)}
                  aria-required
                  aria-invalid={Boolean(fieldErrors.donorId)}
                  className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ${fieldErrors.donorId ? "border-danger focus:border-danger" : "border-outline/30 focus:border-primary"}`}
                >
                  <option value="">Chọn nhà tài trợ</option>
                  {donors.map((donor) => (
                    <option key={donor.id} value={donor.id}>{donor.name}</option>
                  ))}
                </select>
                {fieldErrors.donorId && <span className="mt-1 block text-xs font-bold text-danger">{fieldErrors.donorId}</span>}
              </label>
              <div className="rounded-xl bg-surface-low px-4 py-3 text-sm">
                <p className="font-black text-slate-950">{selectedDonor?.name ?? "Chưa chọn nhà tài trợ"}</p>
                <p className="mt-1 text-text-subtle">{selectedDonor ? selectedDonor.type || "Nhà tài trợ đã có trong hệ thống." : "Chọn một hồ sơ nhà tài trợ đã đăng ký."}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tên nhà tài trợ" value={newDonor.name} onChange={(value) => updateDonor("name", value)} onBlur={() => touchField("name", newDonor.name)} error={fieldErrors.name} required />
              <Field label="SĐT" value={newDonor.phone} onChange={(value) => updateDonor("phone", value)} onBlur={() => touchField("phone", newDonor.phone)} error={fieldErrors.phone} />
              <Field label="Email" type="email" value={newDonor.email} onChange={(value) => updateDonor("email", value)} onBlur={() => touchField("email", newDonor.email)} error={fieldErrors.email} />
              <Field label="Địa chỉ" value={newDonor.address} onChange={(value) => updateDonor("address", value)} />
              <Field label="Loại nhà tài trợ" value={newDonor.type} onChange={(value) => updateDonor("type", value)} placeholder="Ví dụ: Doanh nghiệp, tổ chức, cá nhân..." />
              <Field label="Ghi chú" value={newDonor.notes} onChange={(value) => updateDonor("notes", value)} />
            </div>
          )}

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Yêu cầu cứu trợ muốn tài trợ</span>
            <select
              value={requestCode}
              onChange={(event) => setRequestCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-primary"
            >
              <option value="">Không chỉ định yêu cầu cụ thể</option>
              {requests.map((request) => (
                <option key={request.code ?? request.id} value={request.code ?? ""}>
                  {rescueRequestDisplayName(request)} - {request.location?.name ?? "Chưa rõ địa điểm"} - {requestStatusLabel(request.status)}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Hàng hóa tài trợ</span>
              <button type="button" onClick={addGoods} className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-3 py-2 text-xs font-black text-primary hover:bg-primary/10">
                <Plus className="h-4 w-4" />
                Thêm hàng hóa
              </button>
            </div>

            <div className="space-y-3">
              {goods.map((item, index) => {
                const category = categoryById.get(item.itemCategoryId);
                return (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-outline/25 bg-white p-3 lg:grid-cols-[minmax(0,1.1fr)_130px_minmax(0,1.4fr)_40px]">
                    <label className="block">
                      <span className="text-xs font-bold text-text-subtle">Loại hàng {index + 1}</span>
                      <select
                        value={item.itemCategoryId}
                        onChange={(event) => updateGoods(item.id, { itemCategoryId: event.target.value })}
                        className="mt-2 w-full rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-primary"
                      >
                        <option value="">Chọn hàng hóa</option>
                        {itemCategories.map((categoryItem) => (
                          <option key={categoryItem.id} value={categoryItem.id}>
                            {categoryItem.name} ({categoryItem.unit})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-text-subtle">Số lượng{category ? ` (${category.unit})` : ""}</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateGoods(item.id, { quantity: event.target.value })}
                        className="mt-2 w-full rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-text-subtle">Mô tả</span>
                      <textarea
                        value={item.description}
                        onChange={(event) => updateGoods(item.id, { description: event.target.value })}
                        rows={2}
                        placeholder="Ví dụ: nước đóng chai 500ml, còn hạn 12 tháng..."
                        className="mt-2 w-full resize-none rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeGoods(item.id)}
                      disabled={goods.length === 1}
                      className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-subtle hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Xóa hàng hóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            {fieldErrors.goods && <p className="text-xs font-bold text-danger">{fieldErrors.goods}</p>}
          </div>

          <div className="flex justify-end border-t border-outline/20 pt-4">
            <button
              type="button"
              onClick={submitSponsorship}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi tài trợ
            </button>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl bg-surface-card p-4 shadow-ambient">
            <h2 className="text-sm font-black text-slate-950">Thông tin sẽ ghi nhận</h2>
            <div className="mt-3 space-y-2 text-sm text-text-subtle">
              <Info label="Nhà tài trợ" value={donorMode === "EXISTING" ? selectedDonor?.name ?? "-" : newDonor.name || "-"} />
              <Info label="Yêu cầu" value={selectedRequest ? rescueRequestDisplayName(selectedRequest) : "Không chỉ định"} />
              <Info label="Số loại hàng" value={String(validGoods.length)} />
            </div>
          </section>

          <section className="rounded-2xl bg-surface-card p-4 shadow-ambient">
            <h2 className="text-sm font-black text-slate-950">Danh sách hàng hóa</h2>
            <div className="mt-3 space-y-2">
              {validGoods.length === 0 ? (
                <p className="text-sm text-text-subtle">Chưa có hàng hóa hợp lệ.</p>
              ) : (
                validGoods.map((item) => {
                  const category = categoryById.get(item.itemCategoryId);
                  return (
                    <div key={item.id} className="rounded-xl bg-surface-low px-3 py-2 text-sm">
                      <p className="font-black text-slate-950">{category?.name ?? "Hàng hóa"}</p>
                      <p className="text-text-subtle">{item.quantity} {category?.unit ?? ""}{item.description ? ` - ${item.description}` : ""}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Nhà tài trợ</h2>
              <p className="mt-1 text-sm text-text-subtle">Danh sách công khai, không hiển thị thông tin liên hệ cá nhân.</p>
            </div>
            <span className="rounded-full bg-surface-low px-3 py-1 text-xs font-black text-primary">{donors.length}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {loading ? (
              <div className="flex items-center gap-2 rounded-xl bg-surface-low p-4 text-sm font-semibold text-text-subtle sm:col-span-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải nhà tài trợ...
              </div>
            ) : donors.length === 0 ? (
              <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle sm:col-span-2">Chưa có nhà tài trợ công khai.</p>
            ) : (
              donors.slice(0, 8).map((donor) => (
                <article key={donor.id} className="rounded-xl bg-surface-low p-4">
                  <p className="font-black text-text-main">{donor.name}</p>
                  <p className="mt-1 text-sm text-text-subtle">{donor.type || "Nhà tài trợ"} · {donor.goods?.length ?? 0} nhóm hàng</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Yêu cầu tài trợ</h2>
              <p className="mt-1 text-sm text-text-subtle">Các hàng hóa tài trợ đang được ghi nhận trong hệ thống.</p>
            </div>
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {donors.flatMap((donor) => (donor.goods ?? []).map((goods) => ({ donor, goods }))).slice(0, 8).map(({ donor, goods }) => (
              <article key={`${donor.id}-${goods.itemCategoryId}`} className="grid gap-2 rounded-xl bg-surface-low p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="font-bold text-text-main">{goods.itemCategory?.name ?? "Hàng hóa tài trợ"}</p>
                  <p className="mt-1 text-xs text-text-subtle">{donor.name} · {goods.status}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-primary">{goods.quantity} {goods.unit}</span>
              </article>
            ))}
            {!loading && donors.flatMap((donor) => donor.goods ?? []).length === 0 && (
              <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">Chưa có yêu cầu tài trợ hàng hóa.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, onBlur, type = "text", required = false, placeholder, error }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-required={required}
        aria-invalid={Boolean(error)}
        className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ${error ? "border-danger focus:border-danger" : "border-outline/30 focus:border-primary"}`}
      />
      {error && <span className="mt-1 block text-xs font-bold text-danger">{error}</span>}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="min-w-0 text-right text-slate-900">{value}</span>
    </div>
  );
}
