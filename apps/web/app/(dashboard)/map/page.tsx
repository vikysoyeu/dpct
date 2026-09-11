"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MapPinned,
  Navigation,
  ShieldAlert,
  X
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { fetchLocationDetail, useLocations } from "@/hooks/useLocations";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRoute } from "@/hooks/useRoute";
import { LOCATION_TYPE_CONFIG } from "@/lib/map-config";
import { formatDescription } from "@/lib/text-format";
import { API_BASE_URL } from "@/lib/api";
import type { BrowserLocation } from "@/lib/map-utils";
import type { Location, LocationType } from "@rescue/types";

const MapView = dynamic(
  () => import("../../../components/map/MapView").then((m) => ({ default: m.MapView })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-surface-low rounded-xl"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> }
);
const MapControls = dynamic(
  () => import("../../../components/map/MapControls").then((m) => ({ default: m.MapControls })),
  { ssr: false }
);

const REPORT_TYPES: { value: string; label: string }[] = [
  { value: "URGENT_NEED", label: "🚨 Y tế khẩn cấp" },
  { value: "VICTIM_AREA", label: "🧑‍🤝‍🧑 Vùng nạn nhân" },
  { value: "NEED_POINT", label: "📍 Nước sạch / Thực phẩm" },
  { value: "BLOCKED_ROAD", label: "🚧 Tắc đường / Cầu hỏng" },
  { value: "FOOD_SUPPORT", label: "🍚 Hỗ trợ ăn uống" },
  { value: "REST_STOP", label: "🛏️ Điểm dừng nghỉ" },
];

type ReportErrors = Partial<Record<"name" | "lat" | "lng", string>>;

export default function BanDoDieuPhoiPage() {
  const { locations, loading: loadingLoc, createLocation } = useLocations();
  const { stats, loading: loadingStats } = useDashboardStats();
  const { routes, loading: routeLoading, error: routeError, findRoute, clearRoute } = useRoute();
  const [routeStartPoint, setRouteStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [routeEndPoint, setRouteEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<BrowserLocation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Location | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Report form
  const [showReport, setShowReport] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState("URGENT_NEED");
  const [reportLat, setReportLat] = useState("");
  const [reportLng, setReportLng] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportErrors, setReportErrors] = useState<ReportErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);

  const loadSelectedDetail = useCallback(async (loc: Location) => {
    setSelectedLocation(loc);
    setSelectedDetail(null);
    setLoadingDetail(true);
    try {
      setSelectedDetail(await fetchLocationDetail(loc.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleMarkerClick = useCallback((loc: Location) => {
    void loadSelectedDetail(loc);
    setPlacingMode(false);
  }, [loadSelectedDetail]);

  const handleMapBackgroundClick = useCallback(() => {
    setShowReport(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!placingMode) return;
    setReportLat(lat.toFixed(6));
    setReportLng(lng.toFixed(6));
    setReportErrors((current) => ({ ...current, lat: undefined, lng: undefined }));
    setPlacingMode(false);
    setShowReport(true);
  }, [placingMode]);

  const handleSubmitReport = async () => {
    if (!validateReport()) return;
    setSubmitting(true);
    try {
      await createLocation({
        type: reportType as LocationType,
        name: reportName,
        description: reportDesc || undefined,
        lat: parseFloat(reportLat),
        lng: parseFloat(reportLng),
        urgency: reportType === "URGENT_NEED" ? 5 : reportType === "BLOCKED_ROAD" ? 4 : 3,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReportName(""); setReportType("URGENT_NEED");
        setReportLat(""); setReportLng(""); setReportDesc("");
        setShowReport(false);
      }, 3000);
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  function validateReportField(name: keyof ReportErrors, value: string) {
    const trimmed = value.trim();
    if (name === "name" && !trimmed) return "Tên vị trí bắt buộc nhập.";
    if ((name === "lat" || name === "lng") && !trimmed) return `${name === "lat" ? "Lat" : "Lng"} bắt buộc nhập.`;
    if ((name === "lat" || name === "lng") && Number.isNaN(Number(trimmed))) return `${name === "lat" ? "Lat" : "Lng"} phải là số hợp lệ.`;
    return "";
  }

  function validateReport() {
    const next: ReportErrors = {
      name: validateReportField("name", reportName),
      lat: validateReportField("lat", reportLat),
      lng: validateReportField("lng", reportLng),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as ReportErrors;
    setReportErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function setReportField(name: keyof ReportErrors, value: string) {
    if (name === "name") setReportName(value);
    if (name === "lat") setReportLat(value);
    if (name === "lng") setReportLng(value);
    if (reportErrors[name]) {
      setReportErrors((current) => ({ ...current, [name]: validateReportField(name, value) || undefined }));
    }
  }

  function touchReportField(name: keyof ReportErrors, value: string) {
    setReportErrors((current) => ({ ...current, [name]: validateReportField(name, value) || undefined }));
  }

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

  const activeLocations = locations.filter((l) => l.status === "ACTIVE");
  const displayLocation = selectedDetail ?? selectedLocation;
  const displayImages = displayLocation?.imageUrls ?? [];
  const displayNeeds = displayLocation?.needs ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bản đồ Điều phối"
        subtitle="Theo dõi tất cả điểm cứu trợ trên bản đồ thật. Nhấn marker để xem chi tiết."
        actions={[
          { href: "#", label: "Gửi báo cáo" },
          { href: "/guides", label: "Hướng dẫn an toàn", variant: "secondary" }
        ]}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Map */}
        <div className="relative h-[560px] overflow-hidden rounded-2xl bg-surface-card shadow-ambient xl:h-[calc(100vh-220px)] xl:min-h-[560px] xl:max-h-[760px]">
          {loadingLoc ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-text-subtle">Đang tải bản đồ...</span>
            </div>
          ) : (
            <>
              <MapView
                locations={activeLocations}
                selectedId={selectedLocation?.id}
                filterTypes={filterTypes}
                onMarkerClick={handleMarkerClick}
                onMapClick={handleMapClick}
                onMapBackgroundClick={handleMapBackgroundClick}
                routes={routes}
                routeStartPoint={routeStartPoint}
                routeEndPoint={routeEndPoint}
                height="100%"
                placingMode={placingMode}
                className="h-full min-h-0"
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
                onUserLocationChange={setCurrentLocation}
                detailHref={(location) => `/locations/${location.id}`}
              >
                <MapControls
                  filterTypes={filterTypes}
                  onFilterChange={setFilterTypes}
                  onRouteRequest={handleRouteRequest}
                  currentLocation={currentLocation}
                  locationOptions={activeLocations.map((loc) => ({
                    id: loc.id,
                    label: loc.name,
                    type: loc.type,
                    lat: loc.lat,
                    lng: loc.lng,
                  }))}
                  routeLoading={routeLoading}
                  placingMode={placingMode}
                  onTogglePlacingMode={() => { setPlacingMode(!placingMode); if (!placingMode) setShowReport(false); }}
                />

                {/* Route result overlay */}
                {routes.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white p-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Navigation className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">{(routes[0].distance / 1000).toFixed(1)} km</span>
                      <span className="text-xs text-text-subtle">· ~{Math.ceil(routes[0].duration / 60)} phút</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{routes.length} route</span>
                      <button type="button" onClick={() => { clearRoute(); setRouteStartPoint(null); setRouteEndPoint(null); }} className="text-text-subtle hover:text-danger"><X className="h-3.5 w-3.5" /></button>
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

        {/* Sidebar */}
        <aside className="space-y-4 xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
          {/* Selected location detail */}
          {selectedLocation && (
            <section className="rounded-2xl bg-surface-card p-4 shadow-ambient">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-subtle">Chi tiết điểm</span>
                <button type="button" onClick={() => { setSelectedLocation(null); setSelectedDetail(null); }} className="text-text-subtle hover:text-danger"><X className="h-3.5 w-3.5" /></button>
              </div>
              {displayImages[0] ? (
                <img src={resolveImage(displayImages[0])} alt={displayLocation?.name ?? "Địa điểm"} className="mb-3 aspect-[16/9] w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-3 flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-surface-low text-text-subtle">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: LOCATION_TYPE_CONFIG[displayLocation?.type ?? selectedLocation.type]?.color ?? "#6b7280" }} />
                <span className="text-xs font-bold text-text-subtle">{LOCATION_TYPE_CONFIG[displayLocation?.type ?? selectedLocation.type]?.label ?? displayLocation?.type ?? selectedLocation.type}</span>
              </div>
              <h3 className="mt-1 text-base font-black text-text-main">{displayLocation?.name ?? selectedLocation.name}</h3>
              {displayLocation?.description && <p className="formatted-description mt-1 text-xs text-text-subtle">{formatDescription(displayLocation.description)}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Khẩn" value={`${displayLocation?.urgency ?? selectedLocation.urgency}/5`} />
                <Metric label="Ảnh" value={String(displayImages.length)} />
                <Metric label="Nhu cầu" value={loadingDetail ? "..." : String(displayNeeds.length)} />
              </div>
              {displayNeeds.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {displayNeeds.slice(0, 3).map((need) => (
                    <div key={need.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-low px-2.5 py-2 text-xs">
                      <span className="truncate font-bold text-text-main">{need.item}</span>
                      <span className="shrink-0 text-text-subtle">{need.quantity} {need.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {displayImages.length > 1 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {displayImages.slice(1, 4).map((url) => (
                    <img key={url} src={resolveImage(url)} alt={displayLocation?.name ?? "Địa điểm"} className="aspect-square rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <div className="mt-1 text-[10px] text-text-subtle">
                <MapPinned className="mr-1 inline h-3 w-3" />{(displayLocation?.lat ?? selectedLocation.lat).toFixed(5)}, {(displayLocation?.lng ?? selectedLocation.lng).toFixed(5)}
              </div>
              <Link href={`/locations/${selectedLocation.id}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white">
                Xem hồ sơ địa điểm <ExternalLink className="h-4 w-4" />
              </Link>
            </section>
          )}

          {/* Quick stats */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-card p-3 shadow-ambient text-center">
              <p className="text-2xl font-black text-primary">{loadingStats ? "..." : stats?.activeLocations ?? 0}</p>
              <p className="text-[10px] font-bold uppercase text-text-subtle">Điểm hoạt động</p>
            </div>
            <div className="rounded-xl bg-surface-card p-3 shadow-ambient text-center">
              <p className="text-2xl font-black text-danger">{loadingStats ? "..." : stats?.unmetNeeds ?? 0}</p>
              <p className="text-[10px] font-bold uppercase text-text-subtle">Nhu cầu chờ</p>
            </div>
          </section>

          {/* Recent active feed */}
          <section className="rounded-2xl bg-surface-card p-4 shadow-ambient">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.1em] text-text-subtle">Điểm đang hoạt động</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">{activeLocations.length}</span>
            </div>
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {activeLocations.slice(0, 8).map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => void loadSelectedDetail(loc)}
                  className={`w-full rounded-xl p-2.5 text-left transition ${
                    selectedLocation?.id === loc.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-surface-low hover:bg-surface-high"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: LOCATION_TYPE_CONFIG[loc.type]?.color ?? "#6b7280" }} />
                    <span className="flex-1 truncate text-xs font-bold text-text-main">{loc.name}</span>
                    {loc.urgency >= 4 && <AlertTriangle className="h-3 w-3 text-danger" />}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Report form */}
          <section id="bao-cao-cuu-tro" className="rounded-2xl bg-surface-card p-4 shadow-ambient">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.1em] text-text-subtle">Báo cáo nhanh</h2>
              <button type="button" onClick={() => setShowReport(!showReport)}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold ${showReport ? "bg-danger/10 text-danger" : "bg-primary text-white"}`}>
                {showReport ? "Đóng" : "Mở form"}
              </button>
            </div>

            {showReport && (
              submitted ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="font-bold text-emerald-700">Đã gửi thành công!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <input type="text" className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm ${reportErrors.name ? "border-danger" : "border-outline/30"}`} placeholder="Tên vị trí *" value={reportName} onChange={(e) => setReportField("name", e.target.value)} onBlur={() => touchReportField("name", reportName)} aria-required aria-invalid={Boolean(reportErrors.name)} />
                    {reportErrors.name && <p className="mt-1 text-xs font-bold text-danger">{reportErrors.name}</p>}
                  </div>
                  <select className="w-full rounded-lg border border-outline/30 bg-surface px-3 py-2 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                    {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <input type="number" step="any" className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm ${reportErrors.lat ? "border-danger" : "border-outline/30"}`} placeholder="Lat *" value={reportLat} onChange={(e) => setReportField("lat", e.target.value)} onBlur={() => touchReportField("lat", reportLat)} aria-required aria-invalid={Boolean(reportErrors.lat)} />
                      {reportErrors.lat && <span className="mt-1 block text-xs font-bold text-danger">{reportErrors.lat}</span>}
                    </label>
                    <label>
                      <input type="number" step="any" className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm ${reportErrors.lng ? "border-danger" : "border-outline/30"}`} placeholder="Lng *" value={reportLng} onChange={(e) => setReportField("lng", e.target.value)} onBlur={() => touchReportField("lng", reportLng)} aria-required aria-invalid={Boolean(reportErrors.lng)} />
                      {reportErrors.lng && <span className="mt-1 block text-xs font-bold text-danger">{reportErrors.lng}</span>}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPlacingMode(!placingMode)}
                      className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition ${placingMode ? "bg-emerald-600 text-white" : "bg-surface-low text-primary"}`}>
                      <MapPinned className="mr-1 inline h-3 w-3" />{placingMode ? "Nhấn bản đồ..." : "Chọn trên bản đồ"}
                    </button>
                  </div>
                  <textarea className="h-14 w-full rounded-lg border border-outline/30 bg-surface px-3 py-2 text-sm" placeholder="Mô tả (tùy chọn)" value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} />
                  <button type="button" onClick={handleSubmitReport} disabled={submitting}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-white disabled:opacity-50">
                    {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gửi báo cáo"}
                  </button>
                </div>
              )
            )}
          </section>
        </aside>
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/rescue-requests" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
          Xem yêu cầu cứu trợ <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/sponsorship" className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-4 py-2 text-sm font-bold text-primary">
          Nhà tài trợ <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function resolveImage(url: string) {
  return url.startsWith("/uploads") ? `${API_BASE_URL}${url}` : url;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-low px-2 py-2">
      <p className="text-sm font-black text-text-main">{value}</p>
      <p className="text-[10px] font-bold uppercase text-text-subtle">{label}</p>
    </div>
  );
}
