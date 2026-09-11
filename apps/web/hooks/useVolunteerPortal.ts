"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { Location, Mission, MissionStatus, RequestStatus, RescueRequest, RescueTeam, RescueTeamMember, User, VolunteerRequest, VolunteerRequestStatus } from "@rescue/types";

export type RescueTeamWithMembers = RescueTeam & {
  members: Array<RescueTeamMember & { user: Pick<User, "id" | "name" | "phone" | "email" | "address" | "city" | "ward" | "skills" | "status" | "vehicleType" | "availability" | "experience" | "emergencyContactName" | "emergencyContactPhone"> }>;
};

export type MissionWithTeams = Mission & {
  rescueTeams: RescueTeamWithMembers[];
  teamCount?: number;
  memberCount?: number;
};

export type RescueRequestWithDetails = RescueRequest & {
  location?: Location;
  missions: MissionWithTeams[];
  volunteerRequests: Array<Pick<VolunteerRequest, "id" | "volunteerId" | "status" | "note" | "submittedAt">>;
  volunteerRequestCount?: number;
  missionCount?: number;
};

export type MyVolunteerRequest = VolunteerRequest & {
  request: RescueRequestWithDetails;
};

export function useVolunteerRescueRequests() {
  const [requests, setRequests] = useState<RescueRequestWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: RescueRequestWithDetails[]; total: number }>("/volunteer/rescue-requests");
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

  return { requests, total, loading, error, refetch: fetchRequests };
}

export function useVolunteerRescueRequest(code: string) {
  const [request, setRequest] = useState<RescueRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: RescueRequestWithDetails }>(`/volunteer/rescue-requests/${code}`);
      setRequest(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được chi tiết yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const register = async (note?: string) => {
    const res = await apiClient.post<{ data: MyVolunteerRequest }>(`/volunteer/rescue-requests/${code}/register`, { note });
    await fetchRequest();
    return res.data;
  };

  const completeMission = async (missionId: string) => {
    const res = await apiClient.patch<{ data: MissionWithTeams }>(`/volunteer/missions/${missionId}/complete`, {});
    await fetchRequest();
    return res.data;
  };

  return { request, loading, error, register, completeMission, refetch: fetchRequest };
}

export function useMyVolunteerRequests() {
  const [requests, setRequests] = useState<MyVolunteerRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: MyVolunteerRequest[]; total: number }>("/volunteer/my-requests");
      setRequests(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách đã tham gia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const completeMission = async (missionId: string) => {
    const res = await apiClient.patch<{ data: MissionWithTeams }>(`/volunteer/missions/${missionId}/complete`, {});
    await fetchRequests();
    return res.data;
  };

  return { requests, total, loading, error, completeMission, refetch: fetchRequests };
}

export function teamMemberRoleLabel(role: string) {
  const labels: Record<string, string> = {
    DOI_TRUONG: "Đội trưởng",
    DOI_PHO: "Đội phó",
    THANH_VIEN: "Thành viên",
    CONG_TAC_VIEN: "Cộng tác viên",
  };
  return labels[role] ?? role;
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
    KHAN_CAP: "KHẨN CẤP",
    CAO: "CAO",
    TRUNG_BINH: "TRUNG BÌNH",
    THAP: "THẤP",
  };
  return labels[priority] ?? priority;
}
