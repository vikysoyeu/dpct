"use client";

import { useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@rescue/types";
import { CloudRain, LocateFixed, Maximize2, Minimize2, X } from "lucide-react";
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_VIETNAM_MAX_BOUNDS,
  TILE_URL,
  TILE_ATTRIBUTION,
  LOCATION_TYPE_CONFIG,
  LOCATION_STATUS_LABELS,
} from "@/lib/map-config";
import type { BrowserLocation } from "@/lib/map-utils";
import { API_BASE_URL } from "@/lib/api";

function buildIcon(type: string, urgency: number = 3): L.DivIcon {
  const cfg = LOCATION_TYPE_CONFIG[type] ?? {
    color: "#6b7280",
    emoji: "📍",
    label: type,
  };
  const size = urgency >= 4 ? 36 : 28;
  const pulse = urgency >= 4 ? "animate-pulse" : "";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="marker-wrapper ${pulse}" style="--marker-color: ${cfg.color}">
        <div class="marker-pin" style="width:${size}px;height:${size}px;background:${cfg.color};">
          <span>${cfg.emoji}</span>
        </div>
        <div class="marker-shadow"></div>
      </div>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 4)],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPopupDescription(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[^:]+:\s*$/.test(line))
    .map((line) => `<div class="popup-desc-line">${escapeHtml(line)}</div>`)
    .join("");
}

function resolveImageUrl(url: string): string {
  return url.startsWith("/uploads") ? `${API_BASE_URL}${url}` : url;
}

function buildPopupContent(loc: Location, detailHref?: string): string {
  const cfg = LOCATION_TYPE_CONFIG[loc.type] ?? { label: loc.type, emoji: "📍" };
  const statusLabel = LOCATION_STATUS_LABELS[loc.status] ?? loc.status;
  const statusColor =
    loc.status === "ACTIVE" ? "#22c55e" :
    loc.status === "PENDING" ? "#f59e0b" :
    loc.status === "DONE" ? "#3b82f6" : "#9ca3af";
  const imageUrl = loc.imageUrls?.[0] ? resolveImageUrl(loc.imageUrls[0]) : null;
  const detailLink = detailHref
    ? `<a class="popup-detail-link" href="${escapeHtml(detailHref)}">Xem chi tiết</a>`
    : "";

  return `
    <div class="map-popup">
      ${imageUrl ? `<img class="popup-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(loc.name)}" />` : ""}
      <div class="popup-body">
        <div class="popup-header">
          <span class="popup-type">${escapeHtml(`${cfg.emoji} ${cfg.label}`)}</span>
          <span class="popup-status" style="color:${statusColor}">${escapeHtml(statusLabel)}</span>
        </div>
        <h3 class="popup-title">${escapeHtml(loc.name)}</h3>
        ${loc.description ? `<div class="popup-desc">${formatPopupDescription(loc.description)}</div>` : ""}
        <div class="popup-meta">
          <span>Khẩn: <b>${loc.urgency}/5</b></span>
          <span>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</span>
        </div>
        ${detailLink}
      </div>
    </div>
  `;
}

type OpenMeteoCurrent = {
  time?: string;
  interval?: number;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  apparent_temperature?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  weather_code?: number;
  cloud_cover?: number;
  pressure_msl?: number;
  surface_pressure?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  wind_gusts_10m?: number;
};

type OpenMeteoWeatherResponse = {
  latitude: number;
  longitude: number;
  timezone?: string;
  timezone_abbreviation?: string;
  current?: OpenMeteoCurrent;
  current_units?: Partial<Record<keyof OpenMeteoCurrent, string>>;
  error?: boolean;
  reason?: string;
};

type WeatherPanelState =
  | { status: "idle" }
  | { status: "loading"; lat: number; lng: number }
  | { status: "success"; lat: number; lng: number; data: OpenMeteoWeatherResponse }
  | { status: "error"; lat: number; lng: number; message: string };

const WEATHER_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "showers",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

