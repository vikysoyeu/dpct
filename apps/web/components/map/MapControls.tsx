"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, Locate, LocateFixed, Navigation, X } from "lucide-react";
import { LOCATION_STATUS_LABELS, LOCATION_TYPE_CONFIG, VEHICLE_TYPES } from "@/lib/map-config";
import { apiClient } from "@/lib/api";
import {
  normalizeVietnameseText,
  requestBrowserLocation,
  type BrowserLocation,
} from "@/lib/map-utils";

type RoutePoint = {
  lat: number;
  lng: number;
  label?: string;
};

type LocationOption = RoutePoint & {
  id: string;
  label: string;
  type: string;
};

type GeocodeSuggestion = {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
  provider?: string;
  sourceType?: string;
  confidence?: string;
};

type GeocodeResponse = {
  provider: string;
  data: GeocodeSuggestion[];
};

type GeocodeResolveResponse = {
  data: GeocodeSuggestion;
};

type RoutePointMode = "address" | "place" | "current";

function normalizeRouteLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

type MapControlsProps = {
  filterTypes: string[];
  onFilterChange: (types: string[]) => void;
  filterStatuses?: string[];
  onStatusFilterChange?: (statuses: string[]) => void;
  /** Called when user picks arbitrary start/end points for routing */
  onRouteRequest?: (from: RoutePoint, to: RoutePoint, vehicleType: string) => void;
  /** Predefined locations that can be used as routing points */
  locationOptions?: LocationOption[];
  /** Browser geolocation shared from the map, if available */
  currentLocation?: BrowserLocation | null;
  /** Route request loading state */
  routeLoading?: boolean;
  /** Called when user clicks on the map outside the overlay */
  onMapBackgroundClick?: () => void;
  /** "Đặt điểm" mode toggle */
  placingMode?: boolean;
  onTogglePlacingMode?: () => void;
  /** Called when user clears a route */
  onClearRoute?: () => void;
};

