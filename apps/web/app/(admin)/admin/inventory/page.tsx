"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, CalendarClock, CheckCircle2, ClipboardList, HandHeart, Loader2, Mail, PackagePlus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { missionStatusLabel, priorityLabel, requestStatusLabel } from "@/hooks/useAdminRescue";
import { useInventory } from "@/hooks/useInventory";
import { useLocations } from "@/hooks/useLocations";
import { apiClient } from "@/lib/api";
import { rescueRequestDisplayName, rescueRequestSearchText } from "@/lib/rescue-request";

type InventoryTab = "stock" | "sponsorship";
type AssignmentView = "requests" | "missions";

type SponsorshipItem = {
  id: string;
  donorId: string;
  itemCategoryId: string;
  quantity: number;
  unit: string;
  status: "CHO_TIEP_NHAN" | "DANG_XU_LY" | "HOAN_THANH" | "HUY_BO";
  donor?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  itemCategory?: {
    id: string;
    name: string;
    groupName?: string | null;
    unit: string;
  } | null;
  requestLabel?: string | null;
  goodsNote?: string | null;
};

type AssignmentItemCategory = {
  id: string;
  name: string;
  groupName?: string | null;
  unit: string;
};

type MissionItemAssignment = {
  missionId: string;
  itemCategoryId: string;
  quantity: number;
  itemCategory?: AssignmentItemCategory;
};

type AssignmentMission = {
  id: string;
  name: string;
  missionType?: string | null;
  priority: string;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  itemAssignmentsInitialized?: boolean;
  itemAssignments: MissionItemAssignment[];
  transportations?: Array<{
    vehicleType: string;
    vehiclePlate: string;
    driverName: string;
    driverPhone: string;
    notes?: string | null;
  }>;
};

type AssignmentRequestItem = {
  rescueRequestId: string;
  itemCategoryId: string;
  quantity: number;
  itemCategory?: AssignmentItemCategory;
};

type AssignmentRequest = {
  id: string;
  code: string;
  name: string;
  content?: string | null;
  priority: string;
  status: string;
  submittedAt: string;
  requesterName?: string | null;
  requesterPhone?: string | null;
  location?: { id: string; name: string; description?: string | null };
  requestItems: AssignmentRequestItem[];
  missions: AssignmentMission[];
};

type AssignmentStock = {
  itemCategoryId: string;
  availableQuantity: number;
  inventoryItems: Array<{
    id: string;
    locationId: string;
    item: string;
    quantity: number;
    unit: string;
    location?: { id: string; name: string };
  }>;
};

type AssignmentDraftRow = {
  rowId: string;
  itemCategoryId: string;
  quantity: string;
  defaultQuantity?: number;
};

const REQUEST_STATUSES = ["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const MISSION_STATUSES = ["CHO_TIEP_NHAN", "DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];

const STATUS_LABELS: Record<SponsorshipItem["status"], string> = {
  CHO_TIEP_NHAN: "Chờ tiếp nhận",
  DANG_XU_LY: "Đang xử lý",
  HOAN_THANH: "Đã xác nhận",
  HUY_BO: "Hủy bỏ",
};

const STATUS_TONES: Record<SponsorshipItem["status"], string> = {
  CHO_TIEP_NHAN: "bg-amber-50 text-amber-700",
  DANG_XU_LY: "bg-blue-50 text-blue-700",
  HOAN_THANH: "bg-emerald-50 text-emerald-700",
  HUY_BO: "bg-rose-50 text-rose-700",
};

