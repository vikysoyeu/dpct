"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Need, NeedCategory, NeedStatus } from "@rescue/types";

export function useNeeds() {
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createNeed = useCallback(
    async (locationId: string, input: { category: NeedCategory; item: string; quantity: number; unit: string }) => {
      setError(null);
      try {
        const res = await apiClient.post<{ data: Need }>(`/locations/${locationId}/needs`, input);
        return res.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create need";
        setError(msg);
        throw err;
      }
    },
    []
  );

  const updateNeedStatus = useCallback(async (needId: string, status: NeedStatus) => {
    setUpdating(needId);
    setError(null);
    try {
      const res = await apiClient.patch<{ data: Need }>(`/needs/${needId}`, { status });
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update need";
      setError(msg);
      throw err;
    } finally {
      setUpdating(null);
    }
  }, []);

  const deleteNeed = useCallback(async (needId: string) => {
    setError(null);
    try {
      await apiClient.del(`/needs/${needId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete need";
      setError(msg);
      throw err;
    }
  }, []);

  return { createNeed, updateNeedStatus, deleteNeed, updating, error };
}
