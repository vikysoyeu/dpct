"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarClock, ImagePlus, Loader2, MapPin, Pencil, Trash2, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/navigation/back-button";
import { apiClient, API_BASE_URL } from "@/lib/api";
import { fetchLocationDetail } from "@/hooks/useLocations";
import { LOCATION_STATUS_LABELS, LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import type { Location, LocationUpdate } from "@rescue/types";

const MapView = dynamic(
  () => import("../../../../../components/map/MapView").then((m) => ({ default: m.MapView })),
  { ssr: false, loading: () => <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl bg-surface-low"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> },
);

export default function AdminLocationDetailPage({ params }: { params: { id: string } }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<LocationUpdate | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageNote, setEditImageNote] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setLocation(await fetchLocationDetail(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const images = useMemo(() => {
    return (location?.locationUpdates ?? []).filter((item) => !!item.imageUrl);
  }, [location]);

  const addImage = async (url: string, content?: string) => {
    if (!location || !url.trim()) return;
    setSavingImage(true);
    try {
      const res = await apiClient.post<{ data: Location }>(`/locations/${location.id}/images`, {
        url: url.trim(),
        content: content || imageNote || undefined,
      });
      setLocation(res.data);
      setImageUrl("");
      setImageNote("");
      setEditingUpdate(null);
    } finally {
      setSavingImage(false);
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setSavingImage(true);
    try {
      const uploaded = await apiClient.upload<{ data: { url: string } }>("/upload", file);
      await addImage(uploaded.data.url, imageNote || undefined);
    } finally {
      setSavingImage(false);
    }
  };

  const startEditImage = (update: LocationUpdate) => {
    setEditingUpdate(update);
    setEditImageUrl(update.imageUrl ?? "");
    setEditImageNote(update.content ?? "");
  };

  const updateImage = async () => {
    if (!editingUpdate || !editImageUrl.trim()) return;
    setSavingImage(true);
    try {
      await apiClient.patch(`/locations/updates/${editingUpdate.id}`, {
        imageUrl: editImageUrl.trim(),
        content: editImageNote.trim(),
      });
      setEditingUpdate(null);
      await load();
    } finally {
      setSavingImage(false);
    }
  };

  const deleteImage = async (update: LocationUpdate) => {
    if (!window.confirm("Xóa ảnh/cập nhật này?")) return;
    setSavingImage(true);
    try {
      await apiClient.del(`/locations/updates/${update.id}`);
      if (editingUpdate?.id === update.id) setEditingUpdate(null);
      await load();
    } finally {
      setSavingImage(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !location) {
    return (
      <div className="space-y-4">
        <BackButton fallbackHref="/admin/locations" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Quay lại</BackButton>
        <div className="rounded-2xl bg-surface-card p-6 text-sm font-semibold text-danger shadow-ambient">{error ?? "Không tìm thấy địa điểm."}</div>
      </div>
    );
  }

  const typeConfig = LOCATION_TYPE_CONFIG[location.type];

  return (
    <div className="space-y-4">
      <PageHeader
        title={location.name}
        subtitle={`${typeConfig?.label ?? location.type} · ${LOCATION_STATUS_LABELS[location.status] ?? location.status} · ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
        actions={[
          { href: "/admin/locations", label: "Quay lại", variant: "secondary", type: "back" },
          { href: "/admin/needs", label: "Yêu cầu cứu trợ" },
        ]}
      />

      <section className="grid items-stretch gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-h-[360px] overflow-hidden rounded-2xl bg-surface-card shadow-ambient xl:min-h-[560px]">
          <div className="h-full min-h-[360px] xl:min-h-[560px]">
            <MapView
              locations={[location]}
              selectedId={location.id}
              height="100%"
              className="h-full"
              showUserLocation={false}
              weatherMode="compact"
              detailHref={(item) => `/admin/locations/${item.id}`}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-base font-black text-primary">Thông tin địa điểm</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="ID" value={location.id} wide />
              <Field label="Loại" value={typeConfig ? `${typeConfig.emoji} ${typeConfig.label}` : location.type} />
              <Field label="Trạng thái" value={LOCATION_STATUS_LABELS[location.status] ?? location.status} />
              <Field label="Ưu tiên" value={location.priority ?? "TRUNG_BINH"} />
              <Field label="Khẩn cấp" value={`${location.urgency}/5`} />
              <Field label="Vĩ độ" value={String(location.lat)} />
              <Field label="Kinh độ" value={String(location.lng)} />
              <Field label="Hết hạn" value={location.expiresAt ? formatDate(location.expiresAt) : "Không áp dụng"} wide />
              <Field label="Tạo lúc" value={formatDate(location.createdAt)} />
              <Field label="Cập nhật" value={formatDate(location.updatedAt)} />
              <Field label="Mô tả" value={location.description || "Chưa có mô tả"} wide />
            </div>
          </div>

          <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <h2 className="mb-3 text-base font-black text-primary">Người phụ trách</h2>
            <div className="space-y-3">
              <Person label="Người báo điểm" name={location.reportedBy?.name ?? location.reportedById ?? "Chưa có"} phone={location.reportedBy?.phone} email={location.reportedBy?.email} />
              <Person label="Người xác minh" name={location.verifiedBy?.name ?? location.verifiedById ?? "Chưa xác minh"} phone={location.verifiedBy?.phone} email={location.verifiedBy?.email} />
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-primary">Hình ảnh địa điểm</h2>
            <p className="mt-1 text-xs text-text-subtle">Ảnh và ghi chú được lưu trong bảng cập nhật địa điểm.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="w-64 rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" placeholder="Dán liên kết ảnh" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <input className="w-56 rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" placeholder="Ghi chú ảnh" value={imageNote} onChange={(e) => setImageNote(e.target.value)} />
            <button type="button" onClick={() => addImage(imageUrl)} disabled={savingImage || !imageUrl.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><ImagePlus className="h-4 w-4" /> Thêm ảnh</button>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-surface-high px-3 py-2 text-sm font-bold text-text-main ${savingImage ? "pointer-events-none opacity-50" : ""}`}>
              <Upload className="h-4 w-4" /> Tải ảnh lên
              <input className="hidden" type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} />
            </label>
          </div>
        </div>
        {editingUpdate && (
          <div className="mb-4 rounded-xl border border-outline/15 bg-surface-low p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Sửa cập nhật ảnh</p>
              <button type="button" onClick={() => setEditingUpdate(null)} className="rounded-lg p-1 text-text-subtle hover:bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input className="rounded-xl border border-outline/20 bg-white px-3 py-2 text-sm" placeholder="Liên kết ảnh" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
              <input className="rounded-xl border border-outline/20 bg-white px-3 py-2 text-sm" placeholder="Ghi chú ảnh" value={editImageNote} onChange={(e) => setEditImageNote(e.target.value)} />
              <button type="button" onClick={updateImage} disabled={savingImage || !editImageUrl.trim()} className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Lưu</button>
            </div>
          </div>
        )}
        {images.length === 0 ? (
          <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">Chưa có ảnh cho địa điểm này.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((update) => (
              <article key={update.id} className="group overflow-hidden rounded-xl bg-surface-low">
                <a href={resolveImage(update.imageUrl as string)} target="_blank" rel="noreferrer">
                  <img src={resolveImage(update.imageUrl as string)} alt={update.content ?? location.name} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" />
                </a>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="truncate text-xs font-semibold text-text-subtle">{update.content ?? update.imageUrl}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => startEditImage(update)} className="rounded-lg p-1 text-text-subtle hover:bg-white hover:text-primary" title="Sửa cập nhật">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteImage(update)} className="rounded-lg p-1 text-text-subtle hover:bg-white hover:text-danger" title="Xóa cập nhật">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataTable title="Nhu cầu" empty="Chưa có nhu cầu." headers={["Hạng mục", "Số lượng", "Trạng thái", "Ưu tiên"]} rows={(location.needs ?? []).map((item) => [item.item, `${item.quantity} ${item.unit}`, item.status, item.priority ?? "TRUNG_BINH"])} />
        <DataTable title="Kho tại địa điểm" empty="Chưa có tồn kho." headers={["Mặt hàng", "Số lượng", "Người cập nhật", "Cập nhật"]} rows={(location.inventory ?? []).map((item) => [item.item, `${item.quantity} ${item.unit}`, item.lastUpdatedBy?.name ?? item.lastUpdatedById ?? "-", formatDate(item.updatedAt)])} />
        <DataTable title="Yêu cầu cứu trợ" empty="Chưa có yêu cầu." headers={["Tên", "Người gửi", "Trạng thái", "Mức ưu tiên"]} rows={(location.rescueRequests ?? []).map((item) => [rescueRequestDisplayName(item), item.requesterName ?? item.submittedById ?? "-", item.status, item.priority])} />
        <DataTable title="Nhiệm vụ" empty="Chưa có nhiệm vụ." headers={["Tên", "Phụ trách", "Trạng thái", "Đội"]} rows={(location.missions ?? []).map((item) => [item.name, (item.transportations ?? []).map((t) => `${t.driverName} (${t.vehicleType})`).join(", ") || "-", item.status, String(item.rescueTeams?.length ?? 0)])} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-black text-primary">Cập nhật hiện trường</h2>
          </div>
          {(location.locationUpdates ?? []).length === 0 ? (
            <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">Chưa có cập nhật.</p>
          ) : (
            <div className="space-y-3">
              {(location.locationUpdates ?? []).map((item) => (
                <article key={item.id} className="rounded-xl bg-surface-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text-main">{item.user?.name ?? item.userId}</p>
                      <p className="mt-1 text-sm text-text-subtle">{item.content ?? "Cập nhật ảnh hiện trường"}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-text-subtle">{formatDate(item.createdAt)}</span>
                  </div>
                  {item.imageUrl ? <img src={resolveImage(item.imageUrl)} alt={item.content ?? location.name} className="mt-3 max-h-48 rounded-lg object-cover" /> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function resolveImage(url: string) {
  return url.startsWith("/uploads") ? `${API_BASE_URL}${url}` : url;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-text-main">{value}</p>
    </div>
  );
}

function Person({ label, name, phone, email }: { label: string; name: string; phone?: string | null; email?: string | null }) {
  return (
    <div className="rounded-xl bg-surface-low p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-main">{name}</p>
      <p className="mt-1 text-xs text-text-subtle">{[phone, email].filter(Boolean).join(" · ") || "Chưa có liên hệ"}</p>
    </div>
  );
}

function DataTable({ title, empty, headers, rows }: { title: string; empty: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-2xl bg-surface-card p-5 shadow-ambient">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-primary">{title}</h2>
        <span className="rounded-full bg-surface-low px-2 py-0.5 text-xs font-black text-text-subtle">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline/15 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
                {headers.map((header) => <th key={header} className="pb-2 pr-4">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`} className="py-3 pr-4 text-text-main">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
