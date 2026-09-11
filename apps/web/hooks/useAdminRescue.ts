"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Location, Mission, MissionStatus, RequestStatus, RescueRequest, RescueTeam, RescueTeamMember, Role, User, VolunteerRequest, VolunteerRequestStatus } from "@rescue/types";

export type AdminVolunteerRegistration = VolunteerRequest & {
  volunteer: Pick<User, "id" | "name" | "phone" | "email" | "dateOfBirth" | "gender" | "skills" | "status" | "accountStatus" | "vehicleType" | "availability" | "experience" | "emergencyContactName" | "emergencyContactPhone" | "city" | "ward" | "address">;
};

export type AdminMission = Mission & {
  rescueTeams: Array<RescueTeam & {
    members: Array<RescueTeamMember & { user: Pick<User, "id" | "name" | "phone" | "email" | "skills" | "status" | "accountStatus" | "vehicleType" | "city" | "ward"> }>;
  }>;
};

export type AdminRescueRequest = RescueRequest & {
  location: Location;
  submittedBy?: Pick<User, "id" | "name" | "phone" | "email" | "role"> | null;
  volunteerRequests: AdminVolunteerRegistration[];
  missions: AdminMission[];
  transactions?: unknown[];
};

export function useAdminRescueRequests() {
  const [requests, setRequests] = useState<AdminRescueRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: AdminRescueRequest[]; total: number }>("/admin/rescue-requests");
      setRequests(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được yêu cầu cứu trợ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (input: Record<string, unknown>) => {
    const res = await apiClient.post<{ data: AdminRescueRequest }>("/admin/rescue-requests", input);
    await fetchRequests();
    return res.data;
  };

  const updateRequest = async (id: string, input: Record<string, unknown>) => {
    const res = await apiClient.patch<{ data: AdminRescueRequest }>(`/admin/rescue-requests/${id}`, input);
    await fetchRequests();
    return res.data;
  };

  const deleteRequest = async (id: string) => {
    await apiClient.del(`/admin/rescue-requests/${id}`);
    await fetchRequests();
  };

  const createMission = async (requestId: string, input: Record<string, unknown>) => {
    const res = await apiClient.post<{ data: AdminMission }>(`/admin/rescue-requests/${requestId}/missions`, input);
    await fetchRequests();
    return res.data;
  };

  const updateMission = async (id: string, input: Record<string, unknown>) => {
    const res = await apiClient.patch<{ data: AdminMission }>(`/admin/missions/${id}`, input);
    await fetchRequests();
    return res.data;
  };

  const deleteMission = async (id: string) => {
    await apiClient.del(`/admin/missions/${id}`);
    await fetchRequests();
  };

  const createRescueTeam = async (input: Record<string, unknown>) => {
    const res = await apiClient.post<{ data: unknown }>("/admin/rescue-teams", input);
    await fetchRequests();
    return res.data;
  };

  const deleteRescueTeam = async (id: string) => {
    await apiClient.del(`/admin/rescue-teams/${id}`);
    await fetchRequests();
  };

  const updateTeamMemberRole = async (teamId: string, userId: string, role: string) => {
    const res = await apiClient.patch<{ data: RescueTeamMember }>(`/admin/rescue-teams/${teamId}/members/${userId}`, { role });
    await fetchRequests();
    return res.data;
  };

  return {
    requests,
    total,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    createMission,
    updateMission,
    deleteMission,
    createRescueTeam,
    deleteRescueTeam,
    updateTeamMemberRole,
  };
}

export function requestStatusLabel(status: RequestStatus | string) {
  const labels: Record<string, string> = {
    CHO_TIEP_NHAN: "Chờ tiếp nhận",
    DANG_THUC_HIEN: "Đang thực hiện",
    HOAN_THANH: "Hoàn thành",
    HUY_BO: "Hủy bỏ",
  };
  return labels[status] ?? status;
}

export function missionStatusLabel(status: MissionStatus | string) {
  const labels: Record<string, string> = {
    CHO_TIEP_NHAN: "Chờ tiếp nhận",
    DANG_TUYEN: "Đang tuyển",
    DA_DU_DOI: "Đã đủ đội",
    DA_DU_HANG: "Đã đủ hàng",
    SAN_SANG: "Sẵn sàng",
    DANG_THUC_HIEN: "Đang thực hiện",
    HOAN_THANH: "Hoàn thành",
    HUY_BO: "Hủy bỏ",
  };
  return labels[status] ?? status;
}

export function volunteerRequestStatusLabel(status: VolunteerRequestStatus | string) {
  const labels: Record<string, string> = {
    CHO_TIEP_NHAN: "Chờ tiếp nhận",
    DA_TIEP_NHAN: "Đã tiếp nhận",
    DANG_XU_LY: "Đang xử lý",
    HOAN_THANH: "Hoàn thành",
    HUY_BO: "Hủy bỏ",
  };
  return labels[status] ?? status;
}

export function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    KHAN_CAP: "Khẩn cấp",
    CAO: "Cao",
    TRUNG_BINH: "Trung bình",
    THAP: "Thấp",
  };
  return labels[priority] ?? priority;
}

export function useAdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Role[]; total: number }>("/admin/roles");
      setRoles(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { roles, loading, refetch: fetchRoles };
}
