"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, ImageIcon, Loader2, MapPinned, Package, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/navigation/back-button";
import { API_BASE_URL } from "@/lib/api";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import { formatDescription } from "@/lib/text-format";
import { missionStatusLabel, priorityLabel, requestStatusLabel, usePublicRescueRequest } from "@/hooks/usePublicRescue";

function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function PublicRescueRequestDetailPage({ params }: { params: { code: string } }) {
  const { request, loading, error } = usePublicRescueRequest(params.code);
  const images = request?.location?.imageUrls?.map(resolveImageUrl).filter(Boolean) as string[] | undefined;
  const volunteerCount = request?.volunteerRequestCount ?? 0;
  const missionCount = request?.missionCount ?? 0;

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (error || !request) {
    return (
      <div className="rounded-2xl bg-danger/10 p-5 text-sm font-bold text-danger">
        {error ?? "Không tìm thấy yêu cầu cứu trợ."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={rescueRequestDisplayName(request)}
        subtitle="Thông tin công khai của yêu cầu cứu trợ."
        actions={[
          { href: "/rescue-requests", label: "Danh sách yêu cầu", variant: "secondary" },
          { href: "/sponsorship", label: "Tài trợ" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <article className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="grid gap-4 md:grid-cols-4">
              <Info label="Mức ưu tiên" value={priorityLabel(request.priority)} />
              <Info label="Trạng thái" value={requestStatusLabel(request.status)} />
              <Info label="TNV đăng ký" value={String(volunteerCount)} />
              <Info label="Nhiệm vụ" value={String(missionCount)} />
            </div>

            {request.content && (
              <div className="formatted-description mt-5 rounded-xl bg-surface-low p-4 text-sm leading-6 text-text-subtle">
                {formatDescription(request.content)}
              </div>
            )}
          </article>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-primary">Hình ảnh địa điểm</h2>
                <p className="mt-1 text-sm text-text-subtle">{request.location?.name ?? "Chưa rõ địa điểm"}</p>
              </div>
              <span className="rounded-full bg-surface-low px-3 py-1 text-xs font-black text-primary">{images?.length ?? 0} ảnh</span>
            </div>

            {images && images.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {images.map((imageUrl, index) => (
                  <img key={imageUrl} src={imageUrl} alt={`Hình ảnh địa điểm ${index + 1}`} className="aspect-[16/10] w-full rounded-xl object-cover" />
                ))}
              </div>
            ) : (
              <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-xl bg-surface-low text-text-subtle">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <h2 className="text-lg font-black text-primary">Danh mục hàng cần hỗ trợ</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(request.requestItems ?? []).length === 0 ? (
                <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle md:col-span-2">Chưa có nhu cầu hàng hóa chi tiết.</p>
              ) : (
                request.requestItems!.map((item) => (
                  <article key={`${item.rescueRequestId}-${item.itemCategoryId}`} className="rounded-xl bg-surface-low p-4">
                    <p className="flex items-center gap-2 font-black text-text-main">
                      <Package className="h-4 w-4 text-primary" />
                      {item.itemCategory?.name ?? item.itemCategoryId}
                    </p>
                    <p className="mt-1 text-sm text-text-subtle">{item.quantity} {item.itemCategory?.unit ?? ""}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <h2 className="text-lg font-black text-primary">Nhiệm vụ điều phối</h2>
            <div className="mt-4 space-y-3">
              {(request.missions ?? []).length === 0 ? (
                <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">Chưa có nhiệm vụ công khai cho yêu cầu này.</p>
              ) : (
                request.missions!.map((mission) => (
                  <article key={mission.id} className="rounded-xl border border-outline/15 bg-surface-low p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-primary">{priorityLabel(mission.priority)}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-text-subtle">{missionStatusLabel(mission.status)}</span>
                    </div>
                    <p className="mt-3 font-black text-text-main">{mission.name}</p>
                    <p className="mt-1 text-sm text-text-subtle">{mission.missionType ?? "Nhiệm vụ hiện trường"}</p>
                    {mission.notes && <p className="formatted-description mt-2 text-sm leading-6 text-text-subtle">{formatDescription(mission.notes)}</p>}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Metric icon={CalendarClock} label="Bắt đầu" value={formatDateTime(mission.startedAt)} />
                      <Metric icon={Users} label="Số đội" value={String(mission.teamCount ?? 0)} />
                      <Metric icon={Users} label="Thành viên" value={String(mission.memberCount ?? 0)} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <h2 className="text-base font-black text-primary">Địa điểm</h2>
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-text-main">
              <MapPinned className="h-4 w-4 text-primary" />
              {request.location?.name ?? "Chưa rõ địa điểm"}
            </p>
            {request.location?.description && <p className="formatted-description mt-3 text-sm leading-6 text-text-subtle">{formatDescription(request.location.description)}</p>}
            {request.location && (
              <div className="mt-4 rounded-xl bg-surface-low p-3 text-sm font-bold text-primary">
                {request.location.lat.toFixed(5)}, {request.location.lng.toFixed(5)}
              </div>
            )}
          </section>

          <Link href="/sponsorship" className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">
            Tài trợ cho yêu cầu này
          </Link>

          <BackButton fallbackHref="/rescue-requests" className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-4 py-2 text-sm font-bold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </BackButton>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-low p-4">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{label}</p>
      <p className="mt-2 text-lg font-black text-primary">{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-0.5 font-black text-text-main">{value}</p>
    </div>
  );
}
