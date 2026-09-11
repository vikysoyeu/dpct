"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { ApiListResponse, Location, MissionStatus, Need, PriorityLevel, RequestStatus, RescueRequestItem } from "@rescue/types";

export type PublicMission = {
  id: string;
  locationId: string;
  requestId?: string | null;
  name: string;
  missionType?: string | null;
  priority: PriorityLevel;
  status: MissionStatus;
  notes?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  teamCount: number;
  memberCount: number;
};

export type PublicRescueLocation = Pick<Location, "id" | "type" | "status" | "priority" | "name" | "description" | "lat" | "lng" | "urgency" | "imageUrls" | "createdAt" | "updatedAt"> & {
  needs?: Need[];
};

export type PublicRescueRequest = {
  id: string;
  code?: string | null;
  locationId: string;
  name: string;
  content?: string | null;
  priority: PriorityLevel;
  status: RequestStatus;
  submittedAt: string;
  location?: PublicRescueLocation | null;
  requestItems?: RescueRequestItem[];
  volunteerRequestCount: number;
  missionCount: number;
  missions?: PublicMission[];
};

function normalizePublicRescueRequest(input: any): PublicRescueRequest {
  const missions = Array.isArray(input?.missions)
    ? input.missions.map((mission: any) => ({
      ...mission,
      teamCount: Number(mission?.teamCount ?? mission?.rescueTeams?.length ?? 0),
      memberCount: Number(
        mission?.memberCount ??
        mission?.rescueTeams?.reduce((total: number, team: any) => total + (team?.members?.length ?? 0), 0) ??
        0
      ),
    }))
    : undefined;

  return {
    ...input,
    volunteerRequestCount: Number(input?.volunteerRequestCount ?? input?._count?.volunteerRequests ?? input?.volunteerRequests?.length ?? 0),
    missionCount: Number(input?.missionCount ?? input?._count?.missions ?? input?.missions?.length ?? 0),
    missions,
  };
}

export function usePublicRescueRequests(status = "ALL") {
  const [requests, setRequests] = useState<PublicRescueRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse<PublicRescueRequest>>(`/rescue-requests?status=${encodeURIComponent(status)}`);
      setRequests(res.data.map(normalizePublicRescueRequest));
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được yêu cầu cứu trợ.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return { requests, total, loading, error, refetch: fetchRequests };
}

export function usePublicRescueRequest(code: string) {
  const [request, setRequest] = useState<PublicRescueRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: PublicRescueRequest }>(`/rescue-requests/${code}`);
      setRequest(normalizePublicRescueRequest(res.data));
    } catch (err) {
      try {
        const list = await apiClient.get<ApiListResponse<PublicRescueRequest>>("/rescue-requests?status=ALL");
        const found = list.data.map(normalizePublicRescueRequest).find((item) => item.code === code) ?? null;
        setRequest(found);
        setError(found ? null : "Không tìm thấy yêu cầu cứu trợ.");
      } catch {
        setError(err instanceof Error ? err.message : "Không tải được chi tiết yêu cầu cứu trợ.");
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchRequest();
  }, [fetchRequest]);

  return { request, loading, error, refetch: fetchRequest };
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

export function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    KHAN_CAP: "Khẩn cấp",
    CAO: "Cao",
    TRUNG_BINH: "Trung bình",
    THAP: "Thấp",
  };
  return labels[priority] ?? priority;
}
