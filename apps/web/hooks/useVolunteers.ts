"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { User, ApiListResponse } from "@rescue/types";

type UseVolunteersOptions = {
  status?: string;
  skill?: string;
  teamId?: string;
  q?: string;
};

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    if (options.skill) params.set("skill", options.skill);
    if (options.teamId) params.set("teamId", options.teamId);
    if (options.q) params.set("q", options.q);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [options.status, options.skill, options.teamId, options.q]);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse<User>>(`/volunteers${buildQuery()}`);
      setVolunteers(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch volunteers");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const createVolunteer = async (input: {
    name: string;
    phone: string;
    skills?: string[];
    vehicleType?: string;
    status?: string;
    teamId?: string;
  }) => {
    const res = await apiClient.post<{ data: User }>("/volunteers", input);
    await fetchVolunteers();
    return res.data;
  };

  const updateVolunteer = async (id: string, input: Record<string, unknown>) => {
    const res = await apiClient.patch<{ data: User }>(`/volunteers/${id}`, input);
    await fetchVolunteers();
    return res.data;
  };

  const deleteVolunteer = async (id: string) => {
    await apiClient.del(`/volunteers/${id}`);
    await fetchVolunteers();
  };

  return {
    volunteers,
    total,
    loading,
    error,
    refetch: fetchVolunteers,
    createVolunteer,
    updateVolunteer,
    deleteVolunteer,
  };
}