export default function AdminInventoryPage() {
  const { items, total, loading, error, refetch, createItem, updateItem, deleteItem } = useInventory();
  const { locations } = useLocations();
  const [tab, setTab] = useState<InventoryTab>("stock");
  const [locationId, setLocationId] = useState("");
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [query, setQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [editing, setEditing] = useState<Record<string, { item: string; quantity: string; unit: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sponsorships, setSponsorships] = useState<SponsorshipItem[]>([]);
  const [loadingSponsorships, setLoadingSponsorships] = useState(false);
  const [sponsorshipError, setSponsorshipError] = useState<string | null>(null);
  const [sponsorshipStatus, setSponsorshipStatus] = useState("ALL");
  const [sponsorshipQuery, setSponsorshipQuery] = useState("");
  const [importLocations, setImportLocations] = useState<Record<string, string>>({});
  const [updatingSponsorship, setUpdatingSponsorship] = useState<string | null>(null);
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  const [assignmentStock, setAssignmentStock] = useState<AssignmentStock[]>([]);
  const [itemCategories, setItemCategories] = useState<AssignmentItemCategory[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("ALL");
  const [assignmentView, setAssignmentView] = useState<AssignmentView>("requests");
  const [selectedAssignmentRequestId, setSelectedAssignmentRequestId] = useState("");
  const [selectedAssignmentMissionId, setSelectedAssignmentMissionId] = useState("");
  const [assignmentDraftRows, setAssignmentDraftRows] = useState<AssignmentDraftRow[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((stock) => {
      const text = `${stock.item} ${stock.unit} ${stock.location?.name ?? ""}`.toLowerCase();
      return (filterLocation === "ALL" || stock.locationId === filterLocation) && (!keyword || text.includes(keyword));
    });
  }, [items, query, filterLocation]);

  const totalQuantity = filtered.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
  const lowStock = filtered.filter((stock) => stock.quantity <= 10).length;
  const pendingSponsorships = sponsorships.filter((item) => item.status !== "HOAN_THANH" && item.status !== "HUY_BO").length;
  const openMissions = assignmentRequests.reduce((sum, item) => sum + item.missions.filter((mission) => mission.status !== "HOAN_THANH" && mission.status !== "HUY_BO").length, 0);

  async function fetchSponsorships() {
    setLoadingSponsorships(true);
    setSponsorshipError(null);
    try {
      const params = new URLSearchParams();
      if (sponsorshipStatus !== "ALL") params.set("status", sponsorshipStatus);
      const res = await apiClient.get<{ data: SponsorshipItem[]; total: number }>(`/admin/sponsorships${params.toString() ? `?${params.toString()}` : ""}`);
      setSponsorships(res.data);
    } catch (err) {
      setSponsorshipError(err instanceof Error ? err.message : "Không tải được danh sách tài trợ.");
    } finally {
      setLoadingSponsorships(false);
    }
  }

  async function fetchAssignments() {
    setLoadingAssignments(true);
    setAssignmentError(null);
    try {
      const params = new URLSearchParams();
      if (assignmentStatus !== "ALL") params.set("status", assignmentStatus);
      params.set("statusScope", assignmentView === "missions" ? "mission" : "request");
      if (assignmentQuery.trim()) params.set("q", assignmentQuery.trim());
      const [res, categoriesRes] = await Promise.all([
        apiClient.get<{ data: AssignmentRequest[]; total: number; stockByCategory: AssignmentStock[] }>(`/admin/inventory/mission-assignments${params.toString() ? `?${params.toString()}` : ""}`),
        apiClient.get<{ data: AssignmentItemCategory[]; total: number }>("/item-categories"),
      ]);
      setAssignmentRequests(res.data);
      setAssignmentStock(res.stockByCategory);
      setItemCategories(categoriesRes.data);
      if (res.data.length > 0 && !res.data.some((item) => item.id === selectedAssignmentRequestId)) {
        setSelectedAssignmentRequestId(res.data[0].id);
        setSelectedAssignmentMissionId(res.data[0].missions[0]?.id ?? "");
      }
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Không tải được danh sách nhiệm vụ cần phân bổ.");
    } finally {
      setLoadingAssignments(false);
    }
  }

  const filteredSponsorships = useMemo(() => {
    const keyword = sponsorshipQuery.trim().toLowerCase();
    return sponsorships.filter((item) => {
      const text = `${item.donor?.name ?? ""} ${item.donor?.phone ?? ""} ${item.itemCategory?.name ?? ""} ${item.requestLabel ?? ""}`.toLowerCase();
      return !keyword || text.includes(keyword);
    });
  }, [sponsorshipQuery, sponsorships]);

  useEffect(() => {
    if (tab === "sponsorship") void fetchSponsorships();
  }, [tab, sponsorshipStatus]);

  useEffect(() => {
    void fetchAssignments();
  }, [assignmentStatus, assignmentView]);

  const selectedAssignmentRequest = useMemo(
    () => assignmentRequests.find((item) => item.id === selectedAssignmentRequestId) ?? assignmentRequests[0] ?? null,
    [assignmentRequests, selectedAssignmentRequestId],
  );
  const selectedAssignmentMission = useMemo(
    () => selectedAssignmentRequest?.missions.find((item) => item.id === selectedAssignmentMissionId) ?? selectedAssignmentRequest?.missions[0] ?? null,
    [selectedAssignmentRequest, selectedAssignmentMissionId],
  );
  const assignmentStockMap = useMemo(() => new Map(assignmentStock.map((item) => [item.itemCategoryId, item])), [assignmentStock]);
  const selectedAssignmentByCategory = useMemo(
    () => new Map((selectedAssignmentMission?.itemAssignments ?? []).map((item) => [item.itemCategoryId, item.quantity])),
    [selectedAssignmentMission],
  );
  const assignmentHasOverLimit = useMemo(() => {
    if (!selectedAssignmentRequest || !selectedAssignmentMission) return false;
    return assignmentDraftRows.some((item) => {
      if (!item.itemCategoryId) return true;
      const assigned = selectedAssignmentByCategory.get(item.itemCategoryId) ?? 0;
      const available = assignmentStockMap.get(item.itemCategoryId)?.availableQuantity ?? 0;
      return Number(item.quantity || 0) > assigned + available;
    });
  }, [assignmentDraftRows, assignmentStockMap, selectedAssignmentByCategory, selectedAssignmentMission, selectedAssignmentRequest]);

  useEffect(() => {
    if (!selectedAssignmentRequest || !selectedAssignmentMission) {
      setAssignmentDraftRows([]);
      return;
    }
    if (selectedAssignmentMission.itemAssignmentsInitialized) {
      setAssignmentDraftRows(selectedAssignmentMission.itemAssignments.map((item) => ({
        rowId: `${item.itemCategoryId}:${item.missionId}`,
        itemCategoryId: item.itemCategoryId,
        quantity: String(item.quantity),
      })));
      return;
    }
    setAssignmentDraftRows(selectedAssignmentRequest.requestItems.map((item) => ({
      rowId: `${item.itemCategoryId}:default`,
      itemCategoryId: item.itemCategoryId,
      quantity: String(item.quantity),
      defaultQuantity: item.quantity,
    })));
  }, [selectedAssignmentRequest?.id, selectedAssignmentMission?.id, selectedAssignmentByCategory]);

  const filteredAssignmentRequests = useMemo(() => {
    const keyword = assignmentQuery.trim().toLowerCase();
    return assignmentRequests.filter((item) => {
      const needs = item.requestItems.map((requestItem) => requestItem.itemCategory?.name ?? requestItem.itemCategoryId).join(" ");
      const missions = item.missions.map((mission) => mission.name).join(" ");
      const haystack = `${rescueRequestSearchText(item as any)} ${needs} ${missions} ${item.location?.name ?? ""}`.toLowerCase();
      return !keyword || haystack.includes(keyword);
    });
  }, [assignmentQuery, assignmentRequests]);

  const filteredAssignmentMissions = useMemo(() => {
    const keyword = assignmentQuery.trim().toLowerCase();
    return assignmentRequests
      .flatMap((requestItem) => requestItem.missions.map((mission) => ({ request: requestItem, mission })))
      .filter(({ request: requestItem, mission }) => {
        const needs = requestItem.requestItems.map((item) => item.itemCategory?.name ?? item.itemCategoryId).join(" ");
        const assigned = mission.itemAssignments.map((item) => item.itemCategory?.name ?? item.itemCategoryId).join(" ");
        const transport = (mission.transportations ?? []).map((item) => `${item.vehicleType} ${item.vehiclePlate} ${item.driverName}`).join(" ");
        const haystack = `${mission.name} ${mission.missionType ?? ""} ${transport} ${assigned} ${needs} ${rescueRequestSearchText(requestItem as any)} ${requestItem.location?.name ?? ""}`.toLowerCase();
        return !keyword || haystack.includes(keyword);
      });
  }, [assignmentQuery, assignmentRequests]);

  async function handleCreate() {
    if (!validateCreateItem()) return;
    setSubmitting(true);
    try {
      await createItem({ locationId, item, quantity: Number(quantity), unit });
      setItem("");
      setQuantity("");
      setUnit("");
      setCreateError(null);
    } finally {
      setSubmitting(false);
    }
  }

  function validateCreateItem() {
    if (!locationId) {
      setCreateError("Kho/địa điểm bắt buộc chọn.");
      return false;
    }
    if (!item.trim()) {
      setCreateError("Tên mặt hàng bắt buộc nhập.");
      return false;
    }
    if (!quantity.trim() || Number(quantity) <= 0) {
      setCreateError("Số lượng phải lớn hơn 0.");
      return false;
    }
    if (!unit.trim()) {
      setCreateError("Đơn vị bắt buộc nhập.");
      return false;
    }
    setCreateError(null);
    return true;
  }

  async function handleSave(id: string) {
    const draft = editing[id];
    if (!draft) return;
    await updateItem(id, { item: draft.item, quantity: Number(draft.quantity), unit: draft.unit });
    setEditing((state) => {
      const next = { ...state };
      delete next[id];
      return next;
    });
  }

  async function updateSponsorshipStatus(item: SponsorshipItem, status: SponsorshipItem["status"]) {
    if (status === "HOAN_THANH" && !importLocations[item.id]) {
      setSponsorshipError("Vui lòng chọn kho/địa điểm trước khi xác nhận nhập kho.");
      return;
    }
    setUpdatingSponsorship(item.id);
    setSponsorshipError(null);
    try {
      await apiClient.patch(`/admin/sponsorships/${item.donorId}/${item.itemCategoryId}`, {
        status,
        locationId: status === "HOAN_THANH" ? importLocations[item.id] : undefined,
      });
      await Promise.all([fetchSponsorships(), refetch()]);
    } catch (err) {
      setSponsorshipError(err instanceof Error ? err.message : "Không cập nhật được trạng thái tài trợ.");
    } finally {
      setUpdatingSponsorship(null);
    }
  }

  async function handleSaveAssignment() {
    if (!selectedAssignmentMission || !selectedAssignmentRequest) return;
    setSavingAssignment(true);
    setAssignmentError(null);
    try {
      await apiClient.patch(`/admin/missions/${selectedAssignmentMission.id}/item-assignments`, {
        items: assignmentDraftRows.filter((item) => item.itemCategoryId).map((item) => ({
          itemCategoryId: item.itemCategoryId,
          quantity: Number(item.quantity || 0),
        })),
      });
      await Promise.all([fetchAssignments(), refetch()]);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Không lưu được phân bổ hàng cho nhiệm vụ.");
    } finally {
      setSavingAssignment(false);
    }
  }

  function formatDeadline(value?: string | null) {
    if (!value) return "Chưa có hạn";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function addAssignmentRow() {
    const used = new Set(assignmentDraftRows.map((item) => item.itemCategoryId).filter(Boolean));
    const firstAvailable = itemCategories.find((item) => !used.has(item.id)) ?? itemCategories[0];
    setAssignmentDraftRows([
      ...assignmentDraftRows,
      {
        rowId: `new:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        itemCategoryId: firstAvailable?.id ?? "",
        quantity: "0",
      },
    ]);
  }

  function updateAssignmentRow(rowId: string, patch: Partial<AssignmentDraftRow>) {
    setAssignmentDraftRows((rows) => rows.map((row) => row.rowId === rowId ? { ...row, ...patch } : row));
  }

  function deleteAssignmentRow(rowId: string) {
    setAssignmentDraftRows((rows) => rows.filter((row) => row.rowId !== rowId));
  }
  const assignmentStatusOptions = assignmentView === "missions" ? MISSION_STATUSES : REQUEST_STATUSES;

  const assignmentPanel = (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 h-5 w-5 text-blue-800" />
          <div>
            <h2 className="font-black text-slate-950">Phân bổ hàng hóa cho nhiệm vụ</h2>
            <p className="mt-0.5 text-xs text-slate-500">Chọn yêu cầu hoặc nhiệm vụ, sau đó gán danh mục hàng và số lượng xuất kho.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[220px_minmax(260px,1fr)_auto] lg:min-w-[680px]">
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={assignmentStatus} onChange={(event) => setAssignmentStatus(event.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            {assignmentStatusOptions.map((item) => <option key={item} value={item}>{assignmentView === "missions" ? missionStatusLabel(item) : requestStatusLabel(item)}</option>)}
          </select>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tìm yêu cầu, nhiệm vụ, hàng hóa..." value={assignmentQuery} onChange={(event) => setAssignmentQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void fetchAssignments(); }} />
          <button type="button" onClick={fetchAssignments} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50">Lọc</button>
        </div>
      </div>

      {loadingAssignments ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-3 text-sm font-semibold">Đang tải danh sách nhiệm vụ...</span>
        </div>
      ) : assignmentRequests.length === 0 ? (
        <div className="px-5 py-12 text-center font-semibold text-slate-500">Chưa có nhiệm vụ nào cần phân bổ hàng hóa.</div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{assignmentView === "requests" ? "Yêu cầu cứu trợ" : "Danh sách nhiệm vụ"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{assignmentView === "requests" ? `${filteredAssignmentRequests.length}/${assignmentRequests.length} yêu cầu có nhiệm vụ` : `${filteredAssignmentMissions.length} nhiệm vụ phù hợp`}</p>
                </div>
                <div className="inline-flex rounded-xl bg-white p-1">
                  <button type="button" onClick={() => { setAssignmentView("requests"); setAssignmentStatus("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${assignmentView === "requests" ? "bg-blue-800 text-white shadow-sm" : "text-slate-500"}`}>Theo yêu cầu</button>
                  <button type="button" onClick={() => { setAssignmentView("missions"); setAssignmentStatus("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${assignmentView === "missions" ? "bg-blue-800 text-white shadow-sm" : "text-slate-500"}`}>Theo nhiệm vụ</button>
                </div>
              </div>

              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {assignmentView === "requests" && (filteredAssignmentRequests.length === 0 ? (
                  <p className="rounded-lg bg-white p-3 text-sm text-slate-500">Không có yêu cầu phù hợp bộ lọc.</p>
                ) : filteredAssignmentRequests.map((item) => {
                  const active = selectedAssignmentRequest?.id === item.id;
                  const assignedCount = item.missions.reduce((sum, mission) => sum + mission.itemAssignments.length, 0);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentRequestId(item.id);
                        setSelectedAssignmentMissionId(item.missions[0]?.id ?? "");
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-blue-700 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{rescueRequestDisplayName(item as any)}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.requestItems.map((need) => `${need.itemCategory?.name ?? need.itemCategoryId}: ${need.quantity} ${need.itemCategory?.unit ?? ""}`).join(", ") || "Chưa có nhu cầu hàng hóa"}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-800">{requestStatusLabel(item.status)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item.missions.length} nhiệm vụ</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item.requestItems.length} danh mục mặc định</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{assignedCount} dòng đã gán</span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{priorityLabel(item.priority)}</span>
                      </div>
                    </button>
                  );
                }))}

                {assignmentView === "missions" && (filteredAssignmentMissions.length === 0 ? (
                  <p className="rounded-lg bg-white p-3 text-sm text-slate-500">Không có nhiệm vụ phù hợp bộ lọc.</p>
                ) : filteredAssignmentMissions.map(({ request: requestItem, mission }) => {
                  const active = selectedAssignmentMission?.id === mission.id;
                  const assignedTotal = mission.itemAssignments.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentRequestId(requestItem.id);
                        setSelectedAssignmentMissionId(mission.id);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-blue-700 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{mission.name}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{rescueRequestDisplayName(requestItem as any)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-800">{missionStatusLabel(mission.status)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{priorityLabel(mission.priority)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"><CalendarClock className="h-3 w-3" />{formatDeadline(mission.startedAt)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{assignedTotal > 0 ? `${assignedTotal} đơn vị đã gán` : "Chưa gán hàng"}</span>
                      </div>
                    </button>
                  );
                }))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Nhiệm vụ của yêu cầu đang chọn</p>
                  <p className="mt-0.5 text-xs text-slate-500">Chọn nhiệm vụ để xem và chỉnh phân bổ hàng.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{selectedAssignmentRequest?.missions.length ?? 0}</span>
              </div>
              {!selectedAssignmentRequest || selectedAssignmentRequest.missions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Yêu cầu này chưa có nhiệm vụ.</p>
              ) : (
                <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  {selectedAssignmentRequest.missions.map((mission) => {
                    const active = selectedAssignmentMission?.id === mission.id;
                    const assignedTotal = mission.itemAssignments.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() => setSelectedAssignmentMissionId(mission.id)}
                        className={`rounded-xl border p-3 text-left transition ${active ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-950">{mission.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{mission.missionType || "Chưa phân loại"}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-blue-800">{missionStatusLabel(mission.status)}</span>
                        </div>
                        <div className="mt-3 grid gap-1.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{formatDeadline(mission.startedAt)}</span>
                          <span>{assignedTotal > 0 ? `Đã gán ${assignedTotal} đơn vị hàng` : "Chưa gán hàng"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black text-slate-950">{selectedAssignmentMission?.name ?? "Chưa chọn nhiệm vụ"}</p>
                <p className="mt-0.5 text-xs text-slate-500">Lần đầu sẽ lấy nhu cầu của yêu cầu cứu trợ làm mặc định; sau đó có thể thêm, sửa, xóa theo nhiệm vụ.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addAssignmentRow}
                  disabled={!selectedAssignmentMission || itemCategories.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                >
                  <PackagePlus className="h-4 w-4" />
                  Thêm danh mục
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  disabled={!selectedAssignmentMission || savingAssignment || assignmentHasOverLimit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu phân bổ
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-white text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Danh mục hàng</th>
                    <th className="px-4 py-3">Nhu cầu</th>
                    <th className="px-4 py-3">Đã gán</th>
                    <th className="px-4 py-3">Tồn kho còn lại</th>
                    <th className="px-4 py-3">Số lượng phân bổ</th>
                    <th className="px-4 py-3">Nguồn kho</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!selectedAssignmentRequest || !selectedAssignmentMission ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Chọn yêu cầu và nhiệm vụ để phân bổ.</td></tr>
                  ) : assignmentDraftRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Chưa có danh mục hàng nào trong nhiệm vụ này.</td></tr>
                  ) : assignmentDraftRows.map((row) => {
                    const category = itemCategories.find((item) => item.id === row.itemCategoryId);
                    const stock = assignmentStockMap.get(row.itemCategoryId);
                    const assigned = selectedAssignmentByCategory.get(row.itemCategoryId) ?? 0;
                    const maxAssignable = assigned + (stock?.availableQuantity ?? 0);
                    const value = row.quantity;
                    const overLimit = Number(value || 0) > maxAssignable;
                    const usedByOtherRows = new Set(assignmentDraftRows.filter((item) => item.rowId !== row.rowId).map((item) => item.itemCategoryId));
                    return (
                      <tr key={row.rowId} className={overLimit ? "bg-rose-50/60" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3">
                          <select
                            className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950"
                            value={row.itemCategoryId}
                            onChange={(event) => updateAssignmentRow(row.rowId, { itemCategoryId: event.target.value })}
                          >
                            <option value="">Chọn danh mục</option>
                            {itemCategories.map((item) => (
                              <option key={item.id} value={item.id} disabled={usedByOtherRows.has(item.id)}>{item.name} ({item.unit})</option>
                            ))}
                          </select>
                          {category?.groupName && <div className="mt-1 text-xs text-slate-500">{category.groupName}</div>}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{row.defaultQuantity !== undefined ? `${row.defaultQuantity} ${category?.unit ?? ""}` : "Tùy chỉnh"}</td>
                        <td className="px-4 py-3 font-bold text-blue-800">{assigned} {category?.unit ?? ""}</td>
                        <td className="px-4 py-3">
                          <span className={(stock?.availableQuantity ?? 0) <= 0 ? "font-black text-rose-700" : "font-black text-emerald-700"}>{stock?.availableQuantity ?? 0}</span>
                          <span className="ml-1 text-slate-500">{category?.unit ?? ""}</span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className={`w-36 rounded-xl border px-3 py-2 text-sm font-bold ${overLimit ? "border-rose-300 text-rose-700" : "border-slate-200 text-slate-950"}`}
                            type="number"
                            min={0}
                            max={maxAssignable}
                            value={value}
                            onChange={(event) => {
                              const next = Math.min(maxAssignable, Math.max(0, Number(event.target.value || 0)));
                              updateAssignmentRow(row.rowId, { quantity: String(next) });
                            }}
                          />
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">Tối đa {maxAssignable} {category?.unit ?? ""}</div>
                        </td>
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500">
                          {(stock?.inventoryItems ?? []).length === 0
                            ? "Không có hàng trong kho"
                            : stock?.inventoryItems.slice(0, 3).map((item) => `${item.location?.name ?? item.locationId}: ${item.quantity}`).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => deleteAssignmentRow(row.rowId)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Xóa danh mục">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin - Quản lý Kho"
        subtitle="Theo dõi mặt hàng trong kho cứu trợ và cập nhật số lượng khi nhập/xuất."
        actions={[{ href: "/admin/needs", label: "Yêu cầu cứu trợ" }, { href: "/admin/fund", label: "Quỹ", variant: "secondary" }]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Mặt hàng" value={loading ? "..." : String(total)} />
        <Stat label="Tổng số lượng" value={loading ? "..." : String(totalQuantity)} />
        <Stat label="Sắp hết" value={loading ? "..." : String(lowStock)} />
        <Stat
          label={tab === "stock" ? "Nhiệm vụ mở" : "Tài trợ chờ xử lý"}
          value={tab === "stock" ? String(openMissions) : String(pendingSponsorships)}
        />
      </section>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
      {sponsorshipError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{sponsorshipError}</div>}
      {assignmentError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{assignmentError}</div>}

      {assignmentPanel}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setTab("stock")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "stock" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>Kho</button>
            <button type="button" onClick={() => setTab("sponsorship")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "sponsorship" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>Tài trợ</button>
          </div>
          {tab === "sponsorship" && (
            <div className="grid gap-2 md:grid-cols-[220px_280px]">
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={sponsorshipStatus} onChange={(event) => setSponsorshipStatus(event.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tìm nhà tài trợ, hàng hóa, yêu cầu..." value={sponsorshipQuery} onChange={(event) => setSponsorshipQuery(event.target.value)} />
            </div>
          )}
        </div>
      </section>

      {tab === "stock" ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <PackagePlus className="h-5 w-5 text-blue-800" />
              <h2 className="font-black text-slate-950">Thêm mặt hàng</h2>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-[1.2fr_1fr_160px_140px_auto]">
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationId} onChange={(event) => { setLocationId(event.target.value); if (createError) setCreateError(null); }} onBlur={validateCreateItem}>
                <option value="">Chọn kho/địa điểm</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tên mặt hàng" value={item} onChange={(event) => { setItem(event.target.value); if (createError) setCreateError(null); }} onBlur={validateCreateItem} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" placeholder="Số lượng" value={quantity} onChange={(event) => { setQuantity(event.target.value); if (createError) setCreateError(null); }} onBlur={validateCreateItem} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Đơn vị" value={unit} onChange={(event) => { setUnit(event.target.value); if (createError) setCreateError(null); }} onBlur={validateCreateItem} />
              <button type="button" disabled={submitting} onClick={handleCreate} className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                Thêm
              </button>
              {createError && <p className="text-xs font-bold text-rose-700 md:col-span-5">{createError}</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-2">
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tìm mặt hàng, đơn vị, địa điểm..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filterLocation} onChange={(event) => setFilterLocation(event.target.value)}>
                <option value="ALL">Tất cả địa điểm</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Mặt hàng</th>
                    <th className="px-5 py-3">Địa điểm</th>
                    <th className="px-5 py-3">Số lượng</th>
                    <th className="px-5 py-3">Đơn vị</th>
                    <th className="px-5 py-3">Cập nhật</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center font-semibold text-slate-500">Chưa có mặt hàng trong kho.</td></tr>
                  ) : filtered.map((stock) => {
                    const draft = editing[stock.id];
                    return (
                      <tr key={stock.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-950">
                          {draft ? <input className="w-full rounded-lg border border-slate-200 px-2 py-1" value={draft.item} onChange={(event) => setEditing({ ...editing, [stock.id]: { ...draft, item: event.target.value } })} /> : stock.item}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{stock.location?.name ?? stock.locationId}</td>
                        <td className="px-5 py-3">
                          {draft ? <input className="w-28 rounded-lg border border-slate-200 px-2 py-1" type="number" value={draft.quantity} onChange={(event) => setEditing({ ...editing, [stock.id]: { ...draft, quantity: event.target.value } })} /> : <span className={stock.quantity <= 10 ? "font-black text-rose-700" : "font-black text-slate-900"}>{stock.quantity}</span>}
                        </td>
                        <td className="px-5 py-3">
                          {draft ? <input className="w-24 rounded-lg border border-slate-200 px-2 py-1" value={draft.unit} onChange={(event) => setEditing({ ...editing, [stock.id]: { ...draft, unit: event.target.value } })} /> : stock.unit}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">{new Date(stock.updatedAt).toLocaleString("vi-VN")}</td>
                        <td className="px-5 py-3 text-right">
                          {draft ? (
                            <button type="button" onClick={() => handleSave(stock.id)} className="rounded-lg p-2 text-blue-800 hover:bg-blue-50" title="Lưu"><Save className="h-4 w-4" /></button>
                          ) : (
                            <button type="button" onClick={() => setEditing({ ...editing, [stock.id]: { item: stock.item, quantity: String(stock.quantity), unit: stock.unit } })} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50">Sửa</button>
                          )}
                          <button type="button" onClick={() => { if (window.confirm("Xóa mặt hàng này?")) deleteItem(stock.id); }} className="ml-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Xóa">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <HandHeart className="h-5 w-5 text-blue-800" />
            <h2 className="font-black text-slate-950">Yêu cầu tài trợ hàng hóa</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Nhà tài trợ</th>
                  <th className="px-5 py-3">Yêu cầu cứu trợ</th>
                  <th className="px-5 py-3">Hàng hóa</th>
                  <th className="px-5 py-3">Số lượng</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Kho nhập</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSponsorships ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                ) : filteredSponsorships.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center font-semibold text-slate-500">Chưa có yêu cầu tài trợ phù hợp.</td></tr>
                ) : filteredSponsorships.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{item.donor?.name ?? "Nhà tài trợ"}</div>
                      <div className="mt-1 text-xs text-slate-500">{[item.donor?.phone, item.donor?.email, item.donor?.address].filter(Boolean).join(" - ") || "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.requestLabel ?? "Không chỉ định"}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-950">{item.itemCategory?.name ?? item.itemCategoryId}</div>
                      {item.itemCategory?.groupName && <div className="mt-1 text-xs text-slate-500">{item.itemCategory.groupName}</div>}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">{item.quantity} {item.unit}</td>
                    <td className="px-5 py-4">
                      <select
                        className={`rounded-lg px-2 py-1 text-xs font-black ${STATUS_TONES[item.status]}`}
                        value={item.status}
                        onChange={(event) => updateSponsorshipStatus(item, event.target.value as SponsorshipItem["status"])}
                        disabled={updatingSponsorship === item.id}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={importLocations[item.id] ?? ""}
                        onChange={(event) => setImportLocations({ ...importLocations, [item.id]: event.target.value })}
                        disabled={item.status === "HOAN_THANH"}
                      >
                        <option value="">Chọn kho/địa điểm</option>
                        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/email?type=sponsorship&donorId=${item.donorId}&itemCategoryId=${item.itemCategoryId}`}
                        className={`mr-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${item.donor?.email ? "border-blue-100 text-blue-800 hover:bg-blue-50" : "pointer-events-none border-slate-100 text-slate-300"}`}
                        title={item.donor?.email ? "Gửi email nhà tài trợ" : "Nhà tài trợ chưa có email"}
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Link>
                      <button
                        type="button"
                        onClick={() => updateSponsorshipStatus(item, "HOAN_THANH")}
                        disabled={item.status === "HOAN_THANH" || !importLocations[item.id] || updatingSponsorship === item.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        {updatingSponsorship === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Xác nhận nhập kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <Boxes className="h-4 w-4 text-blue-800" />
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}
