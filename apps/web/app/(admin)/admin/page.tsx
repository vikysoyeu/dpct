"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Filter,
  Maximize2,
  Minimize2,
  Loader2,
  MapPin,
  Package,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { priorityLabel, requestStatusLabel, useAdminRescueRequests } from "@/hooks/useAdminRescue";
import { useLocations } from "@/hooks/useLocations";
import { useVolunteerTeams } from "@/hooks/useVolunteerTeams";
import { useVolunteers } from "@/hooks/useVolunteers";
import { LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import { formatDescription } from "@/lib/text-format";
import { getProvinceNames, getWardNames } from "@/lib/vn-address";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((module) => ({ default: module.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-3xl bg-slate-100">
        <Loader2 className="h-7 w-7 animate-spin text-blue-800" />
      </div>
    ),
  }
);

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function formatRelativeTime(value: string): string {
  const deltaMs = Date.now() - new Date(value).getTime();
  const deltaMinutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (deltaMinutes < 60) return `${deltaMinutes} phút trước`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} giờ trước`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} ngày trước`;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminDashboardPage() {
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { locations, loading: locationsLoading, error: locationsError, refetch: refetchLocations } = useLocations();
  const { teams, loading: teamsLoading, error: teamsError, refetch: refetchTeams } = useVolunteerTeams();
  const { volunteers, loading: volunteersLoading, error: volunteersError, refetch: refetchVolunteers } = useVolunteers();
  const { requests, loading: requestsLoading, error: requestsError, refetch: refetchRequests } = useAdminRescueRequests();

  const [keyword, setKeyword] = useState("");
  const provinceOptions = getProvinceNames();
  const [province, setProvince] = useState("");
  const wardOptions = getWardNames(province);
  const [ward, setWard] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const loading = statsLoading || locationsLoading || teamsLoading || volunteersLoading || requestsLoading;
  const error = statsError || locationsError || teamsError || volunteersError || requestsError;

  const refreshAll = async () => {
    await Promise.all([refetchStats(), refetchLocations(), refetchTeams(), refetchVolunteers(), refetchRequests()]);
  };

  const onlineVolunteers = volunteers.filter((volunteer) => volunteer.status === "AVAILABLE").length;
  const teamVolunteers = useMemo(() => {
    const counts = new Map<string, number>();

    for (const volunteer of volunteers) {
      if (volunteer.teamId) {
        counts.set(volunteer.teamId, (counts.get(volunteer.teamId) ?? 0) + 1);
      }
    }

    return counts;
  }, [volunteers]);

  const requestCards = useMemo(() => {
    const keywordValue = normalizeText(keyword.trim());
    const filterValues = [province, ward].map((value) => normalizeText(value)).filter(Boolean);

    return requests
      .filter((request) => {
        const searchable = normalizeText(
          [
            request.name,
            request.code,
            request.content ?? "",
            request.priority,
            request.status,
            request.requesterName ?? "",
            request.requesterPhone ?? "",
            request.location?.name ?? "",
            request.location?.province ?? "",
            request.location?.ward ?? "",
            request.location?.address ?? "",
            ...(request.requestItems ?? []).map((item) => `${item.quantity} ${item.itemCategory?.unit ?? ""} ${item.itemCategory?.name ?? ""}`),
          ].join(" ")
        );
        const matchesKeyword = !keywordValue || searchable.includes(keywordValue);
        const matchesArea = filterValues.length === 0 || filterValues.some((value) => searchable.includes(value));
        return matchesKeyword && matchesArea;
      })
      .sort((left, right) => {
        const priorityRank: Record<string, number> = { KHAN_CAP: 4, CAO: 3, TRUNG_BINH: 2, THAP: 1 };
        const priorityDiff = (priorityRank[right.priority] ?? 0) - (priorityRank[left.priority] ?? 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });
  }, [keyword, province, requests, ward]);

  const teamCards = useMemo(() => {
    return [...teams]
      .sort((left, right) => (teamVolunteers.get(right.id) ?? 0) - (teamVolunteers.get(left.id) ?? 0));
  }, [teamVolunteers, teams]);

  const supportPoints = useMemo(() => {
    const priorityTypes = new Set(["REST_STOP", "FOOD_SUPPORT", "STAGING_AREA"]);
    return locations.filter((location) => priorityTypes.has(location.type)).slice(0, 2);
  }, [locations]);

  const mapLocations = useMemo(
    () => locations.filter((location) => location.status !== "DONE").slice(0, 32),
    [locations]
  );

  const totalVolunteers = stats?.totalVolunteers ?? volunteers.length;
  const totalTeams = stats?.totalVolunteerTeams ?? teams.length;
  const activeTeamsCount = teams.length;
  const highPriorityLocations = locations.filter((location) => location.urgency >= 4 && location.status !== "DONE").length;

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">Dữ liệu đang có một phần lỗi: {error}</p>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center justify-center rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white"
            >
              Thử tải lại
            </button>
          </div>
        </div>
      ) : null}

      <section className="ui-grid-cards grid gap-4 md:grid-cols-3">
        <article className="ui-card ui-card-md relative overflow-hidden rounded-3xl bg-[#cfe8f4] p-6 shadow-[0_12px_40px_rgba(59,130,246,0.12)]">
          <div className="relative z-10 flex items-start justify-between">
            <span className="rounded-full bg-white/70 p-2 text-blue-950">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-sm font-black text-blue-950">+12%</span>
          </div>
          <div className="relative z-10 mt-6">
            <p className="text-4xl font-black text-blue-950">{loading ? "--" : activeTeamsCount.toLocaleString("vi-VN")}</p>
            <p className="text-clamp-1 mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-950/70">Đội tình nguyện đang hoạt động</p>
            <p className="ui-card-description mt-3 text-sm font-medium text-blue-950/80">{totalTeams} đội tổng cộng, {totalVolunteers} thành viên sẵn sàng điều phối.</p>
          </div>
          <div className="absolute -right-3 -bottom-8 text-[110px] text-blue-950/10">
            <Users className="h-28 w-28" />
          </div>
        </article>

        <article className="ui-card ui-card-md relative overflow-hidden rounded-3xl bg-[#d7e1ff] p-6 shadow-[0_12px_40px_rgba(99,102,241,0.12)]">
          <div className="relative z-10 flex items-start justify-between">
            <span className="rounded-full bg-white/70 p-2 text-indigo-950">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="text-sm font-black text-indigo-950">TRỰC TUYẾN</span>
          </div>
          <div className="relative z-10 mt-6">
            <p className="text-4xl font-black text-indigo-950">{loading ? "--" : onlineVolunteers.toLocaleString("vi-VN")}</p>
            <p className="text-clamp-1 mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-950/70">Tình nguyện viên sẵn sàng</p>
            <p className="ui-card-description mt-3 text-sm font-medium text-indigo-950/80">{totalVolunteers} TNV tổng cộng, ưu tiên lập đội theo từng yêu cầu cứu trợ.</p>
          </div>
          <div className="absolute -right-6 -bottom-8 text-[110px] text-indigo-950/10">
            <UserRound className="h-28 w-28" />
          </div>
        </article>

        <article className="ui-card ui-card-md relative overflow-hidden rounded-3xl bg-[#ffe4e4] p-6 shadow-[0_12px_40px_rgba(239,68,68,0.12)]">
          <div className="relative z-10 flex items-start justify-between">
            <span className="rounded-full bg-white/70 p-2 text-red-950">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <span className="text-sm font-black text-red-950">KHẨN CẤP</span>
          </div>
          <div className="relative z-10 mt-6">
            <p className="text-4xl font-black text-red-950">{loading ? "--" : highPriorityLocations.toLocaleString("vi-VN")}</p>
            <p className="text-clamp-1 mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-950/70">Các điểm ưu tiên cao</p>
            <p className="ui-card-description mt-3 text-sm font-medium text-red-950/80">Chỉ hiển thị các điểm khẩn cấp cần xử lý ngay để điều phối nhanh hơn.</p>
          </div>
          <div className="absolute -right-6 -bottom-8 text-[110px] text-red-950/10">
            <ShieldAlert className="h-28 w-28" />
          </div>
        </article>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60">
        <div className="mb-6 flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-800" />
          <h2 className="text-xl font-black text-slate-900">Tìm kiếm Yêu cầu cứu trợ</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Tỉnh / Thành Phố</label>
            <select
              value={province}
              onChange={(event) => {
                const nextProvince = event.target.value;
                setProvince(nextProvince);
                setWard("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option value="">Tất cả Tỉnh/Thành</option>
              {provinceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Xã / Phường</label>
            <select
              value={ward}
              onChange={(event) => setWard(event.target.value)}
              disabled={!province}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option value="">{province ? "Tất cả Phường/Xã" : "Chọn tỉnh/thành trước"}</option>
              {wardOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Từ khóa</label>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo mã, người gửi, địa điểm, nội dung..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20"
            >
              <Filter className="h-4 w-4" />
              Lọc Kết Quả
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <ShieldAlert className="h-5 w-5 text-blue-800" />
            Yêu cầu cứu trợ
          </h2>
          <Link href="/admin/needs" className="inline-flex items-center gap-1 text-sm font-bold text-blue-800">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
        {requestCards.map((request) => {
          const items = (request.requestItems ?? []).slice(0, 2);
          const extraCount = Math.max(0, (request.requestItems ?? []).length - items.length);
          const location = request.location;

          return (
            <article key={request.id} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,23,42,0.09)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Mã yêu cầu: #{request.code}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-800" />
                    <h3 className="text-sm font-black text-slate-900">{request.name}</h3>
                  </div>
                </div>
                <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800">{requestStatusLabel(request.status)}</span>
              </div>

              <div className="mt-4 flex-1 space-y-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Hạng mục yêu cầu</p>
                  <div className="space-y-2">
                    {items.length > 0 ? (
                      items.map((item) => {
                        const NeedIcon = Package;
                        return (
                          <div key={`${request.id}-${item.itemCategoryId}`} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                            <NeedIcon className="h-4 w-4 text-blue-700" />
                            <span>{item.quantity} {item.itemCategory?.unit ?? ""} {item.itemCategory?.name ?? "Hàng cứu trợ"}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">{request.content || "Chưa có hạng mục chi tiết"}</div>
                    )}
                    {extraCount > 0 ? <p className="text-[11px] font-semibold text-slate-400">+{extraCount} mục khác</p> : null}
                  </div>
                </div>

                <div className="rounded-2xl border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-blue-800">
                      {initials(request.requesterName || request.name)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{request.requesterName || "Người gửi chưa rõ"}</p>
                      <p className="text-[11px] text-slate-500">{location?.name ?? "Chưa gắn địa điểm"} · {priorityLabel(request.priority)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400">{formatRelativeTime(request.submittedAt)}</span>
                <Link href="/admin/needs" className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                  Xem yêu cầu
                </Link>
              </div>
            </article>
          );
        })}
        {!loading && requestCards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 lg:col-span-3">
            Chưa có yêu cầu cứu trợ phù hợp bộ lọc.
          </div>
        ) : null}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Users className="h-5 w-5 text-blue-800" />
                Đội Nhóm Tình Nguyện
              </h2>
              <Link href="/admin/resources" className="inline-flex items-center gap-1 text-sm font-bold text-blue-800">
                Xem Tất Cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="ui-grid-cards grid gap-4 lg:grid-cols-3">
              {teamCards.map((team, index) => {
                const count = teamVolunteers.get(team.id) ?? team.volunteers?.length ?? 0;
                return (
                  <article key={team.id} className="ui-card-row ui-card-md items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-clamp-1 font-bold text-slate-900">{team.name}</h3>
                        <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${index === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {index === 0 ? "Sẵn sàng" : "Đang chờ"}
                        </span>
                      </div>
                      <p className="ui-card-description mt-1 text-xs text-slate-500">{team.description ?? "Đội TNV theo khu vực, có thể điều phối ngay từ dashboard."}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {count} TNV</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {team.city ?? "Khu vực chưa gán"}{team.ward ? `, ${team.ward}` : ""}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!loading && teamCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 lg:col-span-3">
                  Chưa có đội nhóm tình nguyện.
                </div>
              ) : null}
            </div>
          </section>

        </div>

        <aside className="space-y-8">
          <section>
            <div className="mb-5 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-800" />
              <h2 className="text-lg font-black text-slate-900">Điểm Hỗ Trợ Ăn Nghỉ</h2>
            </div>
            <div className="space-y-4">
              {supportPoints.map((location) => (
                <article key={location.id} className="ui-card-row ui-card-md gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                      <MapPin className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-clamp-1 text-sm font-bold text-slate-900">{location.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <span className="rounded-full bg-white px-2 py-1 text-emerald-700">{LOCATION_TYPE_CONFIG[location.type]?.label ?? location.type}</span>
                      <span className={location.status === "ACTIVE" ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-700" : "rounded-full bg-amber-100 px-2 py-1 text-amber-700"}>
                        {location.status}
                      </span>
                    </div>
                    <p className="ui-card-description mt-2 text-[11px] text-slate-500">{formatDescription(location.description) || "Điểm hỗ trợ hoạt động theo dữ liệu điều phối."}</p>
                  </div>
                </article>
              ))}
              <Link href="/admin/locations" className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-400 transition hover:border-blue-300 hover:text-blue-800">
                + Thêm Điểm Hỗ Trợ Mới
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-800" />
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">Điều phối nhanh</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-2xl font-black text-blue-800">{loading ? "--" : stats?.pendingLocations ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Điểm chờ tiếp nhận</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-2xl font-black text-rose-700">{loading ? "--" : stats?.unmetNeeds ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Nhu cầu ưu tiên cao</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Link href="/admin/needs" className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white">
                Mở yêu cầu
              </Link>
              <button type="button" onClick={refreshAll} className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                Tải lại
              </button>
            </div>
          </section>
        </aside>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-800" />
                <h2 className="text-base font-black uppercase tracking-[0.16em] text-slate-900">Lớp Phủ Bản Đồ Trực Tuyến</h2>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-800" />{stats?.activeLocations ?? 0} điểm đang hoạt động</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-700" />{stats?.unmetNeeds ?? 0} nhu cầu ưu tiên cao</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />{stats?.availableVolunteers ?? 0} TNV sẵn sàng</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/locations" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-800">
                <ArrowRight className="h-4 w-4" />
                Tới trang địa điểm
              </Link>
              <button
                type="button"
                onClick={() => setIsMapExpanded((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20"
              >
                {isMapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isMapExpanded ? "Thu nhỏ" : "Mở rộng"}
              </button>
            </div>
          </div>
        </div>

        <div className={isMapExpanded ? "relative min-h-[680px]" : "relative min-h-[380px]"}>
          <MapView
            locations={mapLocations}
            height={isMapExpanded ? "680px" : "380px"}
            className={isMapExpanded ? "min-h-[680px]" : "min-h-[380px]"}
            isFullscreen={isMapExpanded}
            onFullscreenToggle={() => setIsMapExpanded((current) => !current)}
            detailHref={(location) => `/admin/locations/${location.id}`}
          >
            <div className="absolute left-4 top-4 z-[500] max-w-[280px] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-900">Lớp Phủ Bản Đồ Trực Tuyến</p>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-800" />
                  <span>{stats?.activeLocations ?? 0} điểm đang hoạt động</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-700" />
                  <span>{stats?.unmetNeeds ?? 0} nhu cầu ưu tiên cao</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span>{stats?.availableVolunteers ?? 0} TNV sẵn sàng</span>
                </div>
              </div>
            </div>
          </MapView>
        </div>
      </section>
    </div>
  );
}
