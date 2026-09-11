"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { InventoryItem } from "@rescue/types";

export type InventoryItemWithLocation = InventoryItem & {
  location?: { id: string; name: string };
};

export function useInventory() {
  const [items, setItems] = useState<InventoryItemWithLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: InventoryItemWithLocation[]; total: number }>("/inventory");
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu kho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (input: { locationId: string; item: string; quantity: number; unit: string }) => {
    const res = await apiClient.post<{ data: InventoryItemWithLocation }>("/inventory", input);
    await fetchItems();
    return res.data;
  };

  const updateItem = async (id: string, input: Partial<{ item: string; quantity: number; unit: string; locationId: string }>) => {
    const res = await apiClient.patch<{ data: InventoryItemWithLocation }>(`/inventory/${id}`, input);
    await fetchItems();
    return res.data;
  };

  const deleteItem = async (id: string) => {
    await apiClient.del(`/inventory/${id}`);
    await fetchItems();
  };

  return { items, total, loading, error, refetch: fetchItems, createItem, updateItem, deleteItem };
}
