"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

type Route = {
  coords: [number, number][];
  distance: number; // meters
  duration: number; // seconds
};

type RouteResult = {
  routes: Route[];
};

/**
 * Hook for fetching routes via the backend /route endpoint.
 * The backend proxies to Valhalla and avoids active blocked roads.
 */
export function useRoute() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findRoute = useCallback(
    async (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number },
      vehicleType: string = "auto"
    ) => {
      setLoading(true);
      setError(null);
      setRoutes([]);
      try {
        const res = await apiClient.post<RouteResult>("/route", {
          from,
          to,
          vehicleType,
        });

        if (!Array.isArray(res.routes)) {
          throw new Error("Invalid route response: expected routes[]");
        }

        const normalizedRoutes = res.routes;

        setRoutes(normalizedRoutes);
        return { routes: normalizedRoutes };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to find route";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearRoute = useCallback(() => {
    setRoutes([]);
    setError(null);
  }, []);

  return { routes, loading, error, findRoute, clearRoute };
}
