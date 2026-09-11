"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { ApiListResponse, Donor } from "@rescue/types";

export function useDonors() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse<Donor>>("/donors");
      setDonors(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhà tài trợ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  return { donors, loading, error, refetch: fetchDonors };
}
