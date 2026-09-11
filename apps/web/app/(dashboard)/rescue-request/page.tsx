"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  LocateFixed,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { VietnamAddressFields } from "@/components/address/VietnamAddressFields";
import { PageHeader } from "@/components/layout/page-header";
import { apiClient } from "@/lib/api";
import { requestBrowserLocation } from "@/lib/map-utils";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import type { ApiListResponse, ItemCategory, Location, RescueRequest } from "@rescue/types";

const MapView = dynamic(
  () => import("../../../components/map/MapView").then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl bg-surface-low">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  },
);

type FormState = {
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  requesterTitle: string;
  province: string;
  ward: string;
  address: string;
};

type RescueNeed = {
  id: string;
  itemCategoryId: string;
  quantity: string;
  description: string;
};

type RequestFieldErrors = Partial<Record<"requesterName" | "requesterPhone" | "requesterEmail" | "requesterTitle", string>>;

const OTHER_CATEGORY_ID = "__OTHER__";

const initialForm: FormState = {
  requesterName: "",
  requesterPhone: "",
  requesterEmail: "",
  requesterTitle: "",
  province: "",
  ward: "",
  address: "",
};

const initialNeeds: RescueNeed[] = [{ id: "need-1", itemCategoryId: "", quantity: "", description: "" }];

