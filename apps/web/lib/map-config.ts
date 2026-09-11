/**
 * Map configuration constants
 * Default viewport is centered on Vietnam and constrained around Vietnam.
 */

export const MAP_DEFAULT_CENTER: [number, number] = [16.2, 106.5];
export const MAP_DEFAULT_ZOOM = 6;
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;

/**
 * Strict viewport for Vietnam and nearby sea area.
 * maxBounds is slightly larger than VN so panning feels natural.
 */
export const MAP_VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [8.1, 102.0],
  [23.9, 110.8],
];

export const MAP_VIETNAM_MAX_BOUNDS: [[number, number], [number, number]] = [
  [6.8, 100.8],
  [24.9, 112.2],
];

export const TILE_URL =
  process.env.NEXT_PUBLIC_OSM_TILE ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Color scheme for each location type on the map.
 * Each type has a fill color (for the marker) and a name label.
 */
export const LOCATION_TYPE_CONFIG: Record<
  string,
  { color: string; emoji: string; label: string }
> = {
  STAGING_AREA: { color: "#3b82f6", emoji: "📦", label: "Tập kết" },
  VICTIM_AREA: { color: "#f59e0b", emoji: "🧑‍🤝‍🧑", label: "Nạn nhân" },
  TRANSIT_POINT: { color: "#8b5cf6", emoji: "🔄", label: "Trung chuyển" },
  URGENT_NEED: { color: "#ef4444", emoji: "🚨", label: "Khẩn cấp" },
  NEED_POINT: { color: "#f97316", emoji: "📍", label: "Cần cứu trợ" },
  BLOCKED_ROAD: { color: "#dc2626", emoji: "🚧", label: "Tắc đường" },
  FOOD_SUPPORT: { color: "#22c55e", emoji: "🍚", label: "Hỗ trợ ăn uống" },
  REST_STOP: { color: "#06b6d4", emoji: "🛏️", label: "Điểm nghỉ" },
};

export const LOCATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  ACTIVE: "Đang hoạt động",
  DONE: "Đã xong",
  EXPIRED: "Hết hạn",
};

/** Vehicle types for routing (Valhalla costing models) */
export const VEHICLE_TYPES: Record<
  string,
  { label: string; emoji: string; costing: string }
> = {
  auto: { label: "Xe hơi", emoji: "🚗", costing: "auto" },
  truck: { label: "Xe tải", emoji: "🚛", costing: "truck" },
  motorcycle: { label: "Xe máy", emoji: "🏍️", costing: "motorcycle" },
  pedestrian: { label: "Đi bộ", emoji: "🚶", costing: "pedestrian" },
  bicycle: { label: "Xe đạp", emoji: "🚲", costing: "bicycle" },
};
