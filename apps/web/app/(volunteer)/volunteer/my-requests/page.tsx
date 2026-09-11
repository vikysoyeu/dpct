"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Loader2, MapPinned, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { missionStatusLabel, priorityLabel, requestStatusLabel, useMyVolunteerRequests, volunteerRequestStatusLabel } from "@/hooks/useVolunteerPortal";
import { rescueRequestDisplayName } from "@/lib/rescue-request";
import { useAuthStore } from "@/stores/authStore";

function formatDate(value?: string | null) {
  if (!value) return "Chưa có hạn";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-low p-4">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">{label}</p>
      <p className="mt-2 text-2xl font-black text-primary">{value}</p>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof MapPinned; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-low p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-text-main">{value}</p>
    </div>
  );
}

export default function MyVolunteerRequestsPage() {
  const { volunteer } = useAuthStore();
  const { requests, total, loading, error, completeMission } = useMyVolunteerRequests();
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đăng ký của tôi"
        subtitle="Theo dõi yêu cầu đã đăng ký, nhiệm vụ được giao và đội phụ trách."
        actions={[
          { href: "/volunteer/requests", label: "Tìm yêu cầu mới" },
          { href: "/volunteer/profile", label: "Hồ sơ", variant: "secondary" },
        ]}
      />

      <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
        <div className="grid gap-3 md:grid-cols-3">
          <Summary label="Đã đăng ký" value={String(total)} />
          <Summary label="Đã được duyệt" value={String(requests.filter((item) => item.status === "DA_TIEP_NHAN" || item.status === "DANG_XU_LY").length)} />
          <Summary label="Có nhiệm vụ" value={String(requests.filter((item) => item.request.missions.some((mission) => mission.rescueTeams.some((team) => team.members.some((member) => member.userId === volunteer?.id)))).length)} />
        </div>
        {message && <p className="mt-3 rounded-xl bg-surface-low p-3 text-sm font-bold text-primary">{message}</p>}
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
      ) : requests.length === 0 ? (
        <div className="rounded-2xl bg-surface-card p-10 text-center shadow-ambient">
          <p className="text-sm text-text-subtle">Bạn chưa đăng ký yêu cầu cứu trợ nào.</p>
          <Link href="/volunteer/requests" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
            Xem yêu cầu cứu trợ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          {requests.map((registration) => {
            const assignedMission = registration.request.missions.find((mission) => mission.rescueTeams.some((team) => team.members.some((member) => member.userId === volunteer?.id)));
            const approved = registration.status === "DA_TIEP_NHAN" || registration.status === "DANG_XU_LY";
            return (
              <article key={registration.id} className="rounded-2xl bg-surface-card p-5 shadow-ambient">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-low px-2.5 py-1 text-[11px] font-black text-text-subtle">YCCT: {requestStatusLabel(registration.request.status)}</span>
                      <span className="rounded-full bg-surface-low px-2.5 py-1 text-[11px] font-black text-primary">{priorityLabel(registration.request.priority)}</span>
                      <span className="rounded-full bg-surface-low px-2.5 py-1 text-[11px] font-black text-primary">Đăng ký: {volunteerRequestStatusLabel(registration.status)}</span>
                      {assignedMission && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">Đã phân nhiệm vụ</span>}
                    </div>
                    <h2 className="mt-3 break-words text-xl font-black text-primary">{rescueRequestDisplayName(registration.request)}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-text-subtle">
                      <MapPinned className="h-4 w-4 text-primary" />
                      {registration.request.location?.name ?? "Chưa rõ địa điểm"}
                    </p>
                  </div>
                  <Link href={`/volunteer/requests/${registration.request.code}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
                    Chi tiết <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {registration.note && <p className="mt-4 rounded-xl bg-surface-low p-3 text-sm text-text-subtle">{registration.note}</p>}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <InfoLine icon={MapPinned} label="Địa điểm" value={registration.request.location?.name ?? "Chưa rõ địa điểm"} />
                  <InfoLine icon={Users} label="TNV đăng ký" value={`${registration.request.volunteerRequests.length} người`} />
                  <InfoLine icon={CalendarClock} label="Ngày đăng ký" value={formatDate(registration.submittedAt)} />
                </div>

                <div className="mt-4 grid gap-3">
                  {registration.request.missions.length === 0 ? (
                    <p className="rounded-xl bg-surface-low p-4 text-sm text-text-subtle">
                      {approved
                        ? "Chưa có nhiệm vụ nào được tạo cho yêu cầu này."
                        : "Đăng ký đang chờ xét duyệt. Thông tin nhiệm vụ và danh sách đội sẽ hiển thị sau khi bạn được duyệt tham gia yêu cầu này."}
                    </p>
                  ) : registration.request.missions.map((mission) => {
                    const teams = mission.rescueTeams;
                    const assignedHere = teams.some((team) => team.members.some((member) => member.userId === volunteer?.id));
                    const isLeader = teams.some((team) => team.members.some((member) => member.userId === volunteer?.id && member.role === "DOI_TRUONG"));
                    return (
                      <div key={mission.id} className={`rounded-xl border p-4 ${assignedHere ? "border-emerald-200 bg-emerald-50/40" : "border-outline/10 bg-surface-low"}`}>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-primary">{missionStatusLabel(mission.status)}</span>
                              {assignedHere && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">Nhiệm vụ của bạn</span>}
                            </div>
                            <p className="mt-3 font-bold text-text-main">{mission.name}</p>
                            <p className="mt-1 text-xs text-text-subtle">{mission.missionType ?? "Nhiệm vụ hiện trường"}</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle">
                              <CalendarClock className="h-3.5 w-3.5 text-primary" />
                              Hạn lập đội
                            </p>
                            <p className="mt-1 text-sm font-black text-text-main">{formatDate(mission.startedAt)}</p>
                          </div>
                        </div>
                        {isLeader && mission.status !== "HOAN_THANH" && (
                          <button
                            type="button"
                            onClick={() => handleCompleteMission(mission.id)}
                            disabled={completingMissionId === mission.id}
                            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                          >
                            {completingMissionId === mission.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Hoàn thành nhiệm vụ
                          </button>
                        )}
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {teams.length > 0 ? teams.map((team) => (
                            <div key={team.id} className="rounded-xl bg-white p-3">
                              <p className="flex items-center gap-2 text-sm font-black text-text-main">
                                <Users className="h-4 w-4 text-primary" />
                                {team.name}
                              </p>
                              <p className="mt-1 text-xs text-text-subtle">{team.members.length} thành viên. Xem chi tiết để xem danh sách TNV.</p>
                            </div>
                          )) : (
                            <p className="rounded-xl bg-white p-3 text-sm text-text-subtle">Chưa lập đội cho nhiệm vụ này.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