export default function GuiYeuCauPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [needs, setNeeds] = useState<RescueNeed[]>(initialNeeds);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [confirmedPoint, setConfirmedPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [precisePoint, setPrecisePoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [placingPrecisePoint, setPlacingPrecisePoint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RequestFieldErrors>({});
  const [successRequest, setSuccessRequest] = useState<RescueRequest | null>(null);
  const selectedPoint = precisePoint ?? confirmedPoint;

  useEffect(() => {
    let alive = true;
    apiClient.get<ApiListResponse<ItemCategory>>("/item-categories")
      .then((res) => {
        if (alive) setItemCategories(res.data);
      })
      .catch(() => {
        if (alive) setItemCategories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const categoryById = useMemo(() => new Map(itemCategories.map((item) => [item.id, item])), [itemCategories]);

  const draftLocations = useMemo<Location[]>(() => {
    if (!selectedPoint) return [];
    const needTypes = needs.map((need) => categoryById.get(need.itemCategoryId)?.groupName || categoryById.get(need.itemCategoryId)?.name || (need.itemCategoryId === OTHER_CATEGORY_ID ? "Khác" : ""));
    const hasUrgentNeed = needTypes.some((type) => type.includes("Y tế") || type.includes("cứu hộ"));

    return [
      {
        id: "draft-rescue-request",
        type: hasUrgentNeed ? "URGENT_NEED" : needTypes.some((type) => type.includes("Thực phẩm")) ? "FOOD_SUPPORT" : "NEED_POINT",
        status: "PENDING",
        name: form.address || confirmedPoint?.label || "Vị trí cần cứu trợ",
        description: form.address || confirmedPoint?.label || "Vị trí cần cứu trợ",
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
        urgency: hasUrgentNeed ? 5 : 4,
        imageUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Location,
    ];
  }, [categoryById, confirmedPoint?.label, form.address, needs, precisePoint, selectedPoint]);

  const requestItems = useMemo(
    () => needs
      .filter((need) => need.itemCategoryId && need.itemCategoryId !== OTHER_CATEGORY_ID && Number(need.quantity) > 0)
      .map((need) => ({ itemCategoryId: need.itemCategoryId, quantity: Number(need.quantity) })),
    [needs],
  );

  const otherNotes = useMemo(
    () => needs
      .filter((need) => need.itemCategoryId === OTHER_CATEGORY_ID && need.description.trim() && Number(need.quantity) > 0)
      .map((need) => `- Khác: ${need.description.trim()} - ${Number(need.quantity)}`)
      .join("\n"),
    [needs],
  );

  const needTypeSummary = useMemo(
    () => needs
      .map((need) => categoryById.get(need.itemCategoryId)?.name ?? (need.itemCategoryId === OTHER_CATEGORY_ID ? "Khác" : ""))
      .filter(Boolean)
      .join(", "),
    [categoryById, needs],
  );

  const canSubmit = !submitting;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: validateField(key as keyof RequestFieldErrors, value) || undefined }));
    }
    setMessage(null);
  }

  function updateNeed(id: string, patch: Partial<Omit<RescueNeed, "id">>) {
    setNeeds((current) => current.map((need) => need.id === id ? { ...need, ...patch } : need));
    setMessage(null);
  }

  function addNeed() {
    setNeeds((current) => [
      ...current,
      { id: `need-${Date.now()}`, itemCategoryId: "", quantity: "", description: "" },
    ]);
    setMessage(null);
  }

  function removeNeed(id: string) {
    setNeeds((current) => current.length === 1 ? current : current.filter((need) => need.id !== id));
    setMessage(null);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setMessage(null);
    try {
      const location = await requestBrowserLocation();
      const label = "Vị trí hiện tại của cán bộ";
      setConfirmedPoint({ lat: location.lat, lng: location.lng, label });
      setPrecisePoint(null);
    } catch {
      setMessage({ type: "error", text: "Không lấy được vị trí hiện tại. Hãy kiểm tra quyền định vị của trình duyệt." });
    } finally {
      setLocating(false);
    }
  }

  function handleMapClick(lat: number, lng: number) {
    if (!placingPrecisePoint) return;
    setPrecisePoint({ lat, lng });
    setPlacingPrecisePoint(false);
  }

  async function submitRequest() {
    if (!validateForm()) return;
    if (!selectedPoint) return;
    setSubmitting(true);
    setMessage(null);
    const resolvedAddress =
      form.address.trim() ||
      [form.ward.trim(), form.province.trim()].filter(Boolean).join(", ") ||
      `Tọa độ ${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`;

    try {
      const response = await apiClient.post<{ data: RescueRequest }>("/rescue-requests", {
        ...form,
        address: resolvedAddress,
        needType: needTypeSummary || "Khác",
        content: otherNotes,
        items: requestItems,
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
        preciseLat: precisePoint?.lat,
        preciseLng: precisePoint?.lng,
      });
      setSuccessRequest(response.data);
      setMessage({ type: "success", text: "Đã gửi yêu cầu cứu trợ. Trạng thái hiện tại: Chờ tiếp nhận." });
      setForm(initialForm);
      setNeeds(initialNeeds);
      setConfirmedPoint(null);
      setPrecisePoint(null);
      setPlacingPrecisePoint(false);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không gửi được yêu cầu cứu trợ." });
    } finally {
      setSubmitting(false);
    }
  }

  function validateField(key: keyof RequestFieldErrors, value: string) {
    const trimmed = value.trim();
    if (key === "requesterName" && !trimmed) return "Họ tên bắt buộc nhập.";
    if (key === "requesterTitle" && !trimmed) return "Chức vụ bắt buộc nhập.";
    if (key === "requesterPhone") {
      if (!trimmed) return "Số điện thoại bắt buộc nhập.";
      if (!isValidPhone(trimmed)) return "Số điện thoại không hợp lệ.";
    }
    if (key === "requesterEmail" && trimmed && !isValidEmail(trimmed)) return "Email không hợp lệ.";
    return "";
  }

  function touchField(key: keyof RequestFieldErrors) {
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, form[key]) || undefined }));
  }

  function validateForm() {
    const next: RequestFieldErrors = {
      requesterName: validateField("requesterName", form.requesterName),
      requesterPhone: validateField("requesterPhone", form.requesterPhone),
      requesterEmail: validateField("requesterEmail", form.requesterEmail),
      requesterTitle: validateField("requesterTitle", form.requesterTitle),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as RequestFieldErrors;
    setFieldErrors(filtered);
    if (Object.keys(filtered).length > 0) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra các trường thông tin liên hệ." });
      return false;
    }
    if (!(requestItems.length > 0 || otherNotes)) {
      setMessage({ type: "error", text: "Vui lòng nhập ít nhất một nhu cầu cứu trợ và số lượng hợp lệ." });
      return false;
    }
    if (!selectedPoint) {
      setMessage({ type: "error", text: "Vui lòng xác nhận vị trí cần cứu trợ." });
      return false;
    }
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gửi yêu cầu cứu trợ"
        subtitle="Dành cho cán bộ địa phương ghi nhận khu vực cần hỗ trợ."
        actions={[{ href: "/map", label: "Xem bản đồ", variant: "secondary" }]}
      />

      {successRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Gửi yêu cầu thành công</h2>
            <p className="mt-3 break-words rounded-xl bg-surface-low px-4 py-3 text-sm font-black text-primary">
              {rescueRequestDisplayName(successRequest)}
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-text-subtle">
              Đã gửi email xác nhận đến email đã cung cấp. Vui lòng lưu lại ID yêu cầu để tra cứu và trao đổi với ban điều phối.
            </p>
            <button
              type="button"
              onClick={() => setSuccessRequest(null)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-strong"
            >
              Đã hiểu
            </button>
          </section>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="space-y-5 rounded-2xl bg-surface-card p-5 shadow-ambient">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Họ tên" value={form.requesterName} onChange={(value) => update("requesterName", value)} onBlur={() => touchField("requesterName")} error={fieldErrors.requesterName} required />
            <Field label="SĐT" value={form.requesterPhone} onChange={(value) => update("requesterPhone", value)} onBlur={() => touchField("requesterPhone")} error={fieldErrors.requesterPhone} required />
            <Field label="Email" type="email" value={form.requesterEmail} onChange={(value) => update("requesterEmail", value)} onBlur={() => touchField("requesterEmail")} error={fieldErrors.requesterEmail} />
            <Field label="Chức vụ" value={form.requesterTitle} onChange={(value) => update("requesterTitle", value)} onBlur={() => touchField("requesterTitle")} error={fieldErrors.requesterTitle} required />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Nhu cầu cứu trợ</span>
              <button type="button" onClick={addNeed} className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-3 py-2 text-xs font-black text-primary hover:bg-primary/10">
                <Plus className="h-4 w-4" />
                Thêm nhu cầu
              </button>
            </div>

            <div className="space-y-3">
              {needs.map((need, index) => (
                <div key={need.id} className="grid gap-3 rounded-xl border border-outline/25 bg-white p-3 md:grid-cols-[220px_minmax(0,1fr)_40px]">
                  <label className="block">
                    <span className="text-xs font-bold text-text-subtle">Danh mục hàng {index + 1}</span>
                    <select
                      value={need.itemCategoryId}
                      onChange={(event) => updateNeed(need.id, { itemCategoryId: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-primary"
                    >
                      <option value="">Chọn danh mục</option>
                      {itemCategories.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                      <option value={OTHER_CATEGORY_ID}>Khác</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-text-subtle">Số lượng</span>
                    <input
                      type="number"
                      min={1}
                      value={need.quantity}
                      onChange={(event) => updateNeed(need.id, { quantity: event.target.value })}
                      placeholder={need.itemCategoryId && need.itemCategoryId !== OTHER_CATEGORY_ID ? categoryById.get(need.itemCategoryId)?.unit : "Số lượng"}
                      className="mt-2 w-full resize-none rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary"
                    />
                  </label>
                  {need.itemCategoryId === OTHER_CATEGORY_ID && (
                    <label className="block md:col-span-2">
                      <span className="text-xs font-bold text-text-subtle">Mô tả khác</span>
                      <textarea
                        value={need.description}
                        onChange={(event) => updateNeed(need.id, { description: event.target.value })}
                        rows={2}
                        placeholder="Ví dụ: bình oxy, xe chuyên dụng, dụng cụ vệ sinh..."
                        className="mt-2 w-full resize-none rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => removeNeed(need.id)}
                    disabled={needs.length === 1}
                    className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-subtle hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Xóa nhu cầu"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Vị trí cần cứu trợ</span>
              <div className="mt-2 space-y-2">
                <VietnamAddressFields
                  province={form.province}
                  ward={form.ward}
                  address={form.address}
                  onProvinceChange={(value) => {
                    update("province", value);
                    setConfirmedPoint(null);
                    setPrecisePoint(null);
                  }}
                  onWardChange={(value) => {
                    update("ward", value);
                    setConfirmedPoint(null);
                    setPrecisePoint(null);
                  }}
                  onAddressChange={(value) => {
                    update("address", value);
                    setConfirmedPoint(null);
                    setPrecisePoint(null);
                  }}
                  onAddressResolved={(point) => {
                    setConfirmedPoint(point);
                    setPrecisePoint(null);
                  }}
                  inputClassName="w-full rounded-xl border border-outline/30 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-primary"
                  addressPlaceholder="Nhập số nhà, đường, trường học, trạm y tế..."
                />
                <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-high px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-60">
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  Vị trí hiện tại
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-surface-low px-3 py-2 text-sm text-text-subtle">
              {selectedPoint ? (
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã xác nhận vị trí: {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                </span>
              ) : (
                "Có thể chọn gợi ý địa chỉ, dùng vị trí hiện tại, hoặc chọn tọa độ chính xác trực tiếp trên bản đồ."
              )}
            </div>
          </div>

          {message && (
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
              {message.text}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-outline/20 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setPlacingPrecisePoint((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-high px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/10">
              <Crosshair className="h-4 w-4" />
              {placingPrecisePoint ? "Đang chọn trên bản đồ" : "Chọn tọa độ chính xác"}
            </button>
            <button type="button" onClick={submitRequest} disabled={!canSubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi yêu cầu
            </button>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
            <div className="border-b border-outline/20 px-4 py-3">
              <h2 className="text-sm font-black text-slate-950">Xác nhận trên bản đồ</h2>
              <p className="mt-1 text-xs text-text-subtle">
                {placingPrecisePoint ? "Nhấn vào đúng điểm cần cứu trợ." : "Kiểm tra vị trí trước khi gửi yêu cầu."}
              </p>
            </div>
            <div className="h-[420px]">
              <MapView
                locations={draftLocations}
                selectedId={draftLocations[0]?.id}
                onMapClick={handleMapClick}
                placingMode={placingPrecisePoint}
                showUserLocation={false}
                weatherMode="compact"
                height="100%"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-surface-card p-4 text-sm shadow-ambient">
            <p className="font-black text-slate-950">Thông tin sẽ lưu</p>
            <div className="mt-3 space-y-2 text-text-subtle">
              <Info label="Trạng thái" value="Chờ tiếp nhận" />
              <Info label="Tỉnh/Thành" value={form.province || "-"} />
              <Info label="Phường/Xã" value={form.ward || "-"} />
              <Info label="Địa chỉ" value={form.address || "-"} />
              <Info label="Tọa độ địa chỉ" value={confirmedPoint ? `${confirmedPoint.lat.toFixed(6)}, ${confirmedPoint.lng.toFixed(6)}` : "-"} />
              <Info label="Tọa độ chính xác" value={precisePoint ? `${precisePoint.lat.toFixed(6)}, ${precisePoint.lng.toFixed(6)}` : "Không bắt buộc"} />
              <Info label="Danh mục hàng" value={requestItems.length ? `${requestItems.length} dòng` : "-"} />
              <Info label="Nhu cầu khác" value={otherNotes || "-"} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, onBlur, type = "text", required = false, error }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
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
