"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";

type DashboardStats = {
  activeLocations: number;
  pendingLocations: number;
  unmetNeeds: number;
  availableVolunteers: number;
  totalVolunteers: number;
  totalVolunteerTeams: number;
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: DashboardStats }>("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
