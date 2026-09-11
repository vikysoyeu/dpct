"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { getProvinceNames, getWardNames } from "@/lib/vn-address";

export type GeocodeSuggestion = {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
  provider?: string;
};

type ResolvedAddress = {
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  province: string;
  ward: string;
  address?: string;
  onProvinceChange: (value: string) => void;
  onWardChange: (value: string) => void;
  onAddressChange?: (value: string) => void;
  onAddressResolved?: (value: ResolvedAddress) => void;
  onAddressSearchStateChange?: (searching: boolean) => void;
  showAddress?: boolean;
  provinceLabel?: string;
  wardLabel?: string;
  addressLabel?: string;
  addressPlaceholder?: string;
  className?: string;
  inputClassName?: string;
};

function isValidCoordinate(lat?: number, lng?: number) {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

function normalizeAddressLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function VietnamAddressFields({
  province,
  ward,
  address = "",
  onProvinceChange,
  onWardChange,
  onAddressChange,
  onAddressResolved,
  onAddressSearchStateChange,
  showAddress = true,
  provinceLabel = "Tỉnh/Thành",
  wardLabel = "Phường/Xã",
  addressLabel = "Địa chỉ",
  addressPlaceholder = "Nhập số nhà, đường, địa điểm...",
  className = "space-y-3",
  inputClassName = "w-full rounded-xl border border-outline/30 bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
}: Props) {
  const provinces = useMemo(() => getProvinceNames(), []);
  const wards = useMemo(() => getWardNames(province), [province]);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState("");
  const selectedAddressLabelRef = useRef("");
  const latestSearchIdRef = useRef(0);
  const hasAddressInput = showAddress && Boolean(onAddressChange);

  function rememberSelectedAddress(label: string) {
    const normalized = normalizeAddressLabel(label);
    selectedAddressLabelRef.current = normalized;
    setSelectedAddressLabel(normalized);
  }

  useEffect(() => {
    if (province && !provinces.includes(province)) {
      onProvinceChange("");
      onWardChange("");
      return;
    }
    if (ward && !wards.includes(ward)) onWardChange("");
  }, [onProvinceChange, onWardChange, province, provinces, ward, wards]);

  useEffect(() => {
    onAddressSearchStateChange?.(searching);
  }, [onAddressSearchStateChange, searching]);

  useEffect(() => {
    selectedAddressLabelRef.current = "";
    setSelectedAddressLabel("");
  }, [province, ward]);

  useEffect(() => {
    const query = normalizeAddressLabel(address);
    if (selectedAddressLabel && query === selectedAddressLabel) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    if (!hasAddressInput || !province || !ward || query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const searchId = latestSearchIdRef.current + 1;
    latestSearchIdRef.current = searchId;
    const timerId = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query, province, ward, limit: "6" });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/geocode?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Không tìm được địa chỉ lúc này.");
        const data = (await res.json()) as { data: GeocodeSuggestion[] };
        if (latestSearchIdRef.current === searchId && selectedAddressLabelRef.current !== query) {
          setSuggestions(data.data);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [address, hasAddressInput, province, selectedAddressLabel, ward]);

  async function selectSuggestion(suggestion: GeocodeSuggestion) {
    rememberSelectedAddress(suggestion.label);
    onAddressChange?.(suggestion.label);
    setSuggestions([]);
    latestSearchIdRef.current += 1;

    if (!onAddressResolved) return;
    setSearching(true);
    try {
      if (isValidCoordinate(suggestion.lat, suggestion.lng)) {
        onAddressResolved({ lat: suggestion.lat!, lng: suggestion.lng!, label: suggestion.label });
        return;
      }
      const params = new URLSearchParams({ id: suggestion.id });
      const res = await apiClient.get<{ data: GeocodeSuggestion }>(`/geocode/resolve?${params.toString()}`);
      if (isValidCoordinate(res.data.lat, res.data.lng)) {
        const resolvedLabel = res.data.label || suggestion.label;
        rememberSelectedAddress(resolvedLabel);
        if (normalizeAddressLabel(resolvedLabel) !== normalizeAddressLabel(suggestion.label)) {
          onAddressChange?.(resolvedLabel);
        }
        onAddressResolved({ lat: res.data.lat!, lng: res.data.lng!, label: resolvedLabel });
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{provinceLabel}</span>
          <select
            value={province}
            onChange={(event) => {
              onProvinceChange(event.target.value);
              onWardChange("");
            }}
            className={inputClassName}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{wardLabel}</span>
          <select value={ward} onChange={(event) => onWardChange(event.target.value)} disabled={!province} className={inputClassName}>
            <option value="">{province ? "Chọn phường/xã" : "Chọn tỉnh/thành trước"}</option>
            {wards.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {showAddress && onAddressChange && (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-text-subtle">{addressLabel}</span>
            <div className="relative">
              <input
                value={address}
                onChange={(event) => {
                  selectedAddressLabelRef.current = "";
                  setSelectedAddressLabel("");
                  onAddressChange(event.target.value);
                }}
                disabled={!province || !ward}
                placeholder={province && ward ? addressPlaceholder : "Chọn tỉnh/thành và phường/xã trước"}
                className={`${inputClassName} pr-10`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </span>
            </div>
          </label>
          {suggestions.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-outline/30 bg-white">
              {suggestions.map((item) => (
                <button key={item.id} type="button" onClick={() => void selectSuggestion(item)} className="flex w-full items-start gap-3 border-b border-outline/20 px-3 py-3 text-left text-sm last:border-b-0 hover:bg-surface-high">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 font-semibold text-slate-900">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
