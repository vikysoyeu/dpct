"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { FundTransaction } from "@rescue/types";

export type FundOverview = {
  totalIn: string;
  totalOut: string;
  balance: string;
  transactions: FundTransaction[];
};

export type FundTransactionInput = {
  donorName?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  type: FundTransaction["type"];
  method: FundTransaction["method"];
  amount: number;
  transactedAt: string;
  content?: string | null;
  status: FundTransaction["status"];
  notes?: string | null;
  sepayId?: string | null;
};

export function useFundOverview() {
  const [overview, setOverview] = useState<FundOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: FundOverview }>("/admin/fund");
      setOverview(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu quỹ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { overview, loading, error, refetch: fetchOverview };
}

export function useFundTransactions() {
  const createTransaction = useCallback(async (input: FundTransactionInput) => {
    const res = await apiClient.post<{ data: FundTransaction }>("/admin/fund/transactions", input);
    return res.data;
  }, []);

  const updateTransaction = useCallback(async (id: string, input: FundTransactionInput) => {
    const res = await apiClient.patch<{ data: FundTransaction }>(`/admin/fund/transactions/${id}`, input);
    return res.data;
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await apiClient.del(`/admin/fund/transactions/${id}`);
  }, []);

  return { createTransaction, updateTransaction, deleteTransaction };
}
