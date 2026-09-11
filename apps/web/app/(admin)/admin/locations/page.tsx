"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { apiClient, API_BASE_URL } from "@/lib/api";
import { CheckCircle2, Crosshair, Eye, ImagePlus, Loader2, MapPinned, Plus, RefreshCcw, Search, Trash2, Upload, X, Navigation } from "lucide-react";
import { VietnamAddressFields } from "@/components/address/VietnamAddressFields";
import { PageHeader } from "@/components/layout/page-header";
import { useLocations, fetchLocationDetail } from "@/hooks/useLocations";
import { useRoute } from "@/hooks/useRoute";
import type { Location, LocationStatus, LocationType, LocationUpdate } from "@rescue/types";
import { LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import type { BrowserLocation } from "@/lib/map-utils";

// Dynamic import to avoid SSR issues with Leaflet
const MapView = dynamic(
  () => import("../../../../components/map/MapView").then((m) => ({ default: m.MapView })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-surface-low rounded-xl"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> }
);
const MapControls = dynamic(
  () => import("../../../../components/map/MapControls").then((m) => ({ default: m.MapControls })),
  { ssr: false }
);

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  ACTIVE: "Đang hoạt động",
  DONE: "Đã xong",
  EXPIRED: "Hết hạn",
};

export default function AdminLocationsPage() {
  const { locations, total, loading, error, createLocation, updateLocation, deleteLocation, confirmLocation, addLocationImage, refetch } = useLocations();
  const { routes, loading: routeLoading, error: routeError, findRoute, clearRoute } = useRoute();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeStartPoint, setRouteStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [routeEndPoint, setRouteEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<BrowserLocation | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("URGENT_NEED");
  const [formStatus, setFormStatus] = useState<string>("ACTIVE");
  const [formProvince, setFormProvince] = useState("");
  const [formWard, setFormWard] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUrgency, setFormUrgency] = useState("3");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [areaQuery, setAreaQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  // Detail location with updates
  const [fullLocation, setFullLocation] = useState<Location | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [editingUpdate, setEditingUpdate] = useState<LocationUpdate | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Map state
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [placingMode, setPlacingMode] = useState(false);

  useEffect(() => {
    const id = selectedId;
    if (!id) {
      setFullLocation(null);
      return;
    }
    let active = true;
    async function loadDetail() {
      try {
        const data = await fetchLocationDetail(id as string);
        if (active) {
          setFullLocation(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadDetail();
    return () => {
      active = false;
    };
  }, [selectedId, refreshCounter]);

  const filteredLocations = locations.filter((loc) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const normalizedArea = areaQuery.trim().toLowerCase();
    const cfgLabel = LOCATION_TYPE_CONFIG[loc.type]?.label.toLowerCase() ?? "";
    const text = `${loc.name} ${loc.description ?? ""} ${loc.province ?? ""} ${loc.ward ?? ""} ${loc.address ?? ""}`.toLowerCase();

    const matchSearch =
      !normalizedSearch ||
      text.includes(normalizedSearch) ||
      loc.type.toLowerCase().includes(normalizedSearch) ||
      cfgLabel.includes(normalizedSearch);
    const matchType = typeFilter === "ALL" || loc.type === typeFilter;
    const matchStatus = statusFilter === "ALL" || loc.status === statusFilter;
    const matchArea =
      !normalizedArea ||
      text.includes(normalizedArea) ||
      `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`.includes(normalizedArea);

    return matchSearch && matchType && matchStatus && matchArea;
  });

  const selectedLocation = selectedId ? locations.find((l) => l.id === selectedId) : null;
  const isEditing = !!selectedId;
  const draftLocations = useMemo<Location[]>(() => {
    if (isEditing || !formLat.trim() || !formLng.trim()) return locations;
    const lat = Number(formLat);
    const lng = Number(formLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return locations;
    return [
      ...locations,
      {
        id: "draft-admin-location",
        type: formType as LocationType,
        status: formStatus as LocationStatus,
        name: formName || formAddress || "Địa điểm mới",
        description: formDesc || formAddress || null,
        province: formProvince || null,
        ward: formWard || null,
        address: formAddress || null,
        lat,
        lng,
        urgency: Number(formUrgency) || 1,
        imageUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Location,
    ];
  }, [formAddress, formDesc, formLat, formLng, formName, formProvince, formStatus, formType, formUrgency, formWard, isEditing, locations]);

  const handleMarkerClick = useCallback((loc: Location) => {
    setSelectedId(loc.id);
    setFormName(loc.name);
    setFormType(loc.type);
    setFormStatus(loc.status);
    setFormProvince(loc.province ?? "");
    setFormWard(loc.ward ?? "");
    setFormAddress(loc.address ?? "");
    setFormLat(String(loc.lat));
    setFormLng(String(loc.lng));
    setFormDesc(loc.description ?? "");
    setFormUrgency(String(loc.urgency));
    setPlacingMode(false);
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!placingMode) return;
      setFormLat(lat.toFixed(6));
      setFormLng(lng.toFixed(6));
      setFormError(null);
      setPlacingMode(false);
    },
    [placingMode]
  );

  const handleMapBackgroundClick = useCallback(() => {
    setPlacingMode(false);
  }, []);

  const handleRowClick = (id: string, scrollToMap = true) => {
    const loc = locations.find((l) => l.id === id);
    if (loc) handleMarkerClick(loc);
    if (scrollToMap) {
      window.requestAnimationFrame(() => {
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleCreate = async () => {
    if (!validateLocationForm(false)) return;
    setSubmitting(true);
    try {
      await createLocation({
        type: formType as LocationType,
        name: formName,
        description: formDesc || undefined,
        province: formProvince || undefined,
        ward: formWard || undefined,
        address: formAddress || undefined,
        lat: parseFloat(formLat),
        lng: parseFloat(formLng),
        urgency: parseInt(formUrgency),
      });
      resetForm();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (!selectedId || !validateLocationForm(true)) return;
    setSubmitting(true);
    try {
      await updateLocation(selectedId, {
        type: formType as LocationType,
        status: formStatus as LocationStatus,
        name: formName,
        description: formDesc || undefined,
        province: formProvince || undefined,
        ward: formWard || undefined,
        address: formAddress || undefined,
        lat: parseFloat(formLat),
        lng: parseFloat(formLng),
        urgency: parseInt(formUrgency),
      });
      resetForm();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  function validateLocationForm(editing: boolean) {
    if (!formName.trim()) {
      setFormError("Tên địa điểm bắt buộc nhập.");
      return false;
    }
    if (!formLat.trim() || !formLng.trim()) {
      setFormError("Vui lòng chọn tọa độ trên bản đồ hoặc chọn gợi ý địa chỉ.");
      return false;
    }
    if (!Number.isFinite(Number(formLat)) || !Number.isFinite(Number(formLng))) {
      setFormError("Tọa độ phải là số hợp lệ.");
      return false;
    }
    setFormError(null);
    return true;
  }

  const handleAddImageUrl = async () => {
    if (!selectedId || !imageUrl.trim()) return;
    setUploading(true);
    try {
      await addLocationImage(selectedId, { url: imageUrl.trim(), content: imageNote || undefined });
      setImageUrl("");
      setImageNote("");
      setRefreshCounter((prev) => prev + 1);
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const handleUploadImage = async (file?: File) => {
    if (!selectedId || !file) return;
    setUploading(true);
    try {
      const uploaded = await apiClient.upload<{ data: { url: string } }>("/upload", file);
      await addLocationImage(selectedId, {
        url: uploaded.data.url,
        content: imageNote || undefined,
      });
      setImageNote("");
      setRefreshCounter((prev) => prev + 1);
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const handleUpdateLocationUpdate = async () => {
    if (!editingUpdate) return;
    setSavingUpdate(true);
    try {
      await apiClient.patch(`/locations/updates/${editingUpdate.id}`, {
        imageUrl: editUrl.trim(),
        content: editNote.trim(),
      });
      setEditingUpdate(null);
      await refetch(true);
      setRefreshCounter((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDeleteLocationUpdate = async () => {
    if (!editingUpdate) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh/cập nhật này không?")) return;
    setSavingUpdate(true);
    try {
      await apiClient.del(`/locations/updates/${editingUpdate.id}`);
      setEditingUpdate(null);
      await refetch(true);
      setRefreshCounter((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa điểm "${name}"?`)) return;
    setSubmitting(true);
    try {
      await deleteLocation(id);
      if (selectedId === id) resetForm();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try { await confirmLocation(selectedId); } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleRouteRequest = useCallback(
    async (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number },
      vehicleType: string
    ) => {
      setRouteStartPoint(from);
      setRouteEndPoint(to);
      await findRoute(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
        vehicleType
      );
    },
    [findRoute]
  );

  const resetForm = () => {
    setSelectedId(null);
    setFormName(""); setFormType("URGENT_NEED"); setFormStatus("ACTIVE");
    setFormProvince(""); setFormWard(""); setFormAddress("");
    setFormLat(""); setFormLng(""); setFormDesc(""); setFormUrgency("3");
    setImageUrl(""); setImageNote("");
    setPlacingMode(false);
    clearRoute();
    setRouteStartPoint(null);
    setRouteEndPoint(null);
  };

  const selectedDetail = fullLocation ?? selectedLocation;
  const imageUpdates = (selectedDetail?.locationUpdates ?? []).filter((update) => !!update.imageUrl);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin - Quản lý Địa điểm"
        subtitle="Bản đồ tương tác: nhấn marker để chọn, nhấn bản đồ để đặt tọa độ, lọc theo loại và trạng thái."
        actions={[
          { href: "/admin", label: "Về dashboard", variant: "secondary" },
          { href: "/admin/needs", label: "Sang yêu cầu" }
        ]}
      />

      {/* Map + Form side by side */}
      <section ref={mapSectionRef} className="scroll-mt-24 grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Map */}
        <div className="relative rounded-2xl bg-surface-card shadow-ambient overflow-hidden" style={{ minHeight: "500px" }}>
          {loading ? (
            <div className="flex h-full min-h-[500px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <MapView
                locations={draftLocations}
                selectedId={selectedId}
                filterTypes={filterTypes}
                filterStatuses={filterStatuses}
                onMarkerClick={(location) => {
                  if (location.id === "draft-admin-location") return;
                  handleMarkerClick(location);
                }}
                onMapClick={handleMapClick}
                onMapBackgroundClick={handleMapBackgroundClick}
                routes={routes}
                routeStartPoint={routeStartPoint}
                routeEndPoint={routeEndPoint}
                height="100%"
                placingMode={placingMode}
                className="min-h-[500px]"
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
                onUserLocationChange={setCurrentLocation}
                detailHref={(location) => `/admin/locations/${location.id}`}
              >
                <MapControls
                  filterTypes={filterTypes}
                  onFilterChange={setFilterTypes}
                  filterStatuses={filterStatuses}
                  onStatusFilterChange={setFilterStatuses}
                  onRouteRequest={handleRouteRequest}
                  currentLocation={currentLocation}
                  locationOptions={locations.filter((loc) => loc.status === "ACTIVE").map((loc) => ({
                    id: loc.id,
                    label: loc.name,
                    type: loc.type,
                    lat: loc.lat,
                    lng: loc.lng,
                  }))}
                  routeLoading={routeLoading}
                  placingMode={placingMode}
                  onTogglePlacingMode={() => setPlacingMode(!placingMode)}
                />

                {/* Route info overlay */}
                {routes.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white p-3 shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <div className="text-xs">
                          <span className="font-bold">{(routes[0].distance / 1000).toFixed(1)} km</span>
                          <span className="mx-1 text-text-subtle">·</span>
                          <span className="text-text-subtle">{Math.ceil(routes[0].duration / 60)} phút</span>
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{routes.length} route</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => { clearRoute(); setRouteStartPoint(null); setRouteEndPoint(null); }} className="text-text-subtle hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {routes[1] && (
                      <div className="mt-1 text-[11px] text-slate-600">
                        Tuyến phụ: {(routes[1].distance / 1000).toFixed(1)} km · ~{Math.ceil(routes[1].duration / 60)} phút
                      </div>
                    )}
                  </div>
                )}

                {routeError && (
                  <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger shadow-lg">
                    Không tìm được lộ trình. Vui lòng chọn lại điểm đi/đến.
                  </div>
                )}

                {/* Map legend */}
                <div className="absolute bottom-3 right-3 z-[500] rounded-xl bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
                  <div className="space-y-1">
                    {Object.entries(LOCATION_TYPE_CONFIG).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-1.5 text-[10px]">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span>{cfg.emoji} {cfg.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </MapView>
            </>
          )}
        </div>

        {/* Form panel */}
        <article className="rounded-2xl bg-surface-card p-5 shadow-ambient self-start sticky top-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-primary">
                {isEditing ? "Chỉnh sửa điểm" : "Thêm điểm mới"}
              </h2>
              <p className="mt-0.5 text-xs text-text-subtle">
                {isEditing
                  ? `Đang sửa: ${selectedLocation?.name}`
                  : placingMode
                  ? "Nhấn lên bản đồ để chọn tọa độ"
                  : "Nhập khu vực, địa chỉ và chọn tọa độ trên bản đồ"}
              </p>
            </div>
            {isEditing && (
              <div className="flex items-center gap-1">
                <Link href={`/admin/locations/${selectedId}`} className="rounded-lg p-1.5 text-text-subtle hover:bg-surface-low" title="Xem chi tiết">
                  <Eye className="h-4 w-4" />
                </Link>
                <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-text-subtle hover:bg-surface-low">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Tên điểm *</label>
              <input
                className="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ví dụ: Trạm cứu trợ 01"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); if (formError) validateLocationForm(isEditing); }}
                onBlur={() => validateLocationForm(isEditing)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Loại điểm</label>
                <select className="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  {Object.entries(LOCATION_TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Trạng thái</label>
                <select className="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} disabled={!isEditing}>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <VietnamAddressFields
                province={formProvince}
                ward={formWard}
                address={formAddress}
                onProvinceChange={(value) => {
                  setFormProvince(value);
                  setFormWard("");
                  setFormLat("");
                  setFormLng("");
                  if (formError) setFormError(null);
                }}
                onWardChange={(value) => {
                  setFormWard(value);
                  setFormLat("");
                  setFormLng("");
                  if (formError) setFormError(null);
                }}
                onAddressChange={(value) => {
                  setFormAddress(value);
                  setFormLat("");
                  setFormLng("");
                  if (formError) setFormError(null);
                }}
                onAddressResolved={(point) => {
                  setFormAddress(point.label);
                  setFormLat(point.lat.toFixed(6));
                  setFormLng(point.lng.toFixed(6));
                  setPlacingMode(false);
                  setFormError(null);
                }}
                inputClassName="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                addressLabel="Địa chỉ chi tiết (không bắt buộc)"
                addressPlaceholder="Nhập số nhà, đường, trường học, trạm y tế..."
              />
              <div className="rounded-xl bg-surface-low px-3 py-2 text-xs font-semibold text-text-subtle">
                {formLat && formLng ? (
                  <span className="inline-flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Tọa độ đã chọn: {Number(formLat).toFixed(6)}, {Number(formLng).toFixed(6)}
                  </span>
                ) : (
                  "Có thể bỏ qua địa chỉ và đặt tọa độ chính xác."
                )}
              </div>
              <button
                type="button"
                onClick={() => setPlacingMode(!placingMode)}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  placingMode ? "bg-emerald-600 text-white" : "bg-surface-high text-primary hover:bg-primary/10"
                }`}
              >
                {placingMode ? <Crosshair className="h-4 w-4" /> : <MapPinned className="h-4 w-4" />}
                {placingMode ? "Đang chọn trên bản đồ" : "Chọn tọa độ trên bản đồ"}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Mức khẩn cấp</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v} type="button"
                    onClick={() => setFormUrgency(String(v))}
                    className={`flex-1 rounded-xl py-2 text-sm font-black transition ${
                      formUrgency === String(v)
                        ? v >= 4 ? "bg-danger text-white" : v === 3 ? "bg-amber-500 text-white" : "bg-primary text-white"
                        : "bg-surface-low text-text-subtle hover:bg-surface-high"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">Mô tả</label>
              <textarea
                className="h-16 w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Mô tả hiện trường..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            {formError && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{formError}</p>}

            {isEditing ? (
              <div className="space-y-2">
                <button type="button" onClick={handleUpdate} disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleConfirm} disabled={submitting}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface-high px-3 py-2 text-sm font-bold text-text-main disabled:opacity-50">
                    <RefreshCcw className="h-3.5 w-3.5" /> Gia hạn
                  </button>
                  <button type="button" onClick={() => handleDelete(selectedId!, selectedLocation?.name ?? "")} disabled={submitting}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-sm font-bold text-danger disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={handleCreate} disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Đang thêm..." : "Thêm địa điểm"}
              </button>
            )}

            {isEditing && selectedLocation && (
              <div className="rounded-xl border border-outline/15 bg-surface-low p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-text-subtle">Ảnh hiện trường</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-primary">{imageUpdates.length} ảnh</span>
                </div>
                {imageUpdates.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {imageUpdates.map((update) => {
                      const url = update.imageUrl as string;
                      return (
                        <button
                          key={update.id}
                          type="button"
                          onClick={() => {
                            setEditingUpdate(update);
                            setEditNote(update.content || "");
                            setEditUrl(update.imageUrl || "");
                          }}
                          className="group relative aspect-square w-full overflow-hidden rounded-lg border border-outline/10 hover:ring-2 hover:ring-primary"
                          title={update.content || "Click để chỉnh sửa hoặc xóa ảnh này"}
                        >
                          <img
                            src={url.startsWith("/uploads") ? `${API_BASE_URL}${url}` : url}
                            alt={selectedLocation.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                          {update.content && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] font-semibold text-white truncate text-left">
                              {update.content}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    className="w-full rounded-lg border border-outline/20 bg-white px-3 py-2 text-xs"
                    placeholder="Dán liên kết ảnh"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <input
                    className="w-full rounded-lg border border-outline/20 bg-white px-3 py-2 text-xs"
                    placeholder="Ghi chú ảnh / cập nhật hiện trường"
                    value={imageNote}
                    onChange={(e) => setImageNote(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleAddImageUrl} disabled={uploading || !imageUrl.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary disabled:opacity-50">
                      <ImagePlus className="h-3.5 w-3.5" /> Thêm ảnh
                    </button>
                    <label className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                      <Upload className="h-3.5 w-3.5" /> Tải lên
                      <input className="hidden" type="file" accept="image/*" onChange={(event) => handleUploadImage(event.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-text-subtle">
                  Ảnh và ghi chú được lưu trong bảng cập nhật địa điểm.
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      {selectedLocation && (
        <section className="grid gap-4 rounded-2xl bg-surface-card p-5 shadow-ambient lg:grid-cols-[1fr_1fr_1fr]">
          <InfoBlock label="Người báo điểm" value={selectedLocation.reportedBy?.name ?? selectedLocation.reportedById ?? "Chưa có"} hint={selectedLocation.reportedBy?.phone ?? ""} />
          <InfoBlock label="Người xác minh" value={selectedLocation.verifiedBy?.name ?? selectedLocation.verifiedById ?? "Chưa xác minh"} hint={selectedLocation.verifiedBy?.phone ?? ""} />
          <InfoBlock label="Dữ liệu liên quan" value={`${selectedLocation.needs?.length ?? 0} nhu cầu · ${selectedLocation.inventory?.length ?? 0} kho · ${selectedLocation.missions?.length ?? 0} nhiệm vụ`} hint={`Cập nhật: ${new Date(selectedLocation.updatedAt).toLocaleString("vi-VN")}`} />
        </section>
      )}

      {/* Location list table */}
      <section className="overflow-hidden rounded-2xl bg-surface-card shadow-ambient">
        <div className="border-b border-outline/15 px-5 py-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-black text-primary">Danh sách địa điểm</h2>
              <p className="mt-1 text-xs font-semibold text-text-subtle">Nhấn vào một dòng để chọn địa điểm và tự cuộn lên bản đồ.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setAreaQuery("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="inline-flex items-center justify-center rounded-xl bg-surface-high px-3 py-2 text-sm font-bold text-text-main hover:bg-primary/10 hover:text-primary"
            >
              Xóa bộ lọc
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto_auto]">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <input type="search" className="w-full rounded-xl border border-outline/20 bg-surface px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Tìm tên hoặc loại..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
          <input
            type="search"
            className="w-full rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Tìm theo thành phố / phường / xã..."
            value={areaQuery}
            onChange={(e) => setAreaQuery(e.target.value)}
          />
          <select
            className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Loại: Tất cả</option>
            {Object.entries(LOCATION_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 py-3 text-xs font-semibold text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>Hiển thị {filteredLocations.length} / {total} điểm</span>
          {selectedLocation ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">Đang chọn: {selectedLocation.name}</span>
          ) : null}
        </div>

        {!loading && !error && filteredLocations.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-card z-10">
                <tr className="border-b border-outline/15 font-label text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">
                  <th className="px-5 pb-2 pt-3">Tên điểm</th>
                  <th className="px-5 pb-2 pt-3">Loại</th>
                  <th className="px-5 pb-2 pt-3">Trạng thái</th>
                  <th className="px-5 pb-2 pt-3">Ảnh / Nhu cầu</th>
                  <th className="px-5 pb-2 pt-3 text-center">Khẩn</th>
                  <th className="px-5 pb-2 pt-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {filteredLocations.map((row) => {
                  const cfg = LOCATION_TYPE_CONFIG[row.type];
                  const isSelected = selectedId === row.id;
                  return (
                    <tr key={row.id} onClick={() => handleRowClick(row.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/8 ring-inset ring-1 ring-primary/30" : "hover:bg-surface-low/60"}`}>
                      <td className="px-5 py-2.5">
                        <p className="font-bold text-primary">{row.name}</p>
                        <p className="mt-0.5 text-[10px] text-text-subtle">
                          {[row.address, row.ward, row.province].filter(Boolean).join(", ") || `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`}
                        </p>
                        {(row.address || row.ward || row.province) && (
                          <p className="text-[10px] text-text-subtle">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</p>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg?.color ?? "#6b7280" }} />
                          <span className="text-text-subtle text-xs">{cfg?.label ?? row.type}</span>
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          row.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                          row.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          row.status === "DONE" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-text-subtle">
                        {row.imageUrls.length} ảnh · {row.needs?.length ?? 0} nhu cầu
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                          row.urgency >= 4 ? "bg-danger/15 text-danger" : row.urgency === 3 ? "bg-amber-100 text-amber-700" : "bg-surface-low text-text-subtle"
                        }`}>{row.urgency}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/admin/locations/${row.id}`} onClick={(e) => e.stopPropagation()} className="rounded-lg p-1 text-text-subtle hover:bg-primary/10 hover:text-primary" title="Chi tiết">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(row.id, row.name); }} disabled={submitting}
                            className="rounded-lg p-1 text-text-subtle hover:bg-danger/10 hover:text-danger disabled:opacity-40">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredLocations.length === 0 && (
          <div className="p-6 text-center text-sm text-text-subtle">
            {searchQuery || areaQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? "Không tìm thấy kết quả phù hợp bộ lọc."
              : "Chưa có địa điểm nào."}
          </div>
        )}
      </section>

      {editingUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-950">Chỉnh sửa ảnh/cập nhật hiện trường</h3>
              <button
                type="button"
                onClick={() => setEditingUpdate(null)}
                className="rounded-lg p-1.5 text-text-subtle hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center rounded-xl bg-slate-50 p-2">
                <img
                  src={editUrl.startsWith("/uploads") ? `${API_BASE_URL}${editUrl}` : editUrl}
                  alt="Xem trước ảnh"
                  className="max-h-48 rounded-lg object-contain"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-text-subtle">
                  Liên kết hình ảnh
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-outline/25 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-900"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-text-subtle">
                  Ghi chú ảnh / cập nhật
                </label>
                <textarea
                  className="h-20 w-full resize-none rounded-xl border border-outline/25 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-900"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Nhập ghi chú hoặc thông tin cập nhật hiện trường..."
                />
              </div>

              <div className="flex gap-2 border-t border-outline/10 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteLocationUpdate}
                  disabled={savingUpdate}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUpdate(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleUpdateLocationUpdate}
                  disabled={savingUpdate || !editUrl.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-strong disabled:opacity-50"
                >
                  {savingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-low p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-text-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-main">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-subtle">{hint}</p> : null}
    </div>
  );
}
