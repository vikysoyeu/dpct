"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type {
  Location,
  ApiListResponse,
  CreateLocationInput,
  UpdateLocationInput,
} from "@rescue/types";

type UseLocationsOptions = {
  type?: string;
  status?: string;
  q?: string;
  area?: string;
};

export function useLocations(options: UseLocationsOptions = {}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (options.type) params.set("type", options.type);
    if (options.status) params.set("status", options.status);
    if (options.q) params.set("q", options.q);
    if (options.area) params.set("area", options.area);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [options.type, options.status, options.q, options.area]);

  const fetchLocations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse<Location>>(
        `/locations${buildQuery()}`
      );
      setLocations(res.data);
      setTotal(res.total);
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch locations");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchLocations(false);
  }, [fetchLocations]);

  const createLocation = async (input: CreateLocationInput) => {
    const res = await apiClient.post<{ data: Location }>("/locations", input);
    await fetchLocations(initialized);
    return res.data;
  };

  const updateLocation = async (id: string, input: UpdateLocationInput) => {
    const res = await apiClient.patch<{ data: Location }>(`/locations/${id}`, input);
    await fetchLocations(initialized);
    return res.data;
  };

  const deleteLocation = async (id: string) => {
    await apiClient.del(`/locations/${id}`);
    await fetchLocations(initialized);
  };

  const confirmLocation = async (id: string) => {
    const res = await apiClient.post<{ data: Location }>(`/locations/${id}/confirm`, {});
    await fetchLocations(initialized);
    return res.data;
  };

  const addLocationImage = async (id: string, input: { url: string; content?: string; userId?: string }) => {
    const res = await apiClient.post<{ data: Location }>(`/locations/${id}/images`, input);
    await fetchLocations(initialized);
    return res.data;
  };

  return {
    locations,
    total,
    loading,
    error,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    confirmLocation,
    addLocationImage,
  };
}

export async function fetchLocationDetail(id: string) {
  const res = await apiClient.get<{ data: Location }>(`/locations/${id}`);
  return res.data;
}