export function MapControls({
  filterTypes,
  onFilterChange,
  filterStatuses = [],
  onStatusFilterChange,
  onRouteRequest,
  locationOptions = [],
  currentLocation = null,
  routeLoading = false,
  onMapBackgroundClick,
  placingMode,
  onTogglePlacingMode,
}: MapControlsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedFromAddressRef = useRef("");
  const selectedToAddressRef = useRef("");
  const latestFromSearchIdRef = useRef(0);
  const latestToSearchIdRef = useRef(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [fromMode, setFromMode] = useState<RoutePointMode>("address");
  const [toMode, setToMode] = useState<RoutePointMode>("address");
  const [routeFromInput, setRouteFromInput] = useState("");
  const [routeToInput, setRouteToInput] = useState("");
  const [routeFromPoint, setRouteFromPoint] = useState<RoutePoint | null>(null);
  const [routeToPoint, setRouteToPoint] = useState<RoutePoint | null>(null);
  const [routeFromPlaceId, setRouteFromPlaceId] = useState("");
  const [routeToPlaceId, setRouteToPlaceId] = useState("");
  const [routeFromPlaceInput, setRouteFromPlaceInput] = useState("");
  const [routeToPlaceInput, setRouteToPlaceInput] = useState("");
  const [showFromPlaceOptions, setShowFromPlaceOptions] = useState(false);
  const [showToPlaceOptions, setShowToPlaceOptions] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [fromSearching, setFromSearching] = useState(false);
  const [toSearching, setToSearching] = useState(false);
  const [localCurrentLocation, setLocalCurrentLocation] = useState<BrowserLocation | null>(null);
  const [currentLocationLoading, setCurrentLocationLoading] = useState<"from" | "to" | null>(null);
  const [currentLocationError, setCurrentLocationError] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("auto");

  const allTypes = Object.keys(LOCATION_TYPE_CONFIG);
  const allStatuses = Object.keys(LOCATION_STATUS_LABELS);
  const routableLocationOptions = locationOptions.filter((loc) => loc.type !== "BLOCKED_ROAD");

  const toggleType = (type: string) => {
    if (filterTypes.includes(type)) {
      onFilterChange(filterTypes.filter((t) => t !== type));
    } else {
      onFilterChange([...filterTypes, type]);
    }
  };

  const toggleStatus = (status: string) => {
    if (!onStatusFilterChange) return;
    if (filterStatuses.includes(status)) {
      onStatusFilterChange(filterStatuses.filter((item) => item !== status));
    } else {
      onStatusFilterChange([...filterStatuses, status]);
    }
  };

  const activeFilterCount =
    (filterTypes.length > 0 && filterTypes.length < allTypes.length ? filterTypes.length : 0) +
    (filterStatuses.length > 0 && filterStatuses.length < allStatuses.length ? filterStatuses.length : 0);

  const effectiveCurrentLocation = currentLocation ?? localCurrentLocation;

  const currentLocationPoint = effectiveCurrentLocation
    ? {
        lat: effectiveCurrentLocation.lat,
        lng: effectiveCurrentLocation.lng,
        label: "Vị trí hiện tại",
      }
    : null;

  const handleRouteSubmit = () => {
    const fromPoint = fromMode === "place"
      ? locationOptions.find((item) => item.id === routeFromPlaceId) ?? null
      : fromMode === "current"
      ? currentLocationPoint
      : routeFromPoint;
    const toPoint = toMode === "place"
      ? locationOptions.find((item) => item.id === routeToPlaceId) ?? null
      : toMode === "current"
      ? currentLocationPoint
      : routeToPoint;

    if (fromPoint && toPoint && onRouteRequest) {
      onRouteRequest(fromPoint, toPoint, vehicleType);
    }
  };

  const canSubmitRoute = (
    (fromMode === "place" ? !!routeFromPlaceId : fromMode === "current" ? !!currentLocationPoint : !!routeFromPoint) &&
    (toMode === "place" ? !!routeToPlaceId : toMode === "current" ? !!currentLocationPoint : !!routeToPoint) &&
    !routeLoading
  );

  const canSearchFrom = routeFromInput.trim().length >= 3;
  const canSearchTo = routeToInput.trim().length >= 3;

  const selectedFromLabel = routeFromPoint?.label ?? "";
  const selectedToLabel = routeToPoint?.label ?? "";

  const setRouteMode = (field: "from" | "to", mode: RoutePointMode) => {
    if (field === "from") {
      setFromMode(mode);
      setRouteFromInput("");
      setRouteFromPoint(null);
      setRouteFromPlaceId("");
      setRouteFromPlaceInput("");
      setShowFromPlaceOptions(false);
      setFromSuggestions([]);
      setFromSearching(false);
      selectedFromAddressRef.current = "";
      latestFromSearchIdRef.current += 1;
    } else {
      setToMode(mode);
      setRouteToInput("");
      setRouteToPoint(null);
      setRouteToPlaceId("");
      setRouteToPlaceInput("");
      setShowToPlaceOptions(false);
      setToSuggestions([]);
      setToSearching(false);
      selectedToAddressRef.current = "";
      latestToSearchIdRef.current += 1;
    }
  };

  const resolveSuggestion = async (suggestion: GeocodeSuggestion): Promise<RoutePoint> => {
    if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
      return { lat: suggestion.lat, lng: suggestion.lng, label: suggestion.label };
    }

    const params = new URLSearchParams({ id: suggestion.id });
    const res = await apiClient.get<GeocodeResolveResponse>(`/geocode/resolve?${params.toString()}`);
    if (typeof res.data.lat !== "number" || typeof res.data.lng !== "number") {
      throw new Error("Geocode resolve response does not contain coordinates");
    }

    return {
      lat: res.data.lat,
      lng: res.data.lng,
      label: res.data.label || suggestion.label,
    };
  };

  const selectAddressSuggestion = async (field: "from" | "to", suggestion: GeocodeSuggestion) => {
    if (field === "from") {
      selectedFromAddressRef.current = normalizeRouteLabel(suggestion.label);
      latestFromSearchIdRef.current += 1;
      setRouteFromInput(suggestion.label);
      setFromSuggestions([]);
      setFromSearching(true);
    } else {
      selectedToAddressRef.current = normalizeRouteLabel(suggestion.label);
      latestToSearchIdRef.current += 1;
      setRouteToInput(suggestion.label);
      setToSuggestions([]);
      setToSearching(true);
    }

    try {
      const point = await resolveSuggestion(suggestion);
      if (field === "from") {
        selectedFromAddressRef.current = normalizeRouteLabel(point.label ?? suggestion.label);
        setRouteFromPoint(point);
        setRouteFromInput(point.label ?? suggestion.label);
        setFromSuggestions([]);
      } else {
        selectedToAddressRef.current = normalizeRouteLabel(point.label ?? suggestion.label);
        setRouteToPoint(point);
        setRouteToInput(point.label ?? suggestion.label);
        setToSuggestions([]);
      }
    } catch {
      if (field === "from") setRouteFromPoint(null);
      else setRouteToPoint(null);
    } finally {
      if (field === "from") setFromSearching(false);
      else setToSearching(false);
    }
  };

  const selectCurrentLocation = useCallback(async (field: "from" | "to") => {
    setRouteMode(field, "current");
    setCurrentLocationError("");
    if (effectiveCurrentLocation) return;

    setCurrentLocationLoading(field);
    try {
      const location = await requestBrowserLocation();
      setLocalCurrentLocation(location);
    } catch {
      setCurrentLocationError("Không lấy được vị trí hiện tại. Hãy kiểm tra quyền định vị của trình duyệt.");
    } finally {
      setCurrentLocationLoading(null);
    }
  }, [effectiveCurrentLocation]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setShowFilters(false);
        setShowRoute(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (fromMode !== "address") {
      setFromSuggestions([]);
      setFromSearching(false);
      return;
    }

    const query = normalizeRouteLabel(routeFromInput);

    if (selectedFromAddressRef.current && query === selectedFromAddressRef.current) {
      setFromSuggestions([]);
      setFromSearching(false);
      return;
    }

    if (!canSearchFrom) {
      setFromSuggestions([]);
      setFromSearching(false);
      return;
    }

    const lat = effectiveCurrentLocation?.lat;
    const lng = effectiveCurrentLocation?.lng;
    const searchId = latestFromSearchIdRef.current + 1;
    latestFromSearchIdRef.current = searchId;
    const timer = window.setTimeout(async () => {
      setFromSearching(true);
      try {
        const params = new URLSearchParams({ q: query, limit: "6" });
        if (lat != null && lng != null) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
        }
        const res = await apiClient.get<GeocodeResponse>(`/geocode?${params.toString()}`);
        if (latestFromSearchIdRef.current === searchId && selectedFromAddressRef.current !== query) {
          setFromSuggestions(res.data);
        }
      } catch {
        setFromSuggestions([]);
      } finally {
        setFromSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [effectiveCurrentLocation?.lat, effectiveCurrentLocation?.lng, routeFromInput, canSearchFrom, fromMode]);

  useEffect(() => {
    if (toMode !== "address") {
      setToSuggestions([]);
      setToSearching(false);
      return;
    }

    const query = normalizeRouteLabel(routeToInput);

    if (selectedToAddressRef.current && query === selectedToAddressRef.current) {
      setToSuggestions([]);
      setToSearching(false);
      return;
    }

    if (!canSearchTo) {
      setToSuggestions([]);
      setToSearching(false);
      return;
    }

    const lat = effectiveCurrentLocation?.lat;
    const lng = effectiveCurrentLocation?.lng;
    const searchId = latestToSearchIdRef.current + 1;
    latestToSearchIdRef.current = searchId;
    const timer = window.setTimeout(async () => {
      setToSearching(true);
      try {
        const params = new URLSearchParams({ q: query, limit: "6" });
        if (lat != null && lng != null) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
        }
        const res = await apiClient.get<GeocodeResponse>(`/geocode?${params.toString()}`);
        if (latestToSearchIdRef.current === searchId && selectedToAddressRef.current !== query) {
          setToSuggestions(res.data);
        }
      } catch {
        setToSuggestions([]);
      } finally {
        setToSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [effectiveCurrentLocation?.lat, effectiveCurrentLocation?.lng, routeToInput, canSearchTo, toMode]);

  const fromHint = useMemo(() => {
    if (fromMode === "current") return effectiveCurrentLocation ? "Đang dùng vị trí hiện tại" : "Cần cấp quyền định vị để dùng vị trí hiện tại";
    if (fromMode !== "address") return "Chọn điểm có sẵn hoặc chuyển sang nhập địa chỉ";
    if (!routeFromInput.trim()) return "Nhập địa chỉ xuất phát";
    if (fromSearching) return "Đang tìm gợi ý...";
    if (fromSuggestions.length === 0 && canSearchFrom) return "Không có gợi ý phù hợp";
    if (selectedFromLabel && selectedFromLabel === routeFromInput.trim()) return "Đã chọn điểm xuất phát";
    return "Chọn 1 gợi ý để định vị chính xác";
  }, [effectiveCurrentLocation, fromMode, routeFromInput, fromSearching, fromSuggestions.length, canSearchFrom, selectedFromLabel]);

  const toHint = useMemo(() => {
    if (toMode === "current") return effectiveCurrentLocation ? "Đang dùng vị trí hiện tại" : "Cần cấp quyền định vị để dùng vị trí hiện tại";
    if (toMode !== "address") return "Chọn điểm có sẵn hoặc chuyển sang nhập địa chỉ";
    if (!routeToInput.trim()) return "Nhập địa chỉ đích";
    if (toSearching) return "Đang tìm gợi ý...";
    if (toSuggestions.length === 0 && canSearchTo) return "Không có gợi ý phù hợp";
    if (selectedToLabel && selectedToLabel === routeToInput.trim()) return "Đã chọn điểm đích";
    return "Chọn 1 gợi ý để định vị chính xác";
  }, [effectiveCurrentLocation, toMode, routeToInput, toSearching, toSuggestions.length, canSearchTo, selectedToLabel]);

  const fromPlaceOptions = useMemo(() => {
    const query = normalizeVietnameseText(routeFromPlaceInput);
    if (!query) return routableLocationOptions.slice(0, 30);
    return routableLocationOptions
      .filter((loc) => {
        const normalizedLabel = normalizeVietnameseText(loc.label);
        const normalizedType = normalizeVietnameseText(LOCATION_TYPE_CONFIG[loc.type]?.label ?? loc.type);
        return normalizedLabel.includes(query) || normalizedType.includes(query);
      })
      .slice(0, 30);
  }, [routableLocationOptions, routeFromPlaceInput]);

  const toPlaceOptions = useMemo(() => {
    const query = normalizeVietnameseText(routeToPlaceInput);
    if (!query) return routableLocationOptions.slice(0, 30);
    return routableLocationOptions
      .filter((loc) => {
        const normalizedLabel = normalizeVietnameseText(loc.label);
        const normalizedType = normalizeVietnameseText(LOCATION_TYPE_CONFIG[loc.type]?.label ?? loc.type);
        return normalizedLabel.includes(query) || normalizedType.includes(query);
      })
      .slice(0, 30);
  }, [routableLocationOptions, routeToPlaceInput]);

  return (
    <div ref={rootRef} className="absolute inset-0 z-[500] pointer-events-none p-3">
      {(showFilters || showRoute) && (
        <button
          type="button"
          aria-label="Đóng menu tìm đường"
          onClick={() => {
            setShowFilters(false);
            setShowRoute(false);
          }}
          className="absolute inset-0 z-0 cursor-default bg-transparent"
        />
      )}
      {/* Top bar */}
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => { setShowFilters(!showFilters); setShowRoute(false); }}
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition ${
            showFilters ? "bg-primary text-white" : "bg-white text-text-main"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Lọc điểm
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{activeFilterCount}</span>
          )}
        </button>

        {/* Route toggle */}
        {onRouteRequest && (
          <button
            type="button"
            onClick={() => { setShowRoute(!showRoute); setShowFilters(false); }}
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition ${
              showRoute ? "bg-primary text-white" : "bg-white text-text-main"
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            Tìm đường
          </button>
        )}

        {/* Place mode toggle */}
        {onTogglePlacingMode && (
          <button
            type="button"
            onClick={onTogglePlacingMode}
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition ${
              placingMode ? "bg-emerald-600 text-white" : "bg-white text-text-main"
            }`}
          >
            <Locate className="h-3.5 w-3.5" />
            {placingMode ? "Đang đặt điểm..." : "Đặt trên bản đồ"}
          </button>
        )}

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onFilterChange([]);
              onStatusFilterChange?.([]);
            }}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-danger shadow-lg"
          >
            <X className="h-3.5 w-3.5" />
            Bỏ lọc
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="pointer-events-auto relative z-10 max-w-sm rounded-xl bg-white p-3 shadow-lg">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Loại điểm</p>
          <div className="flex flex-wrap gap-1.5">
            {allTypes.map((type) => {
              const cfg = LOCATION_TYPE_CONFIG[type];
              const active = filterTypes.length === 0 || filterTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? "text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                  style={active ? { backgroundColor: cfg.color } : undefined}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
          {onStatusFilterChange && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Trạng thái</p>
              <div className="flex flex-wrap gap-1.5">
                {allStatuses.map((status) => {
                  const active = filterStatuses.length === 0 || filterStatuses.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatus(status)}
                      className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                        active ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {LOCATION_STATUS_LABELS[status] ?? status}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route panel */}
      {showRoute && (
        <div className="pointer-events-auto relative z-10 max-w-sm rounded-xl bg-white p-3 shadow-lg">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Tìm đường</p>
          <div className="space-y-2">
            <div className="rounded-xl border border-gray-200 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Điểm xuất phát</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 text-[10px] font-bold">
                  <button type="button" onClick={() => setRouteMode("from", "address")} className={`rounded-md px-2 py-1 transition ${fromMode === "address" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Địa chỉ</button>
                  <button type="button" onClick={() => setRouteMode("from", "place")} className={`rounded-md px-2 py-1 transition ${fromMode === "place" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Điểm sẵn</button>
                  <button type="button" onClick={() => void selectCurrentLocation("from")} className={`rounded-md px-2 py-1 transition ${fromMode === "current" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Hiện tại</button>
                </div>
              </div>

              {fromMode === "address" ? (
                <>
                  <input type="text" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" placeholder="Nhập điểm xuất phát..." value={routeFromInput} onChange={(e) => {
                    const next = e.target.value;
                    setRouteFromInput(next);
                    if (normalizeRouteLabel(next) !== selectedFromAddressRef.current) {
                      selectedFromAddressRef.current = "";
                      if (routeFromPoint) setRouteFromPoint(null);
                    }
                  }} />
                  <p className="mt-1 text-[10px] text-text-subtle">{fromHint}</p>
                  {fromSuggestions.length > 0 && (
                    <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                      {fromSuggestions.map((suggestion) => (
                        <button key={`from-${suggestion.id}`} type="button" onClick={() => void selectAddressSuggestion("from", suggestion)} className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-text-main hover:bg-gray-50 last:border-b-0">
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : fromMode === "place" ? (
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Tìm điểm xuất phát có sẵn..."
                    value={routeFromPlaceInput}
                    onFocus={() => setShowFromPlaceOptions(true)}
                    onChange={(e) => {
                      setRouteFromPlaceInput(e.target.value);
                      setShowFromPlaceOptions(true);
                      setRouteFromPlaceId("");
                    }}
                  />
                  {showFromPlaceOptions && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
                      {fromPlaceOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-text-subtle">Không có điểm phù hợp</p>
                      ) : (
                        fromPlaceOptions.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => {
                              setRouteFromPlaceId(loc.id);
                              setRouteFromPlaceInput(loc.label);
                              setShowFromPlaceOptions(false);
                            }}
                            className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-text-main hover:bg-gray-50 last:border-b-0"
                          >
                            {loc.label} · {LOCATION_TYPE_CONFIG[loc.type]?.label ?? loc.type}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  <div className="flex items-center gap-2 font-bold">
                    <LocateFixed className="h-3.5 w-3.5" />
                    Vị trí hiện tại
                  </div>
                  <p className="mt-1 text-[10px] text-sky-800">
                    {currentLocationLoading === "from"
                      ? "Đang lấy vị trí..."
                      : effectiveCurrentLocation
                      ? `${effectiveCurrentLocation.lat.toFixed(5)}, ${effectiveCurrentLocation.lng.toFixed(5)}`
                      : "Chưa có quyền định vị"}
                  </p>
                </div>
              )}
              {fromMode === "current" && currentLocationError && (
                <p className="mt-1 text-[10px] font-semibold text-danger">{currentLocationError}</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Điểm đến</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 text-[10px] font-bold">
                  <button type="button" onClick={() => setRouteMode("to", "address")} className={`rounded-md px-2 py-1 transition ${toMode === "address" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Địa chỉ</button>
                  <button type="button" onClick={() => setRouteMode("to", "place")} className={`rounded-md px-2 py-1 transition ${toMode === "place" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Điểm sẵn</button>
                  <button type="button" onClick={() => void selectCurrentLocation("to")} className={`rounded-md px-2 py-1 transition ${toMode === "current" ? "bg-white text-primary shadow-sm" : "text-text-subtle"}`}>Hiện tại</button>
                </div>
              </div>

              {toMode === "address" ? (
                <>
                  <input type="text" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" placeholder="Nhập điểm đến..." value={routeToInput} onChange={(e) => {
                    const next = e.target.value;
                    setRouteToInput(next);
                    if (normalizeRouteLabel(next) !== selectedToAddressRef.current) {
                      selectedToAddressRef.current = "";
                      if (routeToPoint) setRouteToPoint(null);
                    }
                  }} />
                  <p className="mt-1 text-[10px] text-text-subtle">{toHint}</p>
                  {toSuggestions.length > 0 && (
                    <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                      {toSuggestions.map((suggestion) => (
                        <button key={`to-${suggestion.id}`} type="button" onClick={() => void selectAddressSuggestion("to", suggestion)} className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-text-main hover:bg-gray-50 last:border-b-0">
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : toMode === "place" ? (
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Tìm điểm đến có sẵn..."
                    value={routeToPlaceInput}
                    onFocus={() => setShowToPlaceOptions(true)}
                    onChange={(e) => {
                      setRouteToPlaceInput(e.target.value);
                      setShowToPlaceOptions(true);
                      setRouteToPlaceId("");
                    }}
                  />
                  {showToPlaceOptions && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
                      {toPlaceOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-text-subtle">Không có điểm phù hợp</p>
                      ) : (
                        toPlaceOptions.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => {
                              setRouteToPlaceId(loc.id);
                              setRouteToPlaceInput(loc.label);
                              setShowToPlaceOptions(false);
                            }}
                            className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-text-main hover:bg-gray-50 last:border-b-0"
                          >
                            {loc.label} · {LOCATION_TYPE_CONFIG[loc.type]?.label ?? loc.type}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  <div className="flex items-center gap-2 font-bold">
                    <LocateFixed className="h-3.5 w-3.5" />
                    Vị trí hiện tại
                  </div>
                  <p className="mt-1 text-[10px] text-sky-800">
                    {currentLocationLoading === "to"
                      ? "Đang lấy vị trí..."
                      : effectiveCurrentLocation
                      ? `${effectiveCurrentLocation.lat.toFixed(5)}, ${effectiveCurrentLocation.lng.toFixed(5)}`
                      : "Chưa có quyền định vị"}
                  </p>
                </div>
              )}
              {toMode === "current" && currentLocationError && (
                <p className="mt-1 text-[10px] font-semibold text-danger">{currentLocationError}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Phương tiện</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(VEHICLE_TYPES).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVehicleType(key)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                      vehicleType === key
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-100 text-text-subtle hover:bg-gray-200"
                    }`}
                  >
                    <span className="text-lg">{cfg.emoji}</span>
                    <span className="text-[9px]">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRouteSubmit}
              disabled={!canSubmitRoute}
              className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {routeLoading ? "Đang tìm..." : "Tìm đường"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