function weatherCodeLabel(code?: number): string {
  if (code == null) return "Chưa có mô tả";
  if (code === 0) return "Trời quang";
  if ([1, 2, 3].includes(code)) return "Có mây";
  if ([45, 48].includes(code)) return "Sương mù";
  if ([51, 53, 55, 56, 57].includes(code)) return "Mưa phùn";
  if ([61, 63, 65, 66, 67].includes(code)) return "Mưa";
  if ([71, 73, 75, 77].includes(code)) return "Tuyết";
  if ([80, 81, 82].includes(code)) return "Mưa rào";
  if ([85, 86].includes(code)) return "Mưa tuyết";
  if ([95, 96, 99].includes(code)) return "Dông";
  return `Mã thời tiết ${code}`;
}

function formatWeatherValue(value: number | undefined, unit?: string, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

function weatherPanelBackground(temperature?: number): string {
  if (temperature == null || Number.isNaN(temperature)) return "rgba(255, 255, 255, 0.95)";
  if (temperature < 10) return "rgba(219, 234, 254, 0.96)";
  if (temperature < 18) return "rgba(224, 242, 254, 0.96)";
  if (temperature < 25) return "rgba(220, 252, 231, 0.96)";
  if (temperature < 31) return "rgba(254, 249, 195, 0.96)";
  if (temperature < 36) return "rgba(255, 237, 213, 0.96)";
  return "rgba(254, 226, 226, 0.96)";
}

async function fetchOpenMeteoWeather(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<OpenMeteoWeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lng.toFixed(5),
    current: WEATHER_VARIABLES,
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo trả về HTTP ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoWeatherResponse;
  if (data.error) {
    throw new Error(data.reason || "Open-Meteo không trả về dữ liệu thời tiết.");
  }
  if (!data.current) {
    throw new Error("Không có dữ liệu thời tiết hiện tại cho vị trí này.");
  }

  return data;
}

export type MapViewProps = {
  locations: Location[];
  selectedId?: string | null;
  filterTypes?: string[];
  filterStatuses?: string[];
  onMarkerClick?: (location: Location) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMapBackgroundClick?: () => void;
  routes?: Array<{ coords: [number, number][]; distance: number; duration: number }>;
  routeStartPoint?: { lat: number; lng: number } | null;
  routeEndPoint?: { lat: number; lng: number } | null;
  height?: string;
  placingMode?: boolean;
  className?: string;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  showUserLocation?: boolean;
  weatherMode?: "full" | "compact";
  onUserLocationChange?: (location: BrowserLocation | null) => void;
  detailHref?: string | ((location: Location) => string);
  children?: ReactNode;
};

export function MapView({
  locations,
  selectedId,
  filterTypes,
  filterStatuses,
  onMarkerClick,
  onMapClick,
  onMapBackgroundClick,
  routes,
  routeStartPoint,
  routeEndPoint,
  height = "100%",
  placingMode = false,
  className = "",
  onFullscreenToggle,
  isFullscreen = false,
  showUserLocation = true,
  weatherMode = "full",
  onUserLocationChange,
  detailHref,
  children,
}: MapViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const routePointsRef = useRef<L.LayerGroup | null>(null);
  const userLocationRef = useRef<L.LayerGroup | null>(null);
  const selectedCircleRef = useRef<L.CircleMarker | null>(null);
  const weatherAbortRef = useRef<AbortController | null>(null);
  const hasInitialFitRef = useRef(false);
  const isFullscreenRef = useRef(isFullscreen);
  const [weatherPanel, setWeatherPanel] = useState<WeatherPanelState>({ status: "idle" });
  const [userLocation, setUserLocation] = useState<BrowserLocation | null>(null);

  const loadWeatherAt = useCallback((lat: number, lng: number) => {
    weatherAbortRef.current?.abort();
    const controller = new AbortController();
    weatherAbortRef.current = controller;
    setWeatherPanel({ status: "loading", lat, lng });

    fetchOpenMeteoWeather(lat, lng, controller.signal)
      .then((data) => {
        setWeatherPanel({ status: "success", lat, lng, data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Không thể tải dữ liệu thời tiết.";
        setWeatherPanel({ status: "error", lat, lng, message });
      });
  }, []);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxBounds: MAP_VIETNAM_MAX_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      keepBuffer: 4,
      updateWhenIdle: true,
      crossOrigin: true,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    const rafId = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
    });
    const timerId = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 220);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize({ pan: false });
      });
      resizeObserver.observe(containerRef.current);
    }

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      resizeObserver?.disconnect();
      weatherAbortRef.current?.abort();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showUserLocation || typeof navigator === "undefined" || !navigator.geolocation) {
      onUserLocationChange?.(null);
      return;
    }

    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        const nextLocation: BrowserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: "Vị trí hiện tại",
        };
        setUserLocation(nextLocation);
        onUserLocationChange?.(nextLocation);
      },
      () => {
        if (cancelled) return;
        setUserLocation(null);
        onUserLocationChange?.(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 120000,
      },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onUserLocationChange, showUserLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocationRef.current) {
      map.removeLayer(userLocationRef.current);
      userLocationRef.current = null;
    }

    if (!userLocation) return;

    const group = L.layerGroup().addTo(map);
    const accuracy = userLocation.accuracy && Number.isFinite(userLocation.accuracy)
      ? Math.min(userLocation.accuracy, 500)
      : 0;

    if (accuracy > 0) {
      group.addLayer(
        L.circle([userLocation.lat, userLocation.lng], {
          radius: accuracy,
          color: "#0284c7",
          weight: 1,
          fillColor: "#38bdf8",
          fillOpacity: 0.12,
          interactive: false,
        }),
      );
    }

    const currentLocationIcon = L.divIcon({
      className: "user-location-marker",
      html: `
        <div class="user-location-dot">
          <div class="user-location-dot-inner"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    group.addLayer(
      L.marker([userLocation.lat, userLocation.lng], { icon: currentLocationIcon }).bindPopup(
        `<div class="map-popup"><h3 class="popup-title">Vị trí hiện tại</h3><div class="popup-meta"><span>${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</span></div></div>`,
        { maxWidth: 240, className: "custom-popup" },
      ),
    );
    userLocationRef.current = group;
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onMapBackgroundClick?.();
      onMapClick?.(lat, lng);
      loadWeatherAt(lat, lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [loadWeatherAt, onMapClick, onMapBackgroundClick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = placingMode ? "crosshair" : "";
  }, [placingMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isFullscreen]);

  useEffect(() => {
    const map = mapRef.current;
    const wrapper = wrapperRef.current;
    if (!map || !wrapper) return;

    const onFullscreenChange = () => {
      const active = document.fullscreenElement === wrapper;
      if (active !== isFullscreenRef.current) {
        onFullscreenToggle?.();
      }
      window.setTimeout(() => {
        map.invalidateSize({ pan: false });
      }, 50);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [onFullscreenToggle]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const active = document.fullscreenElement === wrapper;
    if (isFullscreen && !active) {
      void wrapper.requestFullscreen().catch(() => {});
      return;
    }
    if (!isFullscreen && active) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [isFullscreen]);

  const renderMarkers = useCallback(() => {
    const markerGroup = markersRef.current;
    if (!markerGroup) return;
    markerGroup.clearLayers();

    const filtered = locations.filter((loc) => {
      const matchType = !filterTypes || filterTypes.length === 0 || filterTypes.includes(loc.type);
      const matchStatus = !filterStatuses || filterStatuses.length === 0 || filterStatuses.includes(loc.status);
      return matchType && matchStatus;
    });

    for (const loc of filtered) {
      const icon = buildIcon(loc.type, loc.urgency);
      const href = typeof detailHref === "function" ? detailHref(loc) : detailHref ? `${detailHref.replace(/\/$/, "")}/${loc.id}` : undefined;
      const marker = L.marker([loc.lat, loc.lng], { icon }).bindPopup(buildPopupContent(loc, href), {
        minWidth: 320,
        maxWidth: 320,
        className: "custom-popup",
      });

      marker.on("click", () => {
        loadWeatherAt(loc.lat, loc.lng);
        onMarkerClick?.(loc);
      });

      markerGroup.addLayer(marker);
    }
  }, [locations, filterTypes, filterStatuses, loadWeatherAt, onMarkerClick, detailHref]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedCircleRef.current) {
      map.removeLayer(selectedCircleRef.current);
      selectedCircleRef.current = null;
    }

    if (!selectedId) return;
    const loc = locations.find((item) => item.id === selectedId);
    if (!loc) return;

    const circle = L.circleMarker([loc.lat, loc.lng], {
      radius: 22,
      color: "#3b82f6",
      weight: 3,
      fillOpacity: 0.1,
      dashArray: "6 4",
    }).addTo(map);
    selectedCircleRef.current = circle;

    map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 13), {
      duration: 0.6,
    });
  }, [selectedId, locations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const polyline of routeLayersRef.current) {
      map.removeLayer(polyline);
    }
    routeLayersRef.current = [];

    if (routePointsRef.current) {
      map.removeLayer(routePointsRef.current);
      routePointsRef.current = null;
    }

    if (!routes || routes.length === 0) return;

    const bounds = L.latLngBounds([]);
    const topRoutes = routes.slice(0, 2);
    const routeStyles = [
      { color: "#2563eb", weight: 6, opacity: 0.9, dashArray: undefined as string | undefined }, // primary: blue
      { color: "#6b7280", weight: 5, opacity: 0.95, dashArray: "10 8" }, // secondary: gray dashed
    ];
    for (let i = topRoutes.length - 1; i >= 0; i -= 1) {
      const route = topRoutes[i];
      if (!route || route.coords.length < 2) continue;
      const style = routeStyles[i] ?? routeStyles[routeStyles.length - 1];
      const polyline = L.polyline(route.coords, {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        dashArray: style.dashArray,
      }).addTo(map);

      routeLayersRef.current.push(polyline);
      bounds.extend(polyline.getBounds());
    }

    const pointsGroup = L.layerGroup().addTo(map);

    if (routeStartPoint) {
      const startMarker = L.circleMarker([routeStartPoint.lat, routeStartPoint.lng], {
        radius: 8,
        color: "#3b82f6",
        weight: 3,
        fillColor: "#3b82f6",
        fillOpacity: 0.85,
      });
      pointsGroup.addLayer(startMarker);
      bounds.extend([routeStartPoint.lat, routeStartPoint.lng]);
    }

    if (routeEndPoint) {
      const endIcon = L.divIcon({
        className: "route-end-marker",
        html: `
          <div style="width:24px;height:32px;display:flex;align-items:center;justify-content:center;">
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C6.48 0 2 4.48 2 10C2 15.64 12 32 12 32C12 32 22 15.64 22 10C22 4.48 17.52 0 12 0Z" fill="#ef4444" />
              <circle cx="12" cy="10" r="4.5" fill="white" />
            </svg>
          </div>
        `,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
      });
      const endMarker = L.marker([routeEndPoint.lat, routeEndPoint.lng], { icon: endIcon });
      pointsGroup.addLayer(endMarker);
      bounds.extend([routeEndPoint.lat, routeEndPoint.lng]);
    }

    routePointsRef.current = pointsGroup;

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, routeStartPoint, routeEndPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0 || selectedId || hasInitialFitRef.current) return;

    const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      hasInitialFitRef.current = true;
    }
  }, [locations, selectedId]);

  return (
    <div
      ref={wrapperRef}
      className={`relative z-0 overflow-hidden ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "rounded-xl"} ${className}`}
      style={{ height, minHeight: "300px" }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {onFullscreenToggle && (
        <button
          type="button"
          onClick={() => {
            onFullscreenToggle();
          }}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="absolute top-3 right-14 pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold shadow-lg hover:bg-gray-100"
          style={{ zIndex: 5000 }}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              Thoát fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              Fullscreen
            </>
          )}
        </button>
      )}
      {userLocation && (
        <button
          type="button"
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 15), {
              duration: 0.5,
            });
          }}
          aria-label="Tới vị trí hiện tại"
          className={`absolute ${onFullscreenToggle ? "top-20 right-3" : "top-3 right-14"} pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sky-700 shadow-lg hover:bg-sky-50`}
          style={{ zIndex: 5000 }}
          title="Tới vị trí hiện tại"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      )}
      {weatherPanel.status !== "idle" && (
        weatherMode === "compact" ? (
          <div
            className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-lg backdrop-blur"
            style={{ zIndex: 5000 }}
          >
            <CloudRain className="h-3.5 w-3.5 text-sky-700" />
            {weatherPanel.status === "loading" && <span>Đang tải thời tiết...</span>}
            {weatherPanel.status === "error" && <span>Không có dữ liệu thời tiết</span>}
            {weatherPanel.status === "success" && (
              <span className="truncate">
                {formatWeatherValue(weatherPanel.data.current?.temperature_2m, weatherPanel.data.current_units?.temperature_2m, 1)}
                {" - "}
                {weatherCodeLabel(weatherPanel.data.current?.weather_code)}
              </span>
            )}
            <button
              type="button"
              aria-label="Đóng thông tin thời tiết"
              onClick={() => {
                weatherAbortRef.current?.abort();
                setWeatherPanel({ status: "idle" });
              }}
              className="rounded-md p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="absolute bottom-3 left-3 w-[min(22rem,calc(100%-1.5rem))] rounded-lg border border-slate-200 p-3 text-slate-900 shadow-xl backdrop-blur transition-colors duration-300"
            style={{
              zIndex: 5000,
              backgroundColor:
                weatherPanel.status === "success"
                  ? weatherPanelBackground(weatherPanel.data.current?.temperature_2m)
                  : "rgba(255, 255, 255, 0.95)",
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                  <CloudRain className="h-3.5 w-3.5" />
                  Thời tiết khu vực
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  {weatherPanel.lat.toFixed(5)}, {weatherPanel.lng.toFixed(5)}
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng thông tin thời tiết"
                onClick={() => {
                  weatherAbortRef.current?.abort();
                  setWeatherPanel({ status: "idle" });
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {weatherPanel.status === "loading" && (
              <div className="py-3 text-sm font-semibold text-slate-600">Đang tải dữ liệu Open-Meteo...</div>
            )}

            {weatherPanel.status === "error" && (
              <div className="rounded-md bg-red-50 p-2 text-sm font-semibold text-red-700">
                {weatherPanel.message}
              </div>
            )}

            {weatherPanel.status === "success" && (
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-2">
                  <div>
                    <div className="text-2xl font-black leading-none">
                      {formatWeatherValue(
                        weatherPanel.data.current?.temperature_2m,
                        weatherPanel.data.current_units?.temperature_2m,
                        1,
                      )}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-600">
                      {weatherCodeLabel(weatherPanel.data.current?.weather_code)}
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-semibold text-slate-500">
                    <div>{weatherPanel.data.timezone || "Local time"}</div>
                    <div>{weatherPanel.data.current?.time || "--"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Cảm giác</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.apparent_temperature, weatherPanel.data.current_units?.apparent_temperature, 1)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Độ ẩm</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.relative_humidity_2m, weatherPanel.data.current_units?.relative_humidity_2m)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Mưa</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.precipitation, weatherPanel.data.current_units?.precipitation, 1)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Mây</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.cloud_cover, weatherPanel.data.current_units?.cloud_cover)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Gió</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.wind_speed_10m, weatherPanel.data.current_units?.wind_speed_10m)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Gust</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.wind_gusts_10m, weatherPanel.data.current_units?.wind_gusts_10m)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Hướng gió</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.wind_direction_10m, weatherPanel.data.current_units?.wind_direction_10m)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Áp suất</span>
                    <b>{formatWeatherValue(weatherPanel.data.current?.pressure_msl, weatherPanel.data.current_units?.pressure_msl)}</b>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}
      {children}
    </div>
  );
}
