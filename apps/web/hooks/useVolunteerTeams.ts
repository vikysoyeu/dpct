"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { ApiListResponse, VolunteerTeam } from "@rescue/types";

type UseVolunteerTeamsOptions = {
  q?: string;
  city?: string;
};

export function useVolunteerTeams(options: UseVolunteerTeamsOptions = {}) {
  const [teams, setTeams] = useState<VolunteerTeam[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (options.q) params.set("q", options.q);
    if (options.city) params.set("city", options.city);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [options.q, options.city]);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse<VolunteerTeam>>(
        `/volunteer-teams${buildQuery()}`
      );
      setTeams(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch volunteer teams");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (input: {
    name: string;
    city?: string;
    ward?: string;
    description?: string;
  }) => {
    const res = await apiClient.post<{ data: VolunteerTeam }>("/volunteer-teams", input);
    await fetchTeams();
    return res.data;
  };

  const updateTeam = async (id: string, input: Record<string, unknown>) => {
    const res = await apiClient.patch<{ data: VolunteerTeam }>(`/volunteer-teams/${id}`, input);
    await fetchTeams();
    return res.data;
  };

  const deleteTeam = async (id: string) => {
    await apiClient.del(`/volunteer-teams/${id}`);
    await fetchTeams();
  };

  return {
    teams,
    total,
    loading,
    error,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}
