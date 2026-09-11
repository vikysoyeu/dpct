"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, ImageIcon, Loader2, MapPinned, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { priorityLabel, requestStatusLabel, useVolunteerRescueRequests, type RescueRequestWithDetails } from "@/hooks/useVolunteerPortal";
import { useAuthStore } from "@/stores/authStore";
import { formatDescription } from "@/lib/text-format";
import { rescueRequestDisplayName, rescueRequestSearchText } from "@/lib/rescue-request";
import { API_BASE_URL } from "@/lib/api";

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
const PRIORITIES = ["KHAN_CAP", "CAO", "TRUNG_BINH", "THAP"];
const STATUSES = ["DANG_THUC_HIEN"];
const priorityRank: Record<string, number> = { KHAN_CAP: 4, CAO: 3, TRUNG_BINH: 2, THAP: 1 };

function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function nearestDeadline(request: RescueRequestWithDetails) {
  const timestamps = (request.missions ?? [])
    .map((mission) => mission.startedAt ? new Date(mission.startedAt).getTime() : Number.POSITIVE_INFINITY)
    .sort((a, b) => a - b);
  return Number.isFinite(timestamps[0]) ? new Date(timestamps[0]).toISOString() : null;
}

function formatDeadline(value?: string | null) {
  if (!value) return "Chưa có hạn";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function requestNeedSummary(request: RescueRequestWithDetails) {
  const items = request.requestItems ?? [];
  if (items.length > 0) {
    return items.slice(0, 3).map((item) => `${item.itemCategory?.name ?? item.itemCategoryId}: ${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()).join(", ");
  }
  return formatDescription(request.content) || "Chưa có mô tả nhu cầu";
}

export default function VolunteerRequestsPage() {
  const { volunteer } = useAuthStore();
  const { requests, loading, error, total } = useVolunteerRescueRequests();
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DEADLINE_ASC");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const data = requests.filter((request) => {
      const text = `${rescueRequestSearchText(request)} ${request.content ?? ""} ${request.location?.name ?? ""} ${requestNeedSummary(request)}`.toLowerCase();
      return (!normalized || text.includes(normalized))
        && (priorityFilter === "ALL" || request.priority === priorityFilter)
        && (statusFilter === "ALL" || request.status === statusFilter);
    });
    return data.sort((a, b) => {
      if (sortBy === "PRIORITY_DESC") return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
      if (sortBy === "MOST_MISSIONS") return (b.missionCount ?? b.missions.length) - (a.missionCount ?? a.missions.length);
      if (sortBy === "NEWEST") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      const aDeadline = nearestDeadline(a);
      const bDeadline = nearestDeadline(b);
      return (aDeadline ? new Date(aDeadline).getTime() : Number.POSITIVE_INFINITY) - (bDeadline ? new Date(bDeadline).getTime() : Number.POSITIVE_INFINITY);
    });
  }, [requests, query, priorityFilter, statusFilter, sortBy]);
  const profileApproved = volunteer?.accountStatus === "HOAT_DONG";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tham gia cứu trợ"
        subtitle="Tìm yêu cầu phù hợp với kỹ năng, địa bàn và thời gian của bạn."
        actions={[
          { href: "/volunteer/my-requests", label: "Đã đăng ký" },
          { href: "/volunteer/profile", label: "Hồ sơ", variant: "secondary" },
        ]}
      />

      {!profileApproved && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 shadow-ambient">
          Hồ sơ tình nguyện viên của bạn đang chờ duyệt. Bạn vẫn có thể xem yêu cầu cứu trợ, nhưng chỉ đăng ký tham gia sau khi hồ sơ được duyệt.
        </section>
      )}

      <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên yêu cầu, địa điểm, nhu cầu..."
              className="w-full rounded-xl border border-outline/20 bg-surface px-10 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2.5 text-sm" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="ALL">Tất cả ưu tiên</option>
            {PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
          </select>
          <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2.5 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            {STATUSES.map((item) => <option key={item} value={item}>{requestStatusLabel(item)}</option>)}
          </select>
          <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2.5 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="DEADLINE_ASC">Hạn gần nhất</option>
            <option value="PRIORITY_DESC">Ưu tiên cao nhất</option>
            <option value="MOST_MISSIONS">Nhiều nhiệm vụ</option>
            <option value="NEWEST">Mới nhất</option>
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
        <div className="rounded-2xl bg-surface-card p-10 text-center text-sm text-text-subtle shadow-ambient">Không có yêu cầu phù hợp.</div>
      ) : (
        <section className="ui-grid-cards grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((request) => {
            const imageUrl = resolveImageUrl(request.location?.imageUrls?.[0]);
            const joined = request.volunteerRequests.some((item) => item.volunteerId === volunteer?.id);
            const deadline = nearestDeadline(request);
            const missionCount = request.missionCount ?? request.missions.length;
            const staffedMissions = request.missions.filter((mission) => (mission.teamCount ?? mission.rescueTeams.length) > 0).length;
            const volunteerCount = request.volunteerRequestCount ?? request.volunteerRequests.length;
            return (
              <article key={request.id} className="ui-card ui-card-lg flex min-h-[580px] flex-col overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
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
                    {joined && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã đăng ký</span>}
                  </div>

                  <h2 className="mt-4 min-h-12 overflow-hidden break-words text-lg font-black leading-6 text-text-main">{rescueRequestDisplayName(request)}</h2>
                  <p className="ui-card-description-3 mt-2 text-sm leading-6 text-text-subtle">{requestNeedSummary(request)}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-subtle">
                    <MapPinned className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{request.location?.name ?? "Chưa rõ địa điểm"}</span>
                  </p>

                  <div className="mt-5 grid gap-2">
                    <Metric icon={CalendarClock} label="Hạn gần nhất" value={formatDeadline(deadline)} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Metric icon={Users} label="Có đội" value={`${staffedMissions}/${missionCount}`} />
                      <Metric icon={Users} label="TNV đăng ký" value={String(volunteerCount)} />
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <Link href={`/volunteer/requests/${request.code}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-strong">
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
