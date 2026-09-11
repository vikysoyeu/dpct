"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarClock, CheckCircle2, ImageIcon, Loader2, MapPinned, Maximize2, Navigation, Package, Phone, Send, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/navigation/back-button";
import { missionStatusLabel, priorityLabel, requestStatusLabel, teamMemberRoleLabel, useVolunteerRescueRequest } from "@/hooks/useVolunteerPortal";
import { API_BASE_URL } from "@/lib/api";
import { LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import { formatDescription } from "@/lib/text-format";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import { useAuthStore } from "@/stores/authStore";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((module) => ({ default: module.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl bg-surface-low">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function VolunteerRequestDetailPage({ params }: { params: { code: string } }) {
  const { volunteer } = useAuthStore();
  const { request, loading, error, register, completeMission } = useVolunteerRescueRequest(params.code);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const ownRegistration = request?.volunteerRequests.find((item) => item.volunteerId === volunteer?.id) ?? null;
  const joined = Boolean(ownRegistration);
  const profileApproved = volunteer?.accountStatus === "HOAT_DONG";
  const registrationApproved = ownRegistration?.status === "DA_TIEP_NHAN" || ownRegistration?.status === "DANG_XU_LY";
  const requestOpenForRegistration = request?.status === "DANG_THUC_HIEN";
  const canRegister = profileApproved && requestOpenForRegistration;
  const operationalMissions = registrationApproved ? (request?.missions ?? []) : [];
  const assignedMission = operationalMissions.find((mission) => mission.rescueTeams.some((team) => team.members.some((member) => member.userId === volunteer?.id)));
  const mapLocation = request?.location ? { ...request.location, name: rescueRequestDisplayName(request) } : null;
  const images = request?.location?.imageUrls?.map(resolveImageUrl).filter(Boolean) as string[] | undefined;

  function formatDeadline(value?: string | null) {
    if (!value) return "Chưa có hạn";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  async function handleRegister() {
    setSubmitting(true);
    setMessage("");
    try {
      await register(note);
      setMessage("Đã gửi đăng ký tham gia yêu cầu cứu trợ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được đăng ký tham gia.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteMission(missionId: string) {
    setCompletingMissionId(missionId);
    setMessage("");
    try {
      await completeMission(missionId);
      setMessage("Đã chuyển nhiệm vụ sang Hoàn thành.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể hoàn thành nhiệm vụ.");
    } finally {
      setCompletingMissionId(null);
    }
  }

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
        subtitle="Chi tiết yêu cầu cứu trợ và các nhiệm vụ liên quan."
        actions={[
          { href: "/volunteer/requests", label: "Danh sách yêu cầu", variant: "secondary" },
          { href: "/volunteer/my-requests", label: "Đã tham gia" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <article className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Mức ưu tiên" value={priorityLabel(request.priority)} />
              <Info label="Trạng thái" value={requestStatusLabel(request.status)} />
              <Info label="TNV đã đăng ký" value={String(request.volunteerRequests.length)} />
            </div>
            {request.content && (
              <div className="formatted-description mt-5 rounded-xl bg-surface-low p-4 text-sm leading-6 text-text-subtle">
                {formatDescription(request.content)}
              </div>
            )}
            <div className="mt-5 rounded-xl bg-surface-low p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <MapPinned className="h-4 w-4" />
                {request.location?.name ?? "Chưa rõ địa điểm"}
              </p>
              {request.location?.description && <p className="formatted-description mt-2 text-sm text-text-subtle">{formatDescription(request.location.description)}</p>}
            </div>
          </article>

          <section className="overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline/15 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-primary">Vị trí yêu cầu cứu trợ</h2>
                <p className="mt-1 text-sm text-text-subtle">Bản đồ tự zoom vào địa điểm đang cần hỗ trợ.</p>
              </div>
              {request.location && (
                <span className="rounded-full bg-surface-low px-3 py-1 text-xs font-black text-primary">
                  {request.location.lat.toFixed(5)}, {request.location.lng.toFixed(5)}
                </span>
              )}
            </div>

            {mapLocation ? (
              <div className="relative">
                <MapView
                  locations={[mapLocation]}
                  selectedId={mapLocation.id}
                  height="420px"
                  className="rounded-none"
                  isFullscreen={isMapFullscreen}
                  onFullscreenToggle={() => setIsMapFullscreen((value) => !value)}
                >
                  <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[calc(100%-2rem)] rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${LOCATION_TYPE_CONFIG[mapLocation.type]?.color ?? "#2563eb"}22` }}>
                        {LOCATION_TYPE_CONFIG[mapLocation.type]?.emoji ?? "📍"}
                      </span>
                      <div>
                        <p className="break-words text-sm font-black text-text-main">{rescueRequestDisplayName(request)}</p>
                        <p className="text-xs font-semibold text-text-subtle">
                          {LOCATION_TYPE_CONFIG[mapLocation.type]?.label ?? mapLocation.type} · Khẩn {mapLocation.urgency}/5
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] grid gap-2 sm:grid-cols-3">
                    <MapMetric icon={MapPinned} label="Tọa độ" value={`${mapLocation.lat.toFixed(4)}, ${mapLocation.lng.toFixed(4)}`} />
                    <MapMetric icon={Navigation} label="Loại điểm" value={LOCATION_TYPE_CONFIG[mapLocation.type]?.label ?? mapLocation.type} />
                    <MapMetric icon={Maximize2} label="Mức khẩn" value={`${mapLocation.urgency}/5`} />
                  </div>
                </MapView>
              </div>
            ) : (
              <div className="p-6 text-sm text-text-subtle">Yêu cầu này chưa có dữ liệu vị trí.</div>
            )}
          </section>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <h2 className="text-lg font-black text-primary">Danh mục hàng cần hỗ trợ</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(request.requestItems ?? []).length === 0 ? (
                <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle md:col-span-2">Chưa có danh mục hàng chi tiết.</p>
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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-primary">Đăng ký tham gia</h2>
                <p className="mt-1 text-sm text-text-subtle">Gửi một ghi chú ngắn để ban điều phối xem xét.</p>
              </div>
              <CheckCircle2 className={`h-5 w-5 ${canRegister ? "text-emerald-600" : "text-text-subtle"}`} />
            </div>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Ghi chú ngắn về khả năng hỗ trợ, phương tiện hoặc thời gian của bạn"
              className="mt-4 w-full rounded-xl border border-outline/20 bg-surface px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />

            <button
              type="button"
              onClick={handleRegister}
              disabled={!canRegister || submitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Đăng ký tham gia
            </button>

            {message && <p className="mt-3 text-sm text-text-subtle">{message}</p>}
          </section>

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

          <BackButton fallbackHref="/volunteer/requests" className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-4 py-2 text-sm font-bold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </BackButton>
        </aside>
      </section>

      <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-primary">Nhiệm vụ và đội tham gia</h2>
            <p className="mt-1 text-sm text-text-subtle">Danh sách này chỉ hiển thị khi đăng ký của bạn đã được duyệt tham gia yêu cầu.</p>
          </div>
          {assignedMission && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Đã được phân công</span>}
        </div>

        <div className="mt-4 space-y-4">
          {operationalMissions.length === 0 ? (
            <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">
              {joined && !registrationApproved
                ? "Đăng ký của bạn đang chờ xét duyệt. Thông tin nhiệm vụ và danh sách TNV sẽ hiển thị sau khi được duyệt tham gia yêu cầu này."
                : "Chưa có nhiệm vụ nào được tạo cho yêu cầu này."}
            </p>
          ) : (
            operationalMissions.map((mission) => {
              const teams = mission.rescueTeams;
              const assignedHere = teams.some((team) => team.members.some((member) => member.userId === volunteer?.id));
              const isLeader = teams.some((team) => team.members.some((member) => member.userId === volunteer?.id && member.role === "DOI_TRUONG"));
              return (
                <article key={mission.id} className={`rounded-xl border p-4 ${assignedHere ? "border-emerald-200 bg-emerald-50/40" : "border-outline/10 bg-surface-low"}`}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-primary">{priorityLabel(mission.priority)}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-text-subtle">{missionStatusLabel(mission.status)}</span>
                        {assignedHere && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">Nhiệm vụ của bạn</span>}
                      </div>
                      <p className="mt-3 break-words text-lg font-black text-text-main">{mission.name}</p>
                      <p className="mt-1 text-sm text-text-subtle">{mission.missionType ?? "Nhiệm vụ hiện trường"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-xs">
                      <p className="flex items-center gap-1.5 font-black uppercase tracking-[0.08em] text-text-subtle"><CalendarClock className="h-3.5 w-3.5 text-primary" />Hạn lập đội</p>
                      <p className="mt-1 text-sm font-black text-text-main">{formatDeadline(mission.startedAt)}</p>
                      {isLeader && mission.status !== "HOAN_THANH" && (
                        <button
                          type="button"
                          onClick={() => handleCompleteMission(mission.id)}
                          disabled={completingMissionId === mission.id}
                          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {completingMissionId === mission.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Hoàn thành nhiệm vụ
                        </button>
                      )}
                    </div>
                  </div>

                  {(mission.transportations ?? []).length > 0 && (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {mission.transportations.map((transportation) => (
                        <div key={transportation.id} className="rounded-xl bg-white p-3 text-sm">
                          <p className="font-black text-text-main">{transportation.vehicleType} ({transportation.vehiclePlate})</p>
                          <p className="mt-1 text-text-subtle">{transportation.driverName} - {transportation.driverPhone}</p>
                          {transportation.notes && <p className="mt-1 text-xs italic text-text-subtle">{transportation.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {teams.length > 0 ? teams.map((team) => (
                      <div key={team.id} className="rounded-xl bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-sm font-black text-text-main">
                            <Users className="h-4 w-4 text-primary" />
                            {team.name}
                          </p>
                          <span className="rounded-full bg-surface-low px-2 py-0.5 text-[11px] font-black text-text-subtle">{team.members.length} thành viên</span>
                        </div>
                        <div className="mt-3 divide-y divide-outline/10 overflow-hidden rounded-xl border border-outline/10">
                          {team.members.map((member) => (
                            <div key={`${team.id}-${member.userId}`} className={`grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center ${member.userId === volunteer?.id ? "bg-emerald-50" : "bg-white"}`}>
                              <div className="min-w-0">
                                <p className="break-words text-sm font-black text-text-main">{member.user.name}</p>
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-text-subtle"><Phone className="h-3.5 w-3.5" />{member.user.phone}</p>
                              </div>
                              <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><ShieldCheck className="h-3.5 w-3.5" />{teamMemberRoleLabel(member.role)}</p>
                              <p className="text-xs text-text-subtle">{[member.user.address, member.user.ward, member.user.city].filter(Boolean).join(", ") || "Chưa cập nhật địa bàn"}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(member.user.skills ?? []).slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{skill}</span>)}
                                {(member.user.skills ?? []).length === 0 && <span className="text-xs text-text-subtle">Chưa cập nhật kỹ năng</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-xl bg-white p-3 text-sm text-text-subtle">Chưa lập đội cho nhiệm vụ này.</p>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
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

function MapMetric({ icon: Icon, label, value }: { icon: typeof MapPinned; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-text-main">{value}</p>
    </div>
  );
}
