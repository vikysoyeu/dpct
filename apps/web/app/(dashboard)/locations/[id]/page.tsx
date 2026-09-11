"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Image as ImageIcon, Loader2, MapPinned } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/navigation/back-button";
import { fetchLocationDetail } from "@/hooks/useLocations";
import { API_BASE_URL } from "@/lib/api";
import { LOCATION_STATUS_LABELS, LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import { formatDescription } from "@/lib/text-format";
import type { Location } from "@rescue/types";

const MapView = dynamic(
  () => import("../../../../components/map/MapView").then((m) => ({ default: m.MapView })),
  { ssr: false, loading: () => <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl bg-surface-low"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> },
);

export default function PublicLocationDetailPage({ params }: { params: { id: string } }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLocationDetail(params.id)
      .then((data) => {
        if (!cancelled) setLocation(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được địa điểm.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const images = useMemo(() => {
    const fromLocation = location?.imageUrls ?? [];
    const fromUpdates = location?.locationUpdates?.map((item) => item.imageUrl).filter(Boolean) as string[] | undefined;
    return Array.from(new Set([...(fromLocation ?? []), ...(fromUpdates ?? [])]));
  }, [location]);

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !location) {
    return (
      <div className="space-y-4">
        <BackButton fallbackHref="/map" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Quay lại</BackButton>
        <div className="rounded-2xl bg-surface-card p-6 text-sm font-semibold text-danger shadow-ambient">{error ?? "Không tìm thấy địa điểm."}</div>
      </div>
    );
  }

  const typeConfig = LOCATION_TYPE_CONFIG[location.type];

  return (
    <div className="space-y-4">
      <PageHeader
        title={location.name}
        subtitle={`${typeConfig?.label ?? location.type} · ${LOCATION_STATUS_LABELS[location.status] ?? location.status}`}
        actions={[
          { href: "/map", label: "Quay lại", variant: "secondary", type: "back" },
          { href: "/rescue-request", label: "Gửi yêu cầu hỗ trợ" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-h-[420px] overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
          <MapView
            locations={[location]}
            selectedId={location.id}
            height="420px"
            className="min-h-[420px]"
            showUserLocation={false}
            weatherMode="compact"
            detailHref={(item) => `/locations/${item.id}`}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            {images[0] ? (
              <img src={resolveImage(images[0])} alt={location.name} className="aspect-[16/10] w-full rounded-xl object-cover" />
            ) : (
              <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-surface-low text-text-subtle">
                <ImageIcon className="h-7 w-7" />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }} />
              <span className="text-xs font-bold text-text-subtle">{typeConfig?.label ?? location.type}</span>
            </div>
            <p className="mt-2 text-sm text-text-subtle formatted-description">
              {location.description ? formatDescription(location.description) : "Chưa có mô tả chi tiết cho địa điểm này."}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Metric label="Khẩn" value={`${location.urgency}/5`} />
              <Metric label="Ảnh" value={String(images.length)} />
              <Metric label="Nhu cầu" value={String(location.needs?.length ?? 0)} />
            </div>
            <p className="mt-3 text-xs text-text-subtle">
              <MapPinned className="mr-1 inline h-3.5 w-3.5" />{location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          </section>
        </aside>
      </section>

      {images.length > 1 && (
        <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
          <h2 className="text-base font-black text-primary">Hình ảnh địa điểm</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((url) => (
              <img key={url} src={resolveImage(url)} alt={location.name} className="aspect-[4/3] w-full rounded-xl object-cover" />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoPanel title="Nhu cầu tại điểm" empty="Chưa ghi nhận nhu cầu cụ thể." rows={(location.needs ?? []).map((need) => ({
          title: need.item,
          meta: `${need.quantity} ${need.unit}`,
          status: need.status,
        }))} />
        <InfoPanel title="Cập nhật hiện trường" empty="Chưa có cập nhật hiện trường." rows={(location.locationUpdates ?? []).map((item) => ({
          title: item.content || "Cập nhật hiện trường",
          meta: item.user?.name ?? "Đội điều phối",
          status: new Date(item.createdAt).toLocaleString("vi-VN"),
        }))} />
      </section>
    </div>
  );
}

function resolveImage(url: string) {
  return url.startsWith("/uploads") ? `${API_BASE_URL}${url}` : url;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-low px-3 py-2">
      <p className="text-lg font-black text-text-main">{value}</p>
      <p className="text-[10px] font-bold uppercase text-text-subtle">{label}</p>
    </div>
  );
}

function InfoPanel({ title, empty, rows }: { title: string; empty: string; rows: Array<{ title: string; meta: string; status: string }> }) {
  return (
    <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-primary">{title}</h2>
        <span className="rounded-full bg-surface-low px-2 py-0.5 text-xs font-black text-text-subtle">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <article key={`${row.title}-${index}`} className="rounded-xl bg-surface-low p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text-main">{row.title}</p>
                  <p className="mt-1 text-xs text-text-subtle">{row.meta}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-text-subtle">{row.status}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
