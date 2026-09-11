"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, Mail, Package, Plus, Save, Trash2, UserRound, Users, X } from "lucide-react";
import { VietnamAddressFields } from "@/components/address/VietnamAddressFields";
import { PageHeader } from "@/components/layout/page-header";
import { useVolunteers } from "@/hooks/useVolunteers";
import { useVolunteerTeams } from "@/hooks/useVolunteerTeams";
import { useAdminRescueRequests, missionStatusLabel, priorityLabel, requestStatusLabel, volunteerRequestStatusLabel } from "@/hooks/useAdminRescue";
import { rescueRequestDisplayName, rescueRequestSearchText } from "@/lib/rescue-request";
import { formatDescription } from "@/lib/text-format";
import { isValidPhone } from "@/lib/validation";

type Tab = "teams" | "volunteers";
type BuilderView = "requests" | "missions";
type ResourceErrors = Partial<Record<"rescueTeamName" | "teamName" | "volName" | "volPhone", string>>;

const VOLUNTEER_STATUS_LABEL: Record<string, string> = { AVAILABLE: "Sẵn sàng", ON_MISSION: "Đang làm nhiệm vụ", RESTING: "Nghỉ" };
const ACCOUNT_STATUS_LABEL: Record<string, string> = { HOAT_DONG: "Hoạt động", CHO_DUYET: "Chờ duyệt", TAM_DUNG: "Tạm dừng", KHOA: "Khóa" };
const MEMBER_ROLE_LABEL: Record<string, string> = { DOI_TRUONG: "Đội trưởng", DOI_PHO: "Đội phó", THANH_VIEN: "Thành viên", CONG_TAC_VIEN: "Cộng tác viên" };
const MEMBER_ROLES = ["DOI_TRUONG", "DOI_PHO", "THANH_VIEN", "CONG_TAC_VIEN"];
const REQUEST_STATUSES = ["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const MISSION_STATUSES = ["CHO_TIEP_NHAN", "DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const REQUEST_TEAM_ASSIGNABLE_STATUSES = new Set(["DANG_THUC_HIEN"]);
const MISSION_TEAM_ASSIGNABLE_STATUSES = new Set(["DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG"]);
const PRIORITIES = ["KHAN_CAP", "CAO", "TRUNG_BINH", "THAP"];
const priorityRank: Record<string, number> = { KHAN_CAP: 4, CAO: 3, TRUNG_BINH: 2, THAP: 1 };
const priorityTone: Record<string, string> = {
  KHAN_CAP: "border-rose-300 bg-rose-50 text-rose-700",
  CAO: "border-orange-300 bg-orange-50 text-orange-700",
  TRUNG_BINH: "border-amber-300 bg-amber-50 text-amber-700",
  THAP: "border-emerald-300 bg-emerald-50 text-emerald-700",
};
const statusTone: Record<string, string> = {
  CHO_TIEP_NHAN: "bg-amber-100 text-amber-800",
  DANG_TUYEN: "bg-blue-100 text-blue-800",
  DA_DU_DOI: "bg-indigo-100 text-indigo-800",
  DA_DU_HANG: "bg-cyan-100 text-cyan-800",
  SAN_SANG: "bg-emerald-100 text-emerald-800",
  DANG_THUC_HIEN: "bg-violet-100 text-violet-800",
  HOAN_THANH: "bg-emerald-100 text-emerald-800",
  HUY_BO: "bg-rose-100 text-rose-800",
};

const roleTone: Record<string, string> = {
  DOI_TRUONG: "bg-amber-50 text-amber-700 border-amber-300",
  DOI_PHO: "bg-blue-50 text-blue-700 border-blue-300",
  THANH_VIEN: "bg-emerald-50 text-emerald-700 border-emerald-300",
  CONG_TAC_VIEN: "bg-slate-50 text-slate-700 border-slate-300",
};

const accountStatusTone: Record<string, string> = {
  HOAT_DONG: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CHO_DUYET: "bg-amber-100 text-amber-800 border-amber-200",
  TAM_DUNG: "bg-orange-100 text-orange-800 border-orange-200",
  KHOA: "bg-rose-100 text-rose-800 border-rose-200",
};

const ROLE_RANK: Record<string, number> = {
  DOI_TRUONG: 4,
  DOI_PHO: 3,
  CONG_TAC_VIEN: 2,
  THANH_VIEN: 1,
};

export default function AdminResourcesPage() {
  const { volunteers, total: totalVol, loading: loadingVol, createVolunteer, updateVolunteer, deleteVolunteer } = useVolunteers();
  const { teams, total: totalTeams, loading: loadingTeams, createTeam, deleteTeam } = useVolunteerTeams();
  const { requests, loading: loadingRequests, createRescueTeam } = useAdminRescueRequests();

  const [activeTab, setActiveTab] = useState<Tab>("volunteers");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");

  const [volName, setVolName] = useState("");
  const [volPhone, setVolPhone] = useState("");
  const [volSkills, setVolSkills] = useState("");
  const [volTeamId, setVolTeamId] = useState("");
  const [volStatus, setVolStatus] = useState("AVAILABLE");
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamWard, setTeamWard] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  const [requestId, setRequestId] = useState("");
  const [missionId, setMissionId] = useState("");
  const [rescueTeamName, setRescueTeamName] = useState("");
  const [resourceQuery, setResourceQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [requestPriorityFilter, setRequestPriorityFilter] = useState("ALL");
  const [requestSort, setRequestSort] = useState("DEADLINE_ASC");
  const [builderView, setBuilderView] = useState<BuilderView>("requests");
  const [resourceErrors, setResourceErrors] = useState<ResourceErrors>({});

  const loading = loadingVol || loadingTeams || loadingRequests;
  const selectedRequest = requests.find((item) => item.id === requestId) ?? requests[0] ?? null;
  const selectedMission = selectedRequest?.missions.find((item) => item.id === missionId) ?? selectedRequest?.missions[0] ?? null;
  const canAssignSelectedMission = Boolean(
    selectedRequest
    && selectedMission
    && REQUEST_TEAM_ASSIGNABLE_STATUSES.has(selectedRequest.status)
    && MISSION_TEAM_ASSIGNABLE_STATUSES.has(selectedMission.status),
  );
  const existingRescueTeam = selectedMission?.rescueTeams[0] ?? null;
  const registeredVolunteerIds = useMemo(
    () => new Set(selectedRequest?.volunteerRequests.map((item) => item.volunteerId) ?? []),
    [selectedRequest],
  );
  const currentMissionMemberRoles = useMemo(() => {
    const roles = new Map<string, string>();
    existingRescueTeam?.members.forEach((member) => {
      roles.set(member.userId, member.role);
    });
    return roles;
  }, [existingRescueTeam]);
  const otherMissionMemberIds = useMemo(() => {
    const ids = new Set<string>();
    selectedRequest?.missions
      .filter((mission) => mission.id !== selectedMission?.id)
      .forEach((mission) => {
        mission.rescueTeams.forEach((team) => {
          team.members.forEach((member) => ids.add(member.userId));
        });
      });
    return ids;
  }, [selectedRequest, selectedMission?.id]);

  function defaultRescueTeamName(missionName?: string) {
    return missionName ? `Đội thực hiện nhiệm vụ ${missionName}` : "";
  }

  useEffect(() => {
    const nextRoles: Record<string, string> = {};
    existingRescueTeam?.members.forEach((member) => {
      if (registeredVolunteerIds.has(member.userId) && !otherMissionMemberIds.has(member.userId)) {
        nextRoles[member.userId] = member.role;
      }
    });
    setMemberRoles(nextRoles);
    setRescueTeamName(existingRescueTeam?.name ?? defaultRescueTeamName(selectedMission?.name));
  }, [selectedMission?.id, existingRescueTeam, registeredVolunteerIds, otherMissionMemberIds]);

  const registeredSkills = useMemo(() => {
    const skills = new Set<string>();
    selectedRequest?.volunteerRequests.forEach((item) => item.volunteer.skills.forEach((skill) => skills.add(skill)));
    return [...skills].sort((a, b) => a.localeCompare(b));
  }, [selectedRequest]);

  const filteredRegistrations = useMemo(() => {
    const keyword = resourceQuery.trim().toLowerCase();
    return selectedRequest?.volunteerRequests.filter((registration) => {
      const volunteer = registration.volunteer;
      const haystack = `${volunteer.name} ${volunteer.phone} ${volunteer.skills.join(" ")} ${volunteer.city ?? ""} ${volunteer.ward ?? ""}`.toLowerCase();
      const matchQuery = !keyword || haystack.includes(keyword);
      const matchSkill = skillFilter === "ALL" || volunteer.skills.includes(skillFilter);
      const availableForMission = !otherMissionMemberIds.has(volunteer.id) || currentMissionMemberRoles.has(volunteer.id);
      return availableForMission && matchQuery && matchSkill;
    }) ?? [];
  }, [selectedRequest, resourceQuery, skillFilter, otherMissionMemberIds, currentMissionMemberRoles]);
  const orderedFilteredRegistrations = useMemo(() => {
    const persisted = filteredRegistrations.filter((registration) => currentMissionMemberRoles.has(registration.volunteerId));
    const unpersisted = filteredRegistrations.filter((registration) => !currentMissionMemberRoles.has(registration.volunteerId));
    const combined = persisted.concat(unpersisted);

    return [...combined].sort((a, b) => {
      const roleA = memberRoles[a.volunteerId];
      const roleB = memberRoles[b.volunteerId];
      const rankA = roleA ? (ROLE_RANK[roleA] ?? 0) : 0;
      const rankB = roleB ? (ROLE_RANK[roleB] ?? 0) : 0;

      if (rankA !== rankB) {
        return rankB - rankA;
      }

      const inTeamA = currentMissionMemberRoles.has(a.volunteerId);
      const inTeamB = currentMissionMemberRoles.has(b.volunteerId);
      if (inTeamA && !inTeamB) return -1;
      if (inTeamB && !inTeamA) return 1;

      return 0;
    });
  }, [filteredRegistrations, currentMissionMemberRoles, memberRoles]);

  const resetForms = () => {
    setVolName(""); setVolPhone(""); setVolSkills(""); setVolTeamId(""); setVolStatus("AVAILABLE");
    setTeamName(""); setTeamCity(""); setTeamWard(""); setTeamDesc("");
    setResourceErrors({});
    setShowForm(false);
  };

  const selectedMemberIds = Object.keys(memberRoles);
  const requestNeedSummary = (request: typeof requests[number]) => {
    const items = request.requestItems ?? [];
    if (items.length > 0) {
      return items.slice(0, 3).map((item) => `${item.itemCategory?.name ?? item.itemCategoryId}: ${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()).join(", ");
    }
    return formatDescription(request.content) || "Chưa có mô tả nhu cầu";
  };
  const formatDeadline = (value?: string | null) => {
    if (!value) return "Chưa có hạn";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  };
  const deadlineTone = (value?: string | null) => {
    if (!value) return "bg-slate-100 text-slate-600";
    const diff = new Date(value).getTime() - Date.now();
    if (diff < 0) return "bg-rose-100 text-rose-800";
    if (diff < 24 * 60 * 60 * 1000) return "bg-orange-100 text-orange-800";
    if (diff < 7 * 24 * 60 * 60 * 1000) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  };
  const nearestMissionDeadline = (request: typeof requests[number]) => {
    const timestamps = request.missions
      .map((mission) => mission.startedAt ? new Date(mission.startedAt).getTime() : Number.POSITIVE_INFINITY)
      .sort((a, b) => a - b);
    return Number.isFinite(timestamps[0]) ? new Date(timestamps[0]).toISOString() : null;
  };
  const teamBuilderRequests = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    const filtered = requests.filter((item) => {
      const haystack = `${rescueRequestSearchText(item)} ${item.content ?? ""} ${item.requesterName ?? ""} ${item.requesterPhone ?? ""} ${item.location?.name ?? ""} ${requestNeedSummary(item)}`.toLowerCase();
      const matchKeyword = !keyword || haystack.includes(keyword);
      const matchStatus = requestStatusFilter === "ALL" || item.status === requestStatusFilter;
      const matchPriority = requestPriorityFilter === "ALL" || item.priority === requestPriorityFilter;
      return matchKeyword && matchStatus && matchPriority;
    });
    return filtered.sort((a, b) => {
      if (requestSort === "PRIORITY_DESC") return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
      if (requestSort === "MOST_VOLUNTEERS") return b.volunteerRequests.length - a.volunteerRequests.length;
      if (requestSort === "NEWEST") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      const aDeadline = nearestMissionDeadline(a);
      const bDeadline = nearestMissionDeadline(b);
      return (aDeadline ? new Date(aDeadline).getTime() : Number.POSITIVE_INFINITY) - (bDeadline ? new Date(bDeadline).getTime() : Number.POSITIVE_INFINITY);
    });
  }, [requests, requestSearch, requestStatusFilter, requestPriorityFilter, requestSort]);

  const teamBuilderMissions = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    const data = requests.flatMap((requestItem) => requestItem.missions.map((mission) => ({ request: requestItem, mission }))).filter(({ request: requestItem, mission }) => {
      const transSearch = (mission.transportations ?? []).map((t) => `${t.vehicleType} ${t.vehiclePlate} ${t.driverName} ${t.driverPhone} ${t.notes ?? ""}`).join(" ");
      const haystack = `${mission.name} ${mission.missionType ?? ""} ${transSearch} ${rescueRequestSearchText(requestItem)} ${requestItem.location?.name ?? ""}`.toLowerCase();
      const matchKeyword = !keyword || haystack.includes(keyword);
      const matchStatus = requestStatusFilter === "ALL" || mission.status === requestStatusFilter;
      const matchPriority = requestPriorityFilter === "ALL" || mission.priority === requestPriorityFilter;
      return matchKeyword && matchStatus && matchPriority;
    });
    return data.sort((a, b) => {
      if (requestSort === "PRIORITY_DESC") return (priorityRank[b.mission.priority] ?? 0) - (priorityRank[a.mission.priority] ?? 0);
      if (requestSort === "MOST_VOLUNTEERS") return b.request.volunteerRequests.length - a.request.volunteerRequests.length;
      if (requestSort === "NEWEST") return new Date(b.request.submittedAt).getTime() - new Date(a.request.submittedAt).getTime();
      const aTime = a.mission.startedAt ? new Date(a.mission.startedAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.mission.startedAt ? new Date(b.mission.startedAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [requests, requestSearch, requestStatusFilter, requestPriorityFilter, requestSort]);
  const builderStatusOptions = builderView === "missions" ? MISSION_STATUSES : REQUEST_STATUSES;

  async function handleSubmitRescueTeam() {
    if (!validateResourceField("rescueTeamName", rescueTeamName)) return;
    if (!selectedMission || !canAssignSelectedMission) return;
    setSubmitting(true);
    try {
      await createRescueTeam({
        missionId: selectedMission.id,
        teamName: rescueTeamName,
        type: selectedMission.missionType || "Cứu trợ",
        members: selectedMemberIds.map((userId) => ({ userId, role: memberRoles[userId] })),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitVolunteer() {
    const validName = validateResourceField("volName", volName);
    const validPhone = validateResourceField("volPhone", volPhone);
    if (!validName || !validPhone) return;
    setSubmitting(true);
    try {
      await createVolunteer({ name: volName, phone: volPhone, skills: volSkills ? volSkills.split(",").map((s) => s.trim()).filter(Boolean) : [], teamId: volTeamId || undefined, status: volStatus });
      resetForms();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitTeam() {
    if (!validateResourceField("teamName", teamName)) return;
    setSubmitting(true);
    try {
      await createTeam({ name: teamName, city: teamCity || undefined, ward: teamWard || undefined, description: teamDesc || undefined });
      resetForms();
    } finally {
      setSubmitting(false);
    }
  }

  function resourceError(key: keyof ResourceErrors, value: string) {
    const trimmed = value.trim();
    if (key === "rescueTeamName" && !trimmed) return "Tên đội TNV bắt buộc nhập.";
    if (key === "teamName" && !trimmed) return "Tên đội bắt buộc nhập.";
    if (key === "volName" && !trimmed) return "Họ tên bắt buộc nhập.";
    if (key === "volPhone") {
      if (!trimmed) return "SĐT bắt buộc nhập.";
      if (!isValidPhone(trimmed)) return "Số điện thoại tình nguyện viên không hợp lệ.";
    }
    return "";
  }

  function validateResourceField(key: keyof ResourceErrors, value: string) {
    const message = resourceError(key, value);
    setResourceErrors((current) => ({ ...current, [key]: message || undefined }));
    return !message;
  }

  function updateResourceField(key: keyof ResourceErrors, value: string) {
    if (key === "rescueTeamName") setRescueTeamName(value);
    if (key === "teamName") setTeamName(value);
    if (key === "volName") setVolName(value);
    if (key === "volPhone") setVolPhone(value);
    if (resourceErrors[key]) {
      setResourceErrors((current) => ({ ...current, [key]: resourceError(key, value) || undefined }));
    }
  }

  const filteredVolunteers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return volunteers.filter((vol) => {
      const text = `${vol.name} ${vol.phone} ${vol.skills.join(" ")}`.toLowerCase();
      return (!keyword || text.includes(keyword)) && (statusFilter === "ALL" || vol.status === statusFilter) && (teamFilter === "ALL" || vol.teamId === teamFilter);
    });
  }, [volunteers, query, statusFilter, teamFilter]);

  const filteredTeams = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? teams.filter((team) => `${team.name} ${team.city ?? ""} ${team.ward ?? ""}`.toLowerCase().includes(keyword)) : teams;
  }, [teams, query]);

  const tabs: { key: Tab; label: string; icon: typeof UserRound; count: number }[] = [
    { key: "volunteers", label: "Tình nguyện viên", icon: UserRound, count: totalVol },
    { key: "teams", label: "Đội TNV", icon: Users, count: totalTeams },
  ];
  const filteredVolunteerIds = filteredRegistrations.map((item) => item.volunteerId);
  const persistedTeamMemberIds = existingRescueTeam?.members.map((member) => member.userId) ?? [];
  const visiblePersistedMemberIds = persistedTeamMemberIds.filter((id) => filteredVolunteerIds.includes(id));
  const allFilteredSelected = filteredVolunteerIds.length > 0 && filteredVolunteerIds.every((id) => id in memberRoles);
  const registrationGridClass = "grid grid-cols-[36px_360px_190px_260px_340px_280px_220px_52px] items-center gap-4";
  const frozenRegistrationColumnsClass = "sticky left-0 z-10 col-span-2 grid h-full w-[412px] grid-cols-[36px_360px] items-center gap-4";
  const frozenRegistrationHeaderColumnsClass = "sticky left-0 z-[16] col-span-2 grid h-full w-[412px] grid-cols-[36px_360px] items-center gap-4";

  function toggleAllFiltered(checked: boolean) {
    const next = { ...memberRoles };
    if (checked) {
      filteredRegistrations.forEach((registration) => {
        if (!(registration.volunteerId in next)) {
          next[registration.volunteerId] = Object.keys(next).length === 0 ? "DOI_TRUONG" : "THANH_VIEN";
        }
      });
    } else {
      filteredVolunteerIds.forEach((id) => {
        delete next[id];
      });
    }
    setMemberRoles(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin - Quản lý Nguồn lực"
        subtitle="Lập đội TNV theo từng nhiệm vụ của yêu cầu cứu trợ và quản lý nguồn lực tình nguyện."
        actions={[{ href: "/admin/needs", label: "Yêu cầu cứu trợ" }]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-sm font-semibold text-text-subtle">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          <section className="ui-grid-cards grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: "Đội TNV", value: totalTeams, icon: Users },
              { title: "Tình nguyện viên", value: totalVol, icon: UserRound },
              { title: "Nhiệm vụ mở", value: requests.reduce((sum, item) => sum + item.missions.filter((mission) => mission.status !== "HOAN_THANH" && mission.status !== "HUY_BO").length, 0), icon: Package },
            ].map((card) => (
              <article key={card.title} className="ui-card ui-card-sm rounded-2xl bg-surface-card p-5 shadow-ambient">
                <div className="flex items-center justify-between">
                  <p className="font-label text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{card.title}</p>
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-4 text-4xl font-black text-primary">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-black text-primary">Lập đội TNV theo nhiệm vụ</h2>
                <p className="mt-0.5 text-xs text-text-subtle">Chọn yêu cầu, chọn nhiệm vụ và phân công TNV phù hợp.</p>
              </div>
              <div className="inline-flex rounded-xl bg-surface-low p-1">
                <button type="button" onClick={() => { setBuilderView("requests"); setRequestStatusFilter("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${builderView === "requests" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Theo yêu cầu</button>
                <button type="button" onClick={() => { setBuilderView("missions"); setRequestStatusFilter("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${builderView === "missions" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Theo nhiệm vụ</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)]">
                <div className="rounded-xl border border-outline/15 bg-surface p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">{builderView === "requests" ? "Yêu cầu cần hỗ trợ" : "Danh sách nhiệm vụ"}</p>
                      <p className="mt-0.5 text-xs text-text-subtle">{builderView === "requests" ? "Hiển thị toàn bộ yêu cầu; chỉ yêu cầu đang thực hiện được lập/lưu đội theo nhiệm vụ." : "Mặc định sắp xếp theo hạn lập đội gần nhất."}</p>
                    </div>
                    <span className="rounded-full bg-surface-low px-2 py-1 text-[11px] font-black text-text-subtle">{builderView === "requests" ? `${teamBuilderRequests.length}/${requests.length}` : `${teamBuilderMissions.length} nhiệm vụ`}</span>
                  </div>
                  <div className="mb-3 grid gap-2">
                    <input
                      className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm"
                      placeholder="Tìm tên yêu cầu, địa điểm, liên hệ, nhu cầu..."
                      value={requestSearch}
                      onChange={(e) => setRequestSearch(e.target.value)}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={requestStatusFilter} onChange={(e) => setRequestStatusFilter(e.target.value)}>
                        <option value="ALL">Tất cả trạng thái</option>
                        {builderStatusOptions.map((item) => <option key={item} value={item}>{builderView === "missions" ? missionStatusLabel(item) : requestStatusLabel(item)}</option>)}
                      </select>
                      <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={requestPriorityFilter} onChange={(e) => setRequestPriorityFilter(e.target.value)}>
                        <option value="ALL">Tất cả ưu tiên</option>
                        {PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
                      </select>
                      <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={requestSort} onChange={(e) => setRequestSort(e.target.value)}>
                        <option value="DEADLINE_ASC">Hạn gần nhất</option>
                        <option value="PRIORITY_DESC">Ưu tiên cao nhất</option>
                        <option value="MOST_VOLUNTEERS">Nhiều TNV đăng ký</option>
                        <option value="NEWEST">Mới nhất</option>
                      </select>
                    </div>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {builderView === "requests" && (teamBuilderRequests.length === 0 ? (
                      <p className="rounded-lg bg-surface-low p-3 text-sm text-text-subtle">Không có yêu cầu phù hợp.</p>
                    ) : teamBuilderRequests.map((item) => {
                      const active = selectedRequest?.id === item.id;
                      const nearestDeadline = nearestMissionDeadline(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setRequestId(item.id); setMissionId(""); setMemberRoles({}); }}
                          className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-outline/10 bg-white hover:border-primary/30 hover:bg-surface-low/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-text-main">{rescueRequestDisplayName(item)}</p>
                              <p className="formatted-description mt-1 line-clamp-2 text-xs leading-5 text-text-subtle">{requestNeedSummary(item)}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusTone[item.status] ?? "bg-slate-100 text-slate-700"}`}>
                              {requestStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityTone[item.priority] ?? priorityTone.TRUNG_BINH}`}>{priorityLabel(item.priority)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${deadlineTone(nearestDeadline)}`}>Hạn gần nhất: {formatDeadline(nearestDeadline)}</span>
                            <span className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-bold text-text-subtle">{item.volunteerRequests.length} TNV đăng ký</span>
                            <span className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-bold text-text-subtle">{item.missions.length} nhiệm vụ</span>
                            {!REQUEST_TEAM_ASSIGNABLE_STATUSES.has(item.status) && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chưa thể lập đội</span>
                            )}
                          </div>
                        </button>
                      );
                    }))}
                    {builderView === "missions" && (teamBuilderMissions.length === 0 ? (
                      <p className="rounded-lg bg-surface-low p-3 text-sm text-text-subtle">Không có nhiệm vụ phù hợp.</p>
                    ) : teamBuilderMissions.map(({ request: requestItem, mission }) => {
                      const active = selectedMission?.id === mission.id;
                      const memberCount = mission.rescueTeams[0]?.members.length ?? 0;
                      return (
                        <button
                          key={mission.id}
                          type="button"
                          onClick={() => { setRequestId(requestItem.id); setMissionId(mission.id); setMemberRoles({}); }}
                          className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-outline/10 bg-white hover:border-primary/30 hover:bg-surface-low/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-text-main">{mission.name}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-text-subtle">{rescueRequestDisplayName(requestItem)}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusTone[mission.status] ?? "bg-slate-100 text-slate-700"}`}>
                              {missionStatusLabel(mission.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityTone[mission.priority] ?? priorityTone.TRUNG_BINH}`}>{priorityLabel(mission.priority)}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${deadlineTone(mission.startedAt)}`}><CalendarClock className="h-3 w-3" />{formatDeadline(mission.startedAt)}</span>
                            <span className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-bold text-text-subtle">{memberCount} TNV trong đội</span>
                            {!REQUEST_TEAM_ASSIGNABLE_STATUSES.has(requestItem.status) || !MISSION_TEAM_ASSIGNABLE_STATUSES.has(mission.status) ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chưa thể lập đội</span>
                            ) : null}
                          </div>
                        </button>
                      );
                    }))}
                  </div>
                </div>

                <div className="rounded-xl border border-outline/15 bg-surface p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Nhiệm vụ</p>
                      <p className="mt-0.5 text-xs text-text-subtle">Chọn việc cần lập đội và kiểm tra thời hạn.</p>
                    </div>
                    <span className="rounded-full bg-surface-low px-2 py-1 text-[11px] font-black text-text-subtle">{selectedRequest?.missions.length ?? 0}</span>
                  </div>
                  <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {!selectedRequest || selectedRequest.missions.length === 0 ? (
                      <p className="rounded-lg bg-surface-low p-3 text-sm text-text-subtle md:col-span-2">Yêu cầu này chưa có nhiệm vụ.</p>
                    ) : selectedRequest.missions.map((mission) => {
                      const active = selectedMission?.id === mission.id;
                      const memberCount = mission.rescueTeams[0]?.members.length ?? 0;
                      return (
                        <button
                          key={mission.id}
                          type="button"
                          onClick={() => { setMissionId(mission.id); setMemberRoles({}); }}
                          className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-outline/10 bg-white hover:border-primary/30 hover:bg-surface-low/40"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-text-main">{mission.name}</p>
                              <p className="mt-1 text-xs text-text-subtle">{mission.missionType || "Chưa phân loại"}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityTone[mission.priority] ?? priorityTone.TRUNG_BINH}`}>{priorityLabel(mission.priority)}</span>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs">
                            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 font-black ${statusTone[mission.status] ?? "bg-slate-100 text-slate-700"}`}>{missionStatusLabel(mission.status)}</span>
                            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 font-black ${deadlineTone(mission.startedAt)}`}>Hạn lập đội: {formatDeadline(mission.startedAt)}</span>
                            <span className="text-text-subtle">{memberCount > 0 ? `${memberCount} TNV trong đội` : "Chưa có TNV trong đội"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedMission && (
                <div className="grid gap-3 rounded-xl border border-outline/15 bg-surface-low p-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-text-subtle">Nhiệm vụ đang chọn</p>
                    <p className="mt-1 font-bold text-text-main">{selectedMission.name}</p>
                    <p className="mt-1 text-xs leading-5 text-text-subtle">
                      {(selectedMission.transportations ?? []).map(t => `${t.vehicleType} (${t.vehiclePlate}) - ${t.driverName}`).join(", ") || "Chưa có vận chuyển."}
                    </p>
                  </div>
                  <InfoPill label="Loại" value={selectedMission.missionType || "Chưa phân loại"} />
                  <InfoPill label="Trạng thái" value={missionStatusLabel(selectedMission.status)} />
                  <InfoPill label="Hạn lập đội" value={formatDeadline(selectedMission.startedAt)} />
                  <Link
                    href={`/admin/email?type=mission-team&missionId=${selectedMission.id}`}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-black ${existingRescueTeam?.members.some((member) => member.user.email) ? "border-primary/20 bg-white text-primary hover:bg-primary/5" : "pointer-events-none border-outline/10 bg-white text-text-subtle/40"}`}
                    title={existingRescueTeam?.members.some((member) => member.user.email) ? "Gửi email cả đội TNV" : "Đội chưa có thành viên có email"}
                  >
                    <Mail className="h-4 w-4" />
                    Email đội
                  </Link>
                  {!canAssignSelectedMission && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 md:col-span-6">
                      Yêu cầu phải ở trạng thái Đang thực hiện và nhiệm vụ phải ở Đang tuyển, Đã đủ đội, Đã đủ hàng hoặc Sẵn sàng mới được lập/lưu đội TNV.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-outline/15 bg-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="font-black text-text-main">Danh sách TNV đăng ký yêu cầu</h3>
                    <p className="mt-1 text-xs text-text-subtle">{filteredRegistrations.length} phù hợp bộ lọc · {visiblePersistedMemberIds.length} đang hiện trong đội · {selectedMemberIds.length} tổng đã chọn</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_auto] lg:min-w-[620px]">
                    <input className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" placeholder="Tìm tên, SĐT, kỹ năng, địa bàn..." value={resourceQuery} onChange={(e) => setResourceQuery(e.target.value)} />
                    <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
                      <option value="ALL">Tất cả kỹ năng</option>
                      {registeredSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                    </select>
                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm font-bold text-text-main">
                      <input type="checkbox" checked={allFilteredSelected} onChange={(e) => toggleAllFiltered(e.target.checked)} disabled={filteredRegistrations.length === 0} />
                      Chọn tất cả
                    </label>
                  </div>
                </div>

                <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-outline/10">
                  {!selectedRequest ? (
                    <p className="p-5 text-sm text-text-subtle">Chưa có yêu cầu cứu trợ.</p>
                  ) : filteredRegistrations.length === 0 ? (
                    <p className="p-5 text-sm text-text-subtle">Không có TNV đăng ký phù hợp bộ lọc.</p>
                  ) : (
                    <div className="min-w-[1990px] divide-y divide-outline/10">
                      <div className={`${registrationGridClass} sticky top-0 z-[15] bg-surface-low px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-text-subtle`}>
                        <div className={`${frozenRegistrationHeaderColumnsClass} bg-surface-low`}>
                          <div>Chọn</div>
                          <div>Tình nguyện viên</div>
                        </div>
                        <div>Vai trò</div>
                        <div>Kỹ năng</div>
                        <div>Phương tiện/Lịch rảnh</div>
                        <div>Kinh nghiệm/Ghi chú</div>
                        <div>Liên hệ khẩn cấp</div>
                        <div>Email</div>
                      </div>
                      {orderedFilteredRegistrations.map((registration) => {
                        const volunteer = registration.volunteer;
                        const checked = volunteer.id in memberRoles;
                        const inSavedTeam = persistedTeamMemberIds.includes(volunteer.id);
                        const rowBgClass = checked ? "bg-[#ecf0f4]" : "bg-white";
                        return (
                          <div key={registration.id} className={`${registrationGridClass} ${rowBgClass} px-4 py-3 text-sm`}>
                            <div className={`${frozenRegistrationColumnsClass} ${rowBgClass}`}>
                              <div className="min-w-0 flex items-start md:items-center">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 md:mt-0"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = { ...memberRoles };
                                    if (e.target.checked) next[volunteer.id] = selectedMemberIds.length === 0 ? "DOI_TRUONG" : "THANH_VIEN";
                                    else delete next[volunteer.id];
                                    setMemberRoles(next);
                                  }}
                                />
                              </div>
                              <div className="min-w-0 whitespace-normal">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="min-w-0 break-words font-bold text-text-main">{volunteer.name}</p>
                                  {inSavedTeam && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Đã lưu đội</span>}
                                </div>
                                <p className="mt-0.5 break-words text-xs text-text-subtle">{volunteer.phone} · {volunteer.email || "chưa có email"}</p>
                                <p className="mt-0.5 break-words text-xs text-text-subtle">{[volunteer.address, volunteer.ward, volunteer.city].filter(Boolean).join(", ") || "chưa có địa bàn"}</p>
                              </div>
                            </div>
                            <div className="min-w-0">
                              {checked ? (
                                <select className={`w-44 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${roleTone[memberRoles[volunteer.id]] ?? "border-outline/20 bg-surface text-text-main"}`} value={memberRoles[volunteer.id]} onChange={(e) => setMemberRoles({ ...memberRoles, [volunteer.id]: e.target.value })}>
                                  {MEMBER_ROLES.map((role) => <option key={role} value={role}>{MEMBER_ROLE_LABEL[role]}</option>)}
                                </select>
                              ) : (
                                <span className="inline-flex w-44 text-xs font-semibold text-text-subtle">Chưa chọn vào đội</span>
                              )}
                            </div>

                            <div className="min-w-0 flex flex-wrap gap-1.5">
                              {volunteer.skills.length > 0
                                ? volunteer.skills.map((skill) => <span key={skill} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{skill}</span>)
                                : <span className="text-xs text-text-subtle">Chưa có kỹ năng</span>}
                            </div>
                            <div className="min-w-0 space-y-1 break-words text-xs text-text-subtle">
                              <p className="font-bold text-text-main">{volunteer.vehicleType || "Chưa cập nhật phương tiện"}</p>
                              <p>{volunteer.availability || "Chưa cập nhật lịch rảnh"}</p>
                            </div>
                            <div className="min-w-0 space-y-1 break-words text-xs text-text-subtle">
                              <p>{volunteer.experience || "Chưa cập nhật kinh nghiệm"}</p>
                              <p>Ghi chú: {registration.note || "-"}</p>
                            </div>
                            <div className="min-w-0 space-y-1 break-words text-xs text-text-subtle">
                              <p className="font-bold text-text-main">{volunteer.emergencyContactName || "Chưa có liên hệ khẩn cấp"}</p>
                              <p>{volunteer.emergencyContactPhone || "-"}</p>
                              <p>{new Date(registration.submittedAt).toLocaleString("vi-VN")}</p>
                            </div>
                            <Link
                              href={`/admin/email?type=volunteer&userId=${volunteer.id}${selectedMission ? `&missionId=${selectedMission.id}` : ""}`}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${volunteer.email ? "border-primary/20 text-primary hover:bg-primary/5" : "pointer-events-none border-outline/10 text-text-subtle/30"}`}
                              title={volunteer.email ? "Gửi email tình nguyện viên" : "TNV chưa có email"}
                            >
                              <Mail className="h-4 w-4" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-outline/15 bg-surface-low p-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Tên đội TNV</span>
                  <input className={`w-full rounded-xl border bg-surface px-3 py-2.5 text-sm ${resourceErrors.rescueTeamName ? "border-danger" : "border-outline/20"}`} placeholder="Ví dụ: Đội sơ tán khu A" value={rescueTeamName} onChange={(e) => updateResourceField("rescueTeamName", e.target.value)} onBlur={() => validateResourceField("rescueTeamName", rescueTeamName)} aria-required aria-invalid={Boolean(resourceErrors.rescueTeamName)} />
                  {resourceErrors.rescueTeamName && <p className="mt-1 text-xs font-bold text-danger">{resourceErrors.rescueTeamName}</p>}
                </label>
                <button type="button" onClick={handleSubmitRescueTeam} disabled={submitting || !selectedMission || !canAssignSelectedMission} title={canAssignSelectedMission ? "Lưu đội TNV" : "Yêu cầu đang thực hiện và nhiệm vụ còn mở mới được lập đội"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  {submitting ? "Đang lưu..." : `Lưu đội (${selectedMemberIds.length} TNV)`}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-surface-card shadow-ambient">
            <div className="flex items-center justify-between border-b border-outline/15 px-5 pt-4">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setShowForm(false); }} className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab.key ? "border-b-2 border-primary text-primary" : "text-text-subtle hover:text-text-main"}`}>
                    <tab.icon className="h-4 w-4" /> {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-surface-low text-text-subtle"}`}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowForm(!showForm)} className="mb-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Đóng form" : "Thêm mới"}
              </button>
            </div>

            <div className="grid gap-3 border-b border-outline/15 px-5 py-4 md:grid-cols-3">
              <input className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" placeholder="Tìm theo tên, kỹ năng, số điện thoại, địa bàn..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {activeTab === "volunteers" ? (
                <>
                  <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">Trạng thái: Tất cả</option>
                    {Object.entries(VOLUNTEER_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                    <option value="ALL">Đội: Tất cả</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </>
              ) : <div className="text-xs font-semibold text-text-subtle md:col-span-2">Lọc đang áp dụng cho tab hiện tại.</div>}
            </div>

            {showForm && (
              <div className="border-b border-outline/15 bg-surface-low/40 px-5 py-4">
                {activeTab === "teams" && (
                  <div className="flex flex-wrap items-end gap-3">
                    <SmallInput label="Tên đội *" value={teamName} onChange={(value) => updateResourceField("teamName", value)} onBlur={() => validateResourceField("teamName", teamName)} error={resourceErrors.teamName} placeholder="Đội TNV Quận 7" />
                    <div className="min-w-[360px]">
                      <VietnamAddressFields
                        province={teamCity}
                        ward={teamWard}
                        onProvinceChange={setTeamCity}
                        onWardChange={setTeamWard}
                        showAddress={false}
                        inputClassName="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm"
                      />
                    </div>
                    <SmallInput label="Mô tả" value={teamDesc} onChange={setTeamDesc} placeholder="Đội hậu cần và vận chuyển" wide />
                    <button type="button" onClick={handleSubmitTeam} disabled={submitting} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Đang thêm..." : "Thêm đội"}</button>
                  </div>
                )}
                {activeTab === "volunteers" && (
                  <div className="flex flex-wrap items-end gap-3">
                    <SmallInput label="Họ tên *" value={volName} onChange={(value) => updateResourceField("volName", value)} onBlur={() => validateResourceField("volName", volName)} error={resourceErrors.volName} placeholder="Nguyễn Văn A" />
                    <SmallInput label="SĐT *" value={volPhone} onChange={(value) => updateResourceField("volPhone", value)} onBlur={() => validateResourceField("volPhone", volPhone)} error={resourceErrors.volPhone} placeholder="0912345678" />
                    <SmallInput label="Kỹ năng" value={volSkills} onChange={setVolSkills} placeholder="sơ cứu, lái xuồng" wide />
                    <div><Label text="Đội" /><select className="w-44 rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={volTeamId} onChange={(e) => setVolTeamId(e.target.value)}><option value="">Không thuộc đội</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
                    <div><Label text="Trạng thái" /><select className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={volStatus} onChange={(e) => setVolStatus(e.target.value)}>{Object.entries(VOLUNTEER_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                    <button type="button" onClick={handleSubmitVolunteer} disabled={submitting} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Đang thêm..." : "Thêm TNV"}</button>
                  </div>
                )}
              </div>
            )}

            <div className="p-5">
              {activeTab === "teams" && <TeamsTable teams={filteredTeams} deleteTeam={deleteTeam} />}
              {activeTab === "volunteers" && <VolunteersTable volunteers={filteredVolunteers} teams={teams} updateVolunteer={updateVolunteer} deleteVolunteer={deleteVolunteer} />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">{text}</label>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-main">{value}</p>
    </div>
  );
}

function SmallInput({ label, value, onChange, onBlur, placeholder, wide, error }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; placeholder?: string; wide?: boolean; error?: string }) {
  return (
    <div>
      <Label text={label} />
      <input className={`rounded-xl border bg-surface px-3 py-2 text-sm ${wide ? "w-64" : "w-44"} ${error ? "border-danger" : "border-outline/20"}`} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={Boolean(error)} />
      {error && <p className="mt-1 max-w-44 text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}

function TeamsTable({ teams, deleteTeam }: { teams: any[]; deleteTeam: (id: string) => void }) {
  if (teams.length === 0) return <p className="py-8 text-center text-sm text-text-subtle">Chưa có đội TNV phù hợp.</p>;
  return (
    <Table headers={["Tên đội", "Địa bàn", "Số TNV", "Mô tả", "Xóa"]}>
      {teams.map((team) => (
        <tr key={team.id} className="hover:bg-surface-low/40">
          <td className="py-3 font-bold text-primary">{team.name}</td>
          <td className="py-3 text-text-subtle">{[team.ward, team.city].filter(Boolean).join(", ") || "-"}</td>
          <td className="py-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">{team.volunteers?.length ?? 0}</span></td>
          <td className="py-3 text-text-subtle">{team.description ?? "-"}</td>
          <td className="py-3 text-right"><DeleteButton label={`Xóa đội "${team.name}"?`} onDelete={() => deleteTeam(team.id)} /></td>
        </tr>
      ))}
    </Table>
  );
}

function VolunteersTable({ volunteers, teams, updateVolunteer, deleteVolunteer }: { volunteers: any[]; teams: any[]; updateVolunteer: (id: string, input: Record<string, unknown>) => void; deleteVolunteer: (id: string) => void }) {
  if (volunteers.length === 0) return <p className="py-8 text-center text-sm text-text-subtle">Không có TNV phù hợp bộ lọc.</p>;
  return (
    <Table headers={["Họ tên", "SĐT", "Đội", "Kỹ năng", "Trạng thái", "Xóa"]}>
      {volunteers.map((vol) => (
        <tr key={vol.id} className="hover:bg-surface-low/40">
          <td className="py-3 font-bold text-primary">{vol.name}</td>
          <td className="py-3">{vol.phone}</td>
          <td className="py-3 text-text-subtle">{vol.team?.name ?? teams.find((team) => team.id === vol.teamId)?.name ?? "-"}</td>
          <td className="py-3">{vol.skills.length > 0 ? vol.skills.map((s: string) => <span key={s} className="mr-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{s}</span>) : <span className="text-text-subtle">-</span>}</td>
          <td className="py-3"><select value={vol.accountStatus ?? "HOAT_DONG"} onChange={(e) => updateVolunteer(vol.id, { accountStatus: e.target.value })} className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase transition-colors ${accountStatusTone[vol.accountStatus ?? "HOAT_DONG"] ?? "bg-surface-low border-outline/20 text-text-main"}`}>{Object.entries(ACCOUNT_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td>
          <td className="py-3 text-right"><DeleteButton label={`Xóa TNV "${vol.name}"?`} onDelete={() => deleteVolunteer(vol.id)} /></td>
        </tr>
      ))}
    </Table>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead><tr className="font-label text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">{headers.map((header, index) => <th key={header} className={`pb-3 ${index === headers.length - 1 ? "text-right" : ""}`}>{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-outline/10">{children}</tbody>
      </table>
    </div>
  );
}

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button type="button" onClick={() => { if (window.confirm(label)) onDelete(); }} className="rounded-lg p-1.5 text-text-subtle hover:bg-danger/10 hover:text-danger">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
