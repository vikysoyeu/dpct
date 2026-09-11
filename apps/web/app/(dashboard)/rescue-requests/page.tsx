"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, ImageIcon, Loader2, MapPinned, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { API_BASE_URL } from "@/lib/api";
import { rescueRequestDisplayName, rescueRequestSearchText } from "@/lib/rescue-request";
import { formatDescription } from "@/lib/text-format";
import { priorityLabel, requestStatusLabel, usePublicRescueRequests } from "@/hooks/usePublicRescue";

const PRIORITY_STYLE: Record<string, string> = {
  KHAN_CAP: "border-rose-300 bg-rose-50 text-rose-700",
  CAO: "border-orange-300 bg-orange-50 text-orange-700",
  TRUNG_BINH: "border-amber-300 bg-amber-50 text-amber-700",
  THAP: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const STATUS_STYLE: Record<string, string> = {
  CHO_TIEP_NHAN: "bg-amber-100 text-amber-800",
  DANG_THUC_HIEN: "bg-violet-100 text-violet-800",
  HOAN_THANH: "bg-emerald-100 text-emerald-800",
  HUY_BO: "bg-rose-100 text-rose-800",
};

const STATUSES = ["ALL", "CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const priorityRank: Record<string, number> = { KHAN_CAP: 4, CAO: 3, TRUNG_BINH: 2, THAP: 1 };

function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function requestItemSummary(request: ReturnType<typeof usePublicRescueRequests>["requests"][number]) {
  const items = request.requestItems ?? [];
  if (items.length === 0) return "";
  return items.slice(0, 3).map((item) => `${item.itemCategory?.name ?? item.itemCategoryId}: ${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()).join(", ");
}

export default function PublicRescueRequestsPage() {
  const { requests, total, loading, error } = usePublicRescueRequests();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("PRIORITY_DESC");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests
      .filter((request) => {
        const text = `${rescueRequestSearchText(request)} ${request.content ?? ""} ${request.location?.name ?? ""} ${request.location?.description ?? ""} ${requestItemSummary(request)}`.toLowerCase();
        return (!normalized || text.includes(normalized)) && (status === "ALL" || request.status === status);
      })
      .sort((a, b) => {
        if (sortBy === "NEWEST") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        if (sortBy === "MOST_VOLUNTEERS") return b.volunteerRequestCount - a.volunteerRequestCount;
        return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
      });
  }, [requests, query, status, sortBy]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu cứu trợ"
        subtitle="Theo dõi các yêu cầu cứu trợ đang được tiếp nhận và điều phối."
        actions={[
          { href: "/rescue-request", label: "Gửi yêu cầu" },
          { href: "/sponsorship", label: "Nhà tài trợ", variant: "secondary" },
        ]}
      />

      <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_180px_110px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo yêu cầu, địa điểm, mô tả..."
              className="w-full rounded-xl border border-outline/20 bg-surface px-10 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2.5 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUSES.map((item) => <option key={item} value={item}>{item === "ALL" ? "Tất cả trạng thái" : requestStatusLabel(item)}</option>)}
          </select>
          <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2.5 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="PRIORITY_DESC">Ưu tiên cao nhất</option>
            <option value="NEWEST">Mới nhất</option>
            <option value="MOST_VOLUNTEERS">Nhiều TNV đăng ký</option>
          </select>
          <div className="rounded-xl bg-surface-low px-4 py-2.5 text-center text-sm font-bold text-primary">{filtered.length}/{total}</div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-surface-card py-16 shadow-ambient">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-danger/10 p-5 text-sm font-bold text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface-card p-10 text-center text-sm text-text-subtle shadow-ambient">Không có yêu cầu cứu trợ phù hợp.</div>
      ) : (
        <section className="ui-grid-cards grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((request) => {
            const imageUrl = resolveImageUrl(request.location?.imageUrls?.[0]);
            const volunteerCount = request.volunteerRequestCount ?? 0;
            const missionCount = request.missionCount ?? 0;
            return (
              <article key={request.id} className="ui-card ui-card-lg flex h-[540px] flex-col overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
                <div className="h-48 shrink-0 bg-surface-low">
                  {imageUrl ? (
                    <img src={imageUrl} alt={`Hình ảnh địa điểm ${request.location?.name ?? rescueRequestDisplayName(request)}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-subtle">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-5">
                  <div className="flex min-h-8 flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${PRIORITY_STYLE[request.priority] ?? PRIORITY_STYLE.TRUNG_BINH}`}>{priorityLabel(request.priority)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_STYLE[request.status] ?? "bg-surface-low text-text-subtle"}`}>{requestStatusLabel(request.status)}</span>
                  </div>

                  <h2 className="mt-4 min-h-12 overflow-hidden break-words text-lg font-black leading-6 text-text-main">{rescueRequestDisplayName(request)}</h2>
                  <p className="mt-2 h-[72px] overflow-hidden text-sm leading-6 text-text-subtle">{requestItemSummary(request) || formatDescription(request.content) || "Chưa có mô tả công khai."}</p>
                  <p className="mt-3 flex min-h-5 items-center gap-2 text-xs font-semibold text-text-subtle">
                    <MapPinned className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{request.location?.name ?? "Chưa rõ địa điểm"}</span>
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <Metric icon={CalendarClock} label="Ngày gửi" value={formatDate(request.submittedAt)} />
                    <Metric icon={Users} label="TNV" value={String(volunteerCount)} />
                    <Metric icon={MapPinned} label="Nhiệm vụ" value={String(missionCount)} />
                  </div>

                  <div className="mt-auto pt-5">
                    <Link href={`/rescue-requests/${request.code}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-strong">
                      Xem chi tiết <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-low px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-0.5 font-black text-text-main">{value}</p>
    </div>
  );
}
