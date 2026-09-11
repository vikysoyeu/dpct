"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, FileDown, Loader2, Mail, Package, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAdminRescueRequests, missionStatusLabel, requestStatusLabel, priorityLabel, type AdminMission, type AdminRescueRequest } from "@/hooks/useAdminRescue";
import { useLocations } from "@/hooks/useLocations";
import { apiClient } from "@/lib/api";
import { rescueRequestDisplayName, rescueRequestSearchText } from "@/lib/rescue-request";
import { formatDescription } from "@/lib/text-format";
import { isValidEmail, isValidPhone } from "@/lib/validation";

type ListView = "requests" | "missions";
type MissionReportRow = { id: string; label: string; value: string };
type RequestInfoForm = { locationId: string; requesterName: string; requesterPhone: string; requesterEmail: string };

const REQUEST_STATUSES = ["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const MISSION_STATUSES = ["CHO_TIEP_NHAN", "DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"];
const MISSION_CREATE_STATUSES = new Set(["DANG_THUC_HIEN"]);
const PRIORITIES = ["THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"];
const fieldClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
const VOLUNTEER_REPORT_LABEL = "TNV đăng ký yêu cầu";
const VOLUNTEER_REPORT_HEADERS = ["Họ tên", "SĐT", "Tuổi", "Giới tính", "Khu vực"];
const VOLUNTEER_REPORT_TABLE_HEADERS = ["STT", ...VOLUNTEER_REPORT_HEADERS];
const REQUEST_ITEMS_REPORT_LABEL = "Hàng hóa yêu cầu";
const ASSIGNED_ITEMS_REPORT_LABEL = "Hàng hóa phân bổ cho nhiệm vụ";
const ITEM_REPORT_HEADERS = ["STT", "Danh mục hàng", "Số lượng"];

const statusTone: Record<string, string> = {
  CHO_TIEP_NHAN: "bg-amber-50 text-amber-700",
  DANG_TUYEN: "bg-blue-50 text-blue-700",
  DA_DU_DOI: "bg-indigo-50 text-indigo-700",
  DA_DU_HANG: "bg-cyan-50 text-cyan-700",
  SAN_SANG: "bg-emerald-50 text-emerald-700",
  DANG_THUC_HIEN: "bg-violet-50 text-violet-700",
  HOAN_THANH: "bg-emerald-50 text-emerald-700",
  HUY_BO: "bg-rose-50 text-rose-700",
};

const emptyMission = {
  name: "",
  missionType: "",
  priority: "TRUNG_BINH",
  status: "DANG_TUYEN",
  startedAt: "",
  endedAt: "",
  transportations: [] as Array<{
    vehicleType: string;
    vehiclePlate: string;
    driverName: string;
    driverPhone: string;
    notes: string;
  }>,
};

const emptyRequestInfoForm: RequestInfoForm = {
  locationId: "",
  requesterName: "",
  requesterPhone: "",
  requesterEmail: "",
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function missionToForm(mission: AdminMission) {
  return {
    name: mission.name,
    missionType: mission.missionType ?? "",
    priority: mission.priority,
    status: mission.status,
    startedAt: toDateTimeLocal(mission.startedAt),
    endedAt: toDateTimeLocal(mission.endedAt),
    transportations: (mission.transportations ?? []).map((t) => ({
      vehicleType: t.vehicleType,
      vehiclePlate: t.vehiclePlate,
      driverName: t.driverName,
      driverPhone: t.driverPhone,
      notes: t.notes ?? "",
    })),
  };
}

function requestItemSummary(request: AdminRescueRequest) {
  const items = request.requestItems ?? [];
  if (items.length === 0) return "";
  return items.map((item) => `${item.itemCategory?.name ?? item.itemCategoryId}: ${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()).join(", ");
}

function missionDeadlineRank(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN");
}

function textOrDash(value?: string | number | null) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function requestInfoFormFromRequest(request: AdminRescueRequest): RequestInfoForm {
  return {
    locationId: request.locationId,
    requesterName: request.requesterName ?? request.submittedBy?.name ?? "",
    requesterPhone: request.requesterPhone ?? request.submittedBy?.phone ?? "",
    requesterEmail: request.requesterEmail ?? request.submittedBy?.email ?? "",
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function reportSectionForLabel(label: string) {
  if (["Ngày xuất báo cáo", "Tên nhiệm vụ", "Mã nhiệm vụ", "Loại nhiệm vụ", "Mức ưu tiên", "Trạng thái nhiệm vụ", "Thời gian bắt đầu", "Thời gian kết thúc"].includes(label)) return "Thông tin nhiệm vụ";
  if (["Yêu cầu cứu trợ", "Mã yêu cầu", "Nội dung yêu cầu", "Trạng thái yêu cầu", "Người yêu cầu", "Chức danh người yêu cầu", "SĐT người yêu cầu", "Email người yêu cầu"].includes(label)) return "Thông tin yêu cầu cứu trợ";
  if (["Địa điểm", "Địa chỉ", "Tọa độ"].includes(label)) return "Địa điểm thực hiện";
  if (["Hàng hóa yêu cầu", "Hàng hóa phân bổ cho nhiệm vụ", "Phương tiện vận chuyển"].includes(label)) return "Nguồn lực và phương tiện";
  if (["Đội tình nguyện viên", "TNV đăng ký yêu cầu"].includes(label)) return "Nhân sự tham gia";
  return "Thông tin bổ sung";
}

const REPORT_SECTION_ORDER = [
  "Thông tin nhiệm vụ",
  "Thông tin yêu cầu cứu trợ",
  "Địa điểm thực hiện",
  "Nguồn lực và phương tiện",
  "Nhân sự tham gia",
  "Thông tin bổ sung",
];

function groupReportRows(rows: MissionReportRow[]) {
  return REPORT_SECTION_ORDER
    .map((section) => ({ section, rows: rows.filter((row) => reportSectionForLabel(row.label) === section) }))
    .filter((group) => group.rows.length > 0);
}

function formatReportValueHtml(value: string) {
  return escapeHtml(value || "-").replaceAll("\n", "<br />");
}

function serializeVolunteerReportRows(rows: string[][]) {
  return rows.map((row) => row.map((cell) => cell.replaceAll("\t", " ").replaceAll("\n", " ")).join("\t")).join("\n");
}

function parseVolunteerReportRows(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.includes("\t") ? line.split("\t") : line.split("|");
      return VOLUNTEER_REPORT_HEADERS.map((_, index) => cells[index]?.trim() || "-");
    });
}

function formatVolunteerReportTableHtml(value: string) {
  const rows = parseVolunteerReportRows(value);
  if (rows.length === 0) return formatReportValueHtml("-");
  return `
    <table class="volunteer-table">
      <colgroup>
        <col class="col-stt" />
        ${VOLUNTEER_REPORT_HEADERS.map(() => "<col />").join("")}
      </colgroup>
      <thead>
        <tr>${VOLUNTEER_REPORT_TABLE_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `<tr><td class="center">${index + 1}</td>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function serializeItemReportRows(rows: string[][]) {
  return rows.map((row) => row.map((cell) => cell.replaceAll("\t", " ").replaceAll("\n", " ")).join("\t")).join("\n");
}

function parseItemReportRows(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("\t")) {
        const [name, quantity] = line.split("\t");
        return [name?.trim() || "-", quantity?.trim() || "-"];
      }
      const [name, ...quantityParts] = line.split(":");
      return [name?.trim() || "-", quantityParts.join(":").trim() || "-"];
    });
}

function formatItemReportTableHtml(value: string) {
  const rows = parseItemReportRows(value);
  if (rows.length === 0) return "<p>Chưa có dữ liệu.</p>";
  return `
    <table class="report-table">
      <colgroup>
        <col class="col-stt" />
        <col class="col-item" />
        <col class="col-qty" />
      </colgroup>
      <thead>
        <tr>${ITEM_REPORT_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(row[0] ?? "-")}</td>
            <td>${escapeHtml(row[1] ?? "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function reportValue(rows: MissionReportRow[], label: string) {
  return rows.find((row) => row.label === label)?.value || "-";
}

function receiptParagraph(value: string) {
  return escapeHtml(value || "-").replaceAll("\n", "<br />");
}

function buildMissionReportHtml(mission: AdminMission, rows: MissionReportRow[], autoPrint: boolean) {
  const reportDate = reportValue(rows, "Ngày xuất báo cáo");
  const missionName = reportValue(rows, "Tên nhiệm vụ");
  const missionType = reportValue(rows, "Loại nhiệm vụ");
  const missionStatus = reportValue(rows, "Trạng thái nhiệm vụ");
  const priority = reportValue(rows, "Mức ưu tiên");
  const startedAt = reportValue(rows, "Thời gian bắt đầu");
  const endedAt = reportValue(rows, "Thời gian kết thúc");
  const requestName = reportValue(rows, "Yêu cầu cứu trợ");
  const requestCode = reportValue(rows, "Mã yêu cầu");
  const requestContent = reportValue(rows, "Nội dung yêu cầu");
  const locationName = reportValue(rows, "Địa điểm");
  const address = reportValue(rows, "Địa chỉ");
  const requester = reportValue(rows, "Người yêu cầu");
  const requesterPhone = reportValue(rows, "SĐT người yêu cầu");
  const transportation = reportValue(rows, "Phương tiện vận chuyển");
  const teams = reportValue(rows, "Đội tình nguyện viên");

  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo nhiệm vụ - ${escapeHtml(mission.name)}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { color: #111827; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.55; }
          .topline { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: center; }
          .topline p { margin: 0; }
          .bold { font-weight: 700; }
          .underline { border-bottom: 1px solid #111827; display: inline-block; min-width: 120px; }
          h1 { font-size: 21px; margin: 22px 0 4px; text-align: center; text-transform: uppercase; }
          .doc-code { margin: 0 0 22px; text-align: center; }
          h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; }
          p { margin: 6px 0; }
          .indent { text-indent: 22px; }
          .report-table, .volunteer-table { border-collapse: collapse; margin: 8px 0 12px; width: 100%; }
          .report-table { max-width: 72%; }
          .report-table th, .report-table td, .volunteer-table th, .volunteer-table td { border: 1px solid #6b7280; padding: 2px 5px; vertical-align: middle; }
          .report-table th, .volunteer-table th { background: #f3f4f6; font-weight: 700; text-align: center; }
          .report-table .col-stt { width: 42px; }
          .volunteer-table .col-stt { width: 42px; }
          .report-table .col-item { width: 58%; }
          .report-table .col-qty { width: 96px; }
          .center { text-align: center; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 34px; text-align: center; font-weight: 700; page-break-inside: avoid; }
          .signatures span { display: block; margin-top: 74px; font-weight: 400; }
        </style>
      </head>
      <body>
        <div class="topline">
          <div>
            <p class="bold">BAN ĐIỀU PHỐI CỨU TRỢ</p>
            <p>Số: ${escapeHtml(requestCode)} / ${escapeHtml(mission.id.slice(0, 8).toUpperCase())}</p>
          </div>
          <div>
            <p class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>
        <h1>Biên bản xác nhận hoàn tất nhiệm vụ cứu trợ</h1>
        <p class="doc-code">Lập ngày: ${escapeHtml(reportDate)}</p>

        <p class="indent">Hôm nay, Ban điều phối cứu trợ lập biên bản xác nhận kết quả thực hiện nhiệm vụ <strong>${escapeHtml(missionName)}</strong>, thuộc <strong>${escapeHtml(requestName)}</strong>.</p>

        <h2>I. Thông tin chung</h2>
        <p><strong>Nhiệm vụ:</strong> ${escapeHtml(missionName)}.</p>
        <p><strong>Loại nhiệm vụ:</strong> ${escapeHtml(missionType)}. <strong>Mức ưu tiên:</strong> ${escapeHtml(priority)}. <strong>Trạng thái:</strong> ${escapeHtml(missionStatus)}.</p>
        <p><strong>Thời gian thực hiện:</strong> từ ${escapeHtml(startedAt)} đến ${escapeHtml(endedAt)}.</p>
        <p><strong>Địa điểm:</strong> ${escapeHtml(locationName)} - ${escapeHtml(address)}.</p>
        <p><strong>Người/đơn vị yêu cầu:</strong> ${escapeHtml(requester)}; <strong>liên hệ:</strong> ${escapeHtml(requesterPhone)}.</p>

        <h2>II. Nội dung nhiệm vụ</h2>
        <p class="indent">${receiptParagraph(requestContent)}</p>

        <h2>III. Hàng hóa theo yêu cầu cứu trợ</h2>
        ${formatItemReportTableHtml(reportValue(rows, REQUEST_ITEMS_REPORT_LABEL))}

        <h2>IV. Hàng hóa/nguồn lực đã phân bổ cho nhiệm vụ</h2>
        ${formatItemReportTableHtml(reportValue(rows, ASSIGNED_ITEMS_REPORT_LABEL))}

        <h2>V. Phương tiện và nhân sự tham gia</h2>
        <p><strong>Phương tiện vận chuyển:</strong><br />${receiptParagraph(transportation)}</p>
        <p><strong>Đội tình nguyện viên tham gia nhiệm vụ:</strong><br />${receiptParagraph(teams)}</p>
        ${formatVolunteerReportTableHtml(reportValue(rows, VOLUNTEER_REPORT_LABEL))}

        <h2>VI. Xác nhận hoàn tất</h2>
        <p class="indent">Các bên xác nhận nhiệm vụ đã được ghi nhận theo thông tin nêu trên. Biên bản này được lập để lưu hồ sơ điều phối, phục vụ đối soát nguồn lực và báo cáo sau nhiệm vụ.</p>

        <div class="signatures">
          <div>Người lập biên bản<span>.................................</span></div>
          <div>Đại diện ban điều phối<span>.................................</span></div>
        </div>
        ${autoPrint ? `<script>window.addEventListener("load", () => { window.print(); });</script>` : ""}
      </body>
    </html>
  `;
}

function genderText(gender?: string | null) {
  const labels: Record<string, string> = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
    NAM: "Nam",
    NU: "Nữ",
    KHAC: "Khác",
  };
  return gender ? labels[gender] ?? gender : "-";
}

function ageFromDate(value?: string | null) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function buildMissionReportRows(request: AdminRescueRequest, mission: AdminMission): MissionReportRow[] {
  const locationParts = [request.location?.address, request.location?.ward, request.location?.province].filter(Boolean);
  const requestItems = (request.requestItems ?? []).map((item) => [item.itemCategory?.name ?? item.itemCategoryId, `${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()]);
  const assignedItems = (mission.itemAssignments ?? []).map((item) => [item.itemCategory?.name ?? item.itemCategoryId, `${item.quantity} ${item.itemCategory?.unit ?? ""}`.trim()]);
  const transportations = (mission.transportations ?? []).map((item, index) =>
    `${index + 1}. ${item.vehicleType || "Phương tiện"} - ${item.vehiclePlate || "chưa có biển số"}; tài xế: ${item.driverName || "-"}; SĐT: ${item.driverPhone || "-"}${item.notes ? `; ghi chú: ${item.notes}` : ""}`
  );
  const teams = (mission.rescueTeams ?? []).map((team, index) => `${index + 1}. ${team.name}${team.type ? ` - ${team.type}` : ""}`);
  const volunteers = request.volunteerRequests.map((item) => {
    const volunteer = item.volunteer;
    const area = volunteer.city || "-";
    const age = ageFromDate(volunteer.dateOfBirth);
    return [
      volunteer.name || "-",
      volunteer.phone || "-",
      age !== null ? String(age) : "-",
      genderText(volunteer.gender),
      area,
    ];
  });

  return [
    { id: crypto.randomUUID(), label: "Ngày xuất báo cáo", value: formatDateTime(new Date().toISOString()) },
    { id: crypto.randomUUID(), label: "Tên nhiệm vụ", value: mission.name },
    { id: crypto.randomUUID(), label: "Mã nhiệm vụ", value: mission.id },
    { id: crypto.randomUUID(), label: "Loại nhiệm vụ", value: textOrDash(mission.missionType) },
    { id: crypto.randomUUID(), label: "Mức ưu tiên", value: priorityLabel(mission.priority) },
    { id: crypto.randomUUID(), label: "Trạng thái nhiệm vụ", value: missionStatusLabel(mission.status) },
    { id: crypto.randomUUID(), label: "Thời gian bắt đầu", value: formatDateTime(mission.startedAt) },
    { id: crypto.randomUUID(), label: "Thời gian kết thúc", value: formatDateTime(mission.endedAt) },
    { id: crypto.randomUUID(), label: "Yêu cầu cứu trợ", value: rescueRequestDisplayName(request) },
    { id: crypto.randomUUID(), label: "Mã yêu cầu", value: request.code || request.id },
    { id: crypto.randomUUID(), label: "Nội dung yêu cầu", value: textOrDash(request.content) },
    { id: crypto.randomUUID(), label: "Trạng thái yêu cầu", value: requestStatusLabel(request.status) },
    { id: crypto.randomUUID(), label: "Địa điểm", value: request.location?.name ?? "-" },
    { id: crypto.randomUUID(), label: "Địa chỉ", value: locationParts.join(", ") || request.location?.description || "-" },
    { id: crypto.randomUUID(), label: "Tọa độ", value: `${request.location?.lat ?? "-"}, ${request.location?.lng ?? "-"}` },
    { id: crypto.randomUUID(), label: "Người yêu cầu", value: textOrDash(request.requesterName ?? request.submittedBy?.name) },
    { id: crypto.randomUUID(), label: "Chức danh người yêu cầu", value: textOrDash(request.requesterTitle) },
    { id: crypto.randomUUID(), label: "SĐT người yêu cầu", value: textOrDash(request.requesterPhone ?? request.submittedBy?.phone) },
    { id: crypto.randomUUID(), label: "Email người yêu cầu", value: textOrDash(request.requesterEmail ?? request.submittedBy?.email) },
    { id: crypto.randomUUID(), label: REQUEST_ITEMS_REPORT_LABEL, value: serializeItemReportRows(requestItems) },
    { id: crypto.randomUUID(), label: ASSIGNED_ITEMS_REPORT_LABEL, value: serializeItemReportRows(assignedItems) },
    { id: crypto.randomUUID(), label: "Phương tiện vận chuyển", value: transportations.join("\n") || "-" },
    { id: crypto.randomUUID(), label: "Đội tình nguyện viên", value: teams.join("\n") || "-" },
    { id: crypto.randomUUID(), label: VOLUNTEER_REPORT_LABEL, value: volunteers.length ? serializeVolunteerReportRows(volunteers) : "" },
  ];
}

export default function AdminNeedsPage() {
  const { requests, total, loading, error, createRequest, updateRequest, deleteRequest, createMission, updateMission, deleteMission } = useAdminRescueRequests();
  const { locations } = useLocations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [listView, setListView] = useState<ListView>("requests");
  const [showCreate, setShowCreate] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reportMission, setReportMission] = useState<AdminMission | null>(null);
  const [reportRows, setReportRows] = useState<MissionReportRow[]>([]);
  const [reportEmailStatus, setReportEmailStatus] = useState<string | null>(null);
  const [sendingReportEmail, setSendingReportEmail] = useState(false);
  const [editingRequestInfo, setEditingRequestInfo] = useState(false);
  const [requestInfoForm, setRequestInfoForm] = useState<RequestInfoForm>(emptyRequestInfoForm);

  const [form, setForm] = useState({ locationId: "", name: "", content: "", priority: "TRUNG_BINH", requesterName: "", requesterPhone: "", requesterEmail: "" });
  const [missionForm, setMissionForm] = useState(emptyMission);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return requests.filter((item) => {
      const haystack = `${rescueRequestSearchText(item)} ${item.content ?? ""} ${item.requesterName ?? ""} ${item.requesterPhone ?? ""} ${item.location?.name ?? ""} ${requestItemSummary(item)}`.toLowerCase();
      return (status === "ALL" || item.status === status) && (!keyword || haystack.includes(keyword));
    });
  }, [requests, query, status]);

  const filteredMissions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return requests
      .flatMap((request) => request.missions.map((mission) => ({ request, mission })))
      .filter(({ request, mission }) => {
        const transSearch = (mission.transportations ?? []).map((t) => `${t.vehicleType} ${t.vehiclePlate} ${t.driverName} ${t.driverPhone} ${t.notes ?? ""}`).join(" ");
        const haystack = `${mission.name} ${mission.missionType ?? ""} ${transSearch} ${rescueRequestSearchText(request)} ${request.location?.name ?? ""}`.toLowerCase();
        return (status === "ALL" || mission.status === status) && (!keyword || haystack.includes(keyword));
      })
      .sort((a, b) => missionDeadlineRank(a.mission.startedAt) - missionDeadlineRank(b.mission.startedAt));
  }, [requests, query, status]);

  const selected = filtered.find((item) => item.id === selectedId)
    ?? (listView === "missions" ? filteredMissions[0]?.request : filtered[0])
    ?? null;
  const selectedRequesterEmail = selected?.requesterEmail ?? selected?.submittedBy?.email ?? null;
  const canCreateMission = Boolean(selected && MISSION_CREATE_STATUSES.has(selected.status));
  const statusOptions = listView === "missions" ? MISSION_STATUSES : REQUEST_STATUSES;

  async function handleCreateRequest() {
    if (!validateRequestForm()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createRequest(form);
      setSelectedId(created.id);
      setForm({ locationId: "", name: "", content: "", priority: "TRUNG_BINH", requesterName: "", requesterPhone: "", requesterEmail: "" });
      setShowCreate(false);
    } finally {
      setSubmitting(false);
    }
  }

  function validateRequestForm() {
    if (!form.locationId) {
      setFormError("Địa điểm bắt buộc chọn.");
      return false;
    }
    if (!form.name.trim()) {
      setFormError("Tên yêu cầu bắt buộc nhập.");
      return false;
    }
    if (form.requesterPhone.trim() && !isValidPhone(form.requesterPhone)) {
      setFormError("Số điện thoại người yêu cầu không hợp lệ.");
      return false;
    }
    if (form.requesterEmail.trim() && !isValidEmail(form.requesterEmail)) {
      setFormError("Email người yêu cầu không hợp lệ.");
      return false;
    }
    setFormError(null);
    return true;
  }

  async function handleStatusChange(request: AdminRescueRequest, nextStatus: string) {
    await updateRequest(request.id, { status: nextStatus });
  }

  function openEditRequestInfo(request: AdminRescueRequest) {
    setRequestInfoForm(requestInfoFormFromRequest(request));
    setEditingRequestInfo(true);
    setFormError(null);
  }

  function cancelEditRequestInfo() {
    setEditingRequestInfo(false);
    setRequestInfoForm(emptyRequestInfoForm);
    setFormError(null);
  }

  function validateRequestInfoForm() {
    if (!requestInfoForm.locationId) {
      setFormError("Địa điểm bắt buộc chọn.");
      return false;
    }
    if (requestInfoForm.requesterPhone.trim() && !isValidPhone(requestInfoForm.requesterPhone)) {
      setFormError("Số điện thoại người yêu cầu không hợp lệ.");
      return false;
    }
    if (requestInfoForm.requesterEmail.trim() && !isValidEmail(requestInfoForm.requesterEmail)) {
      setFormError("Email người yêu cầu không hợp lệ.");
      return false;
    }
    setFormError(null);
    return true;
  }

  async function handleSaveRequestInfo() {
    if (!selected || !validateRequestInfoForm()) return;
    setSubmitting(true);
    try {
      await updateRequest(selected.id, requestInfoForm);
      setEditingRequestInfo(false);
      setRequestInfoForm(emptyRequestInfoForm);
      setFormError(null);
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateMissionForm() {
    setEditingMissionId(null);
    setMissionForm(emptyMission);
    setShowMissionForm((value) => !value);
  }

  function openEditMissionForm(mission: AdminMission) {
    setEditingMissionId(mission.id);
    setMissionForm(missionToForm(mission));
    setShowMissionForm(true);
  }

  async function handleSaveMission() {
    if (!selected) return;
    if (!validateMissionForm()) return;
    if (missionForm.transportations) {
      for (const trans of missionForm.transportations) {
        if (trans.driverPhone.trim() && !isValidPhone(trans.driverPhone)) {
          setFormError(`Số điện thoại tài xế "${trans.driverName || "chưa đặt tên"}" không hợp lệ.`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        ...missionForm,
        startedAt: fromDateTimeLocal(missionForm.startedAt),
        endedAt: fromDateTimeLocal(missionForm.endedAt),
      };
      if (editingMissionId) {
        await updateMission(editingMissionId, payload);
      } else {
        await createMission(selected.id, payload);
      }
      setMissionForm(emptyMission);
      setEditingMissionId(null);
      setShowMissionForm(false);
      setFormError(null);
    } finally {
      setSubmitting(false);
    }
  }

  function validateMissionForm() {
    if (!missionForm.name.trim()) {
      setFormError("Tên nhiệm vụ bắt buộc nhập.");
      return false;
    }
    setFormError(null);
    return true;
  }

  function openMissionReport(mission: AdminMission) {
    if (!selected) return;
    setReportMission(mission);
    setReportRows(buildMissionReportRows(selected, mission));
    setReportEmailStatus(null);
  }

  function updateReportRow(id: string, patch: Partial<MissionReportRow>) {
    setReportRows((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateReportValue(label: string, value: string) {
    setReportRows((rows) => rows.map((row) => row.label === label ? { ...row, value } : row));
  }

  function addReportRow() {
    setReportRows((rows) => [...rows, { id: crypto.randomUUID(), label: "Mục mới", value: "" }]);
  }

  function removeReportRow(id: string) {
    setReportRows((rows) => rows.filter((row) => row.id !== id));
  }

  function updateVolunteerReportCell(rowId: string, rowIndex: number, cellIndex: number, value: string) {
    setReportRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      const tableRows = parseVolunteerReportRows(row.value);
      if (!tableRows[rowIndex]) return row;
      tableRows[rowIndex] = tableRows[rowIndex].map((cell, index) => index === cellIndex ? value : cell);
      return { ...row, value: serializeVolunteerReportRows(tableRows) };
    }));
  }

  function updateItemReportCell(rowId: string, rowIndex: number, cellIndex: number, value: string) {
    setReportRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      const tableRows = parseItemReportRows(row.value);
      if (!tableRows[rowIndex]) return row;
      tableRows[rowIndex] = tableRows[rowIndex].map((cell, index) => index === cellIndex ? value : cell);
      return { ...row, value: serializeItemReportRows(tableRows) };
    }));
  }

  function exportMissionReportPdf() {
    if (!reportMission) return;
    const reportWindow = window.open("", "_blank", "width=960,height=720");
    if (!reportWindow) {
      window.alert("Trình duyệt đang chặn pop-up. Hãy cho phép pop-up để xuất PDF.");
      return;
    }
    reportWindow.document.write(buildMissionReportHtml(reportMission, reportRows, true));
    reportWindow.document.close();
  }

  async function sendMissionReportEmail() {
    if (!selected || !reportMission) return;
    const recipientEmail = selected.requesterEmail ?? selected.submittedBy?.email ?? "";
    if (!recipientEmail) {
      setReportEmailStatus("Yêu cầu này chưa có email cán bộ địa phương.");
      return;
    }
    setSendingReportEmail(true);
    setReportEmailStatus(null);
    try {
      const res = await apiClient.post<{ data: { sent: number; failed: number; skipped: number } }>("/admin/email/send-mission-report", {
        rescueRequestId: selected.id,
        missionId: reportMission.id,
        reportRows: reportRows.map(({ label, value }) => ({ label, value })),
        reportHtml: buildMissionReportHtml(reportMission, reportRows, false),
      });
      setReportEmailStatus(`Đã xử lý email: ${res.data.sent} gửi thành công, ${res.data.failed} lỗi, ${res.data.skipped} bỏ qua.`);
    } catch (err) {
      setReportEmailStatus(err instanceof Error ? err.message : "Không gửi được email báo cáo.");
    } finally {
      setSendingReportEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin - Quản lý Yêu cầu cứu trợ"
        subtitle="Tiếp nhận yêu cầu, tạo các nhiệm vụ cần thực hiện và theo dõi trạng thái xử lý."
        actions={[{ href: "/admin/resources", label: "Nguồn lực" }, { href: "/admin/inventory", label: "Kho", variant: "secondary" }]}
      />

      <section className="ui-grid-cards grid gap-4 md:grid-cols-4">
        {[
          { label: "Tổng yêu cầu", value: total, icon: ClipboardList, tone: "text-slate-900" },
          { label: "Chờ tiếp nhận", value: requests.filter((r) => r.status === "CHO_TIEP_NHAN").length, icon: AlertTriangle, tone: "text-amber-700" },
          { label: "Đang thực hiện", value: requests.filter((r) => r.status === "DANG_THUC_HIEN").length, icon: Users, tone: "text-violet-700" },
          { label: "Hoàn thành", value: requests.filter((r) => r.status === "HOAN_THANH").length, icon: CheckCircle2, tone: "text-emerald-700" },
        ].map((card) => (
          <article key={card.label} className="ui-card ui-card-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </div>
            <p className={`mt-4 text-3xl font-black ${card.tone}`}>{loading ? "..." : card.value}</p>
          </article>
        ))}
      </section>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(420px,0.95fr)_1.35fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h2 className="font-black text-slate-950">{listView === "requests" ? "Danh sách yêu cầu" : "Danh sách nhiệm vụ"}</h2>
              <p className="text-xs text-slate-500">{listView === "requests" ? `${filtered.length} yêu cầu theo bộ lọc` : `${filteredMissions.length} nhiệm vụ theo hạn lập đội`}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => { setListView("requests"); setStatus("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${listView === "requests" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>Yêu cầu</button>
                <button type="button" onClick={() => { setListView("missions"); setStatus("ALL"); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${listView === "missions" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>Nhiệm vụ</button>
              </div>
              <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-3 py-2 text-sm font-bold text-white">
                {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Thêm
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={listView === "requests" ? "Tìm tên, người cần cứu trợ, địa điểm..." : "Tìm nhiệm vụ, yêu cầu, người phụ trách..."} value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              {statusOptions.map((item) => <option key={item} value={item}>{listView === "missions" ? missionStatusLabel(item) : requestStatusLabel(item)}</option>)}
            </select>
          </div>

          {showCreate && (
            <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4">
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.locationId} onChange={(e) => { setForm({ ...form, locationId: e.target.value }); setFormError(null); }} onBlur={validateRequestForm}>
                <option value="">Chọn địa điểm</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tên yêu cầu" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(null); }} onBlur={validateRequestForm} />
              <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nội dung chi tiết" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-4">
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
                </select>
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Người yêu cầu" value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="SĐT" value={form.requesterPhone} onChange={(e) => { setForm({ ...form, requesterPhone: e.target.value }); setFormError(null); }} onBlur={validateRequestForm} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="email" placeholder="Email" value={form.requesterEmail} onChange={(e) => { setForm({ ...form, requesterEmail: e.target.value }); setFormError(null); }} onBlur={validateRequestForm} />
              </div>
              {formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{formError}</p>}
              <button type="button" disabled={submitting} onClick={handleCreateRequest} className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {submitting ? "Đang tạo..." : "Tạo yêu cầu"}
              </button>
            </div>
          )}

          <div className="max-h-[720px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải</div>
            ) : listView === "requests" && filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">Chưa có yêu cầu phù hợp.</p>
            ) : listView === "requests" ? filtered.map((item) => (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setShowMissionForm(false); cancelEditRequestInfo(); }} className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selected?.id === item.id ? "bg-blue-50/70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="break-words font-black text-slate-950">{rescueRequestDisplayName(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.location?.name} · {item.volunteerRequests.length} TNV đăng ký · {item.missions.length} nhiệm vụ</p>
                    {requestItemSummary(item) && <p className="mt-1 line-clamp-1 text-xs font-semibold text-blue-800">{requestItemSummary(item)}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${statusTone[item.status]}`}>{requestStatusLabel(item.status)}</span>
                </div>
              </button>
            )) : filteredMissions.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">Chưa có nhiệm vụ phù hợp.</p>
            ) : filteredMissions.map(({ request, mission }) => (
              <button key={mission.id} type="button" onClick={() => { setSelectedId(request.id); cancelEditRequestInfo(); openEditMissionForm(mission); }} className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${editingMissionId === mission.id ? "bg-blue-50/70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{mission.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{rescueRequestDisplayName(request)} · {request.location?.name ?? "Chưa rõ địa điểm"}</p>
                    <p className="mt-1 text-xs text-slate-500">Hạn lập đội: {toDateTimeLocal(mission.startedAt) || "Chưa có hạn"} · Đội TNV: {mission.rescueTeams.length}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${statusTone[mission.status] ?? "bg-slate-50 text-slate-700"}`}>{missionStatusLabel(mission.status)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {!selected ? (
            <p className="p-10 text-center text-sm text-slate-500">Chọn một yêu cầu để xem chi tiết.</p>
          ) : (
            <div className="space-y-5 p-5">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-800">{priorityLabel(selected.priority)}</p>
                  <h2 className="mt-1 break-words text-2xl font-black text-slate-950">{rescueRequestDisplayName(selected)}</h2>
                  <p className="formatted-description mt-2 text-sm leading-6 text-slate-600">{formatDescription(selected.content) || "Chưa có nội dung chi tiết."}</p>
                </div>
                <div className="flex min-w-0 flex-wrap justify-start gap-2 md:max-w-[360px] md:justify-end">
                  <Link
                    href={`/admin/email?type=rescue-request&id=${selected.id}`}
                    className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${selectedRequesterEmail ? "border-blue-100 text-blue-800 hover:bg-blue-50" : "pointer-events-none border-slate-100 text-slate-300"}`}
                    title={selectedRequesterEmail ? "Gửi email cán bộ gửi yêu cầu" : "Yêu cầu này chưa có email liên hệ"}
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">Email</span>
                  </Link>
                  <select value={selected.status} onChange={(e) => handleStatusChange(selected, e.target.value)} className={`rounded-xl border-0 px-3 py-2 text-sm font-black ${statusTone[selected.status]}`}>
                    {REQUEST_STATUSES.map((item) => <option key={item} value={item}>{requestStatusLabel(item)}</option>)}
                  </select>
                  <button type="button" onClick={() => { if (window.confirm("Xóa yêu cầu cứu trợ này?")) deleteRequest(selected.id); }} className="rounded-xl border border-rose-100 p-2 text-rose-700 hover:bg-rose-50" title="Xóa yêu cầu">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-black text-slate-950">Thông tin liên hệ</h3>
                  {editingRequestInfo ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelEditRequestInfo} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100" title="Hủy">
                        <X className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={handleSaveRequestInfo} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        {submitting ? "Đang lưu..." : "Lưu"}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openEditRequestInfo(selected)} className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-50">
                      <Pencil className="h-4 w-4" />
                      Sửa
                    </button>
                  )}
                </div>
                {editingRequestInfo ? (
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Địa điểm">
                      <select className={fieldClass} value={requestInfoForm.locationId} onChange={(e) => { setRequestInfoForm({ ...requestInfoForm, locationId: e.target.value }); setFormError(null); }} onBlur={validateRequestInfoForm}>
                        <option value="">Chọn địa điểm</option>
                        {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Người yêu cầu">
                      <input className={fieldClass} value={requestInfoForm.requesterName} onChange={(e) => setRequestInfoForm({ ...requestInfoForm, requesterName: e.target.value })} />
                    </Field>
                    <Field label="Liên hệ">
                      <input className={fieldClass} value={requestInfoForm.requesterPhone} onChange={(e) => { setRequestInfoForm({ ...requestInfoForm, requesterPhone: e.target.value }); setFormError(null); }} onBlur={validateRequestInfoForm} />
                    </Field>
                    <Field label="Email">
                      <input className={fieldClass} type="email" value={requestInfoForm.requesterEmail} onChange={(e) => { setRequestInfoForm({ ...requestInfoForm, requesterEmail: e.target.value }); setFormError(null); }} onBlur={validateRequestInfoForm} />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="Địa điểm" value={selected.location?.name ?? "-"} />
                    <Info label="Người yêu cầu" value={selected.requesterName ?? selected.submittedBy?.name ?? "-"} />
                    <Info label="Liên hệ" value={selected.requesterPhone ?? selected.submittedBy?.phone ?? "-"} />
                    <Info label="Email" value={selectedRequesterEmail ?? "-"} />
                  </div>
                )}
                {editingRequestInfo && formError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{formError}</p>}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 font-black text-slate-950">
                  <Package className="h-4 w-4 text-blue-800" />
                  Danh mục hàng cần hỗ trợ
                </h3>
                {(selected.requestItems ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Chưa có danh mục hàng chi tiết.</p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {selected.requestItems!.map((item) => (
                      <div key={`${item.rescueRequestId}-${item.itemCategoryId}`} className="rounded-lg bg-white p-3 text-sm">
                        <p className="font-bold text-slate-900">{item.itemCategory?.name ?? item.itemCategoryId}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.quantity} {item.itemCategory?.unit ?? ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-slate-950">TNV đã đăng ký</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-800">{selected.volunteerRequests.length}</span>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {selected.volunteerRequests.length === 0 ? <p className="text-sm text-slate-500">Chưa có TNV đăng ký.</p> : selected.volunteerRequests.map((registration) => (
                      <div key={registration.id} className="rounded-lg bg-white p-3 text-sm">
                        <p className="font-bold text-slate-900">{registration.volunteer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{registration.volunteer.phone} · {registration.volunteer.skills.join(", ") || "chưa có kỹ năng"}</p>
                        {registration.note && <p className="mt-1 text-xs text-slate-500">{registration.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-950">Nhiệm vụ của yêu cầu</h3>
                      <p className="text-xs text-slate-500">Đội TNV sẽ được lập ở trang Nguồn lực theo từng nhiệm vụ.</p>
                    </div>
                    <button type="button" onClick={openCreateMissionForm} disabled={!canCreateMission && !showMissionForm} title={canCreateMission ? "Thêm nhiệm vụ" : "Chỉ yêu cầu đang thực hiện mới được thêm nhiệm vụ"} className="inline-flex items-center gap-1 rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                      {showMissionForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Nhiệm vụ
                    </button>
                  </div>

                  {showMissionForm && (canCreateMission || editingMissionId) && (
                    <div className="mb-4 space-y-3 rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{editingMissionId ? "Chỉnh sửa nhiệm vụ" : "Tạo nhiệm vụ mới"}</p>
                        <button type="button" onClick={() => { setShowMissionForm(false); setEditingMissionId(null); setMissionForm(emptyMission); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Đóng form">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Field label="Tên nhiệm vụ *"><input className={fieldClass} placeholder="Ví dụ: Sơ tán người dân khu A" value={missionForm.name} onChange={(e) => { setMissionForm({ ...missionForm, name: e.target.value }); setFormError(null); }} onBlur={validateMissionForm} /></Field>
                        <Field label="Loại nhiệm vụ"><input className={fieldClass} placeholder="Cứu hộ, hậu cần, y tế..." value={missionForm.missionType} onChange={(e) => setMissionForm({ ...missionForm, missionType: e.target.value })} /></Field>
                        <Field label="Ưu tiên"><select className={fieldClass} value={missionForm.priority} onChange={(e) => setMissionForm({ ...missionForm, priority: e.target.value })}>{PRIORITIES.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}</select></Field>
                        <Field label="Trạng thái"><select className={fieldClass} value={missionForm.status} onChange={(e) => setMissionForm({ ...missionForm, status: e.target.value })}>{MISSION_STATUSES.map((item) => <option key={item} value={item}>{missionStatusLabel(item)}</option>)}</select></Field>
                        <Field label="Bắt đầu"><input className={fieldClass} type="datetime-local" value={missionForm.startedAt} onChange={(e) => setMissionForm({ ...missionForm, startedAt: e.target.value })} /></Field>
                        <Field label="Kết thúc"><input className={fieldClass} type="datetime-local" value={missionForm.endedAt} onChange={(e) => setMissionForm({ ...missionForm, endedAt: e.target.value })} /></Field>
                      </div>

                      {/* Transportation section */}
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black uppercase tracking-[0.1em] text-slate-700">Thông tin vận chuyển</h4>
                          <button
                            type="button"
                            onClick={() => setMissionForm({
                              ...missionForm,
                              transportations: [...(missionForm.transportations ?? []), { vehicleType: "", vehiclePlate: "", driverName: "", driverPhone: "", notes: "" }]
                            })}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm xe
                          </button>
                        </div>

                        {(missionForm.transportations ?? []).length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">Chưa có phương tiện vận chuyển nào được đăng ký.</p>
                        ) : (
                          <div className="space-y-3">
                            {(missionForm.transportations ?? []).map((trans, idx) => (
                              <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5 transition-all hover:border-slate-300">
                                <div className="absolute right-2 top-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextTrans = [...(missionForm.transportations ?? [])];
                                      nextTrans.splice(idx, 1);
                                      setMissionForm({ ...missionForm, transportations: nextTrans });
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                    title="Xóa phương tiện"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid gap-2 grid-cols-2 pr-6">
                                  <Field label="Loại phương tiện *">
                                    <input
                                      className={fieldClass}
                                      placeholder="Ví dụ: Xe tải, xuồng..."
                                      value={trans.vehicleType}
                                      onChange={(e) => {
                                        const nextTrans = [...(missionForm.transportations ?? [])];
                                        nextTrans[idx] = { ...nextTrans[idx], vehicleType: e.target.value };
                                        setMissionForm({ ...missionForm, transportations: nextTrans });
                                      }}
                                      required
                                    />
                                  </Field>
                                  <Field label="Biển số *">
                                    <input
                                      className={fieldClass}
                                      placeholder="Ví dụ: 51C-12345"
                                      value={trans.vehiclePlate}
                                      onChange={(e) => {
                                        const nextTrans = [...(missionForm.transportations ?? [])];
                                        nextTrans[idx] = { ...nextTrans[idx], vehiclePlate: e.target.value };
                                        setMissionForm({ ...missionForm, transportations: nextTrans });
                                      }}
                                      required
                                    />
                                  </Field>
                                  <Field label="Tên tài xế *">
                                    <input
                                      className={fieldClass}
                                      placeholder="Tên tài xế"
                                      value={trans.driverName}
                                      onChange={(e) => {
                                        const nextTrans = [...(missionForm.transportations ?? [])];
                                        nextTrans[idx] = { ...nextTrans[idx], driverName: e.target.value };
                                        setMissionForm({ ...missionForm, transportations: nextTrans });
                                      }}
                                      required
                                    />
                                  </Field>
                                  <Field label="SĐT tài xế *">
                                    <input
                                      className={fieldClass}
                                      placeholder="Số điện thoại"
                                      value={trans.driverPhone}
                                      onChange={(e) => {
                                        const nextTrans = [...(missionForm.transportations ?? [])];
                                        nextTrans[idx] = { ...nextTrans[idx], driverPhone: e.target.value };
                                        setMissionForm({ ...missionForm, transportations: nextTrans });
                                      }}
                                      required
                                    />
                                  </Field>
                                </div>
                                <Field label="Ghi chú">
                                  <input
                                    className={fieldClass}
                                    placeholder="Ghi chú vận chuyển"
                                    value={trans.notes}
                                    onChange={(e) => {
                                      const nextTrans = [...(missionForm.transportations ?? [])];
                                      nextTrans[idx] = { ...nextTrans[idx], notes: e.target.value };
                                      setMissionForm({ ...missionForm, transportations: nextTrans });
                                    }}
                                  />
                                </Field>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{formError}</p>}
                      <button type="button" disabled={submitting} onClick={handleSaveMission} className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                        {editingMissionId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {submitting ? "Đang lưu..." : editingMissionId ? "Cập nhật nhiệm vụ" : "Lưu nhiệm vụ"}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {selected.missions.length === 0 ? (
                      <p className="text-sm text-slate-500">Chưa có nhiệm vụ cho yêu cầu này.</p>
                    ) : selected.missions.map((mission) => (
                      <article key={mission.id} className="rounded-xl bg-white p-3 border border-slate-100 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-950">{mission.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{mission.missionType || "Chưa phân loại"} · {priorityLabel(mission.priority)} · {missionStatusLabel(mission.status)}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Thời gian: {[toDateTimeLocal(mission.startedAt), toDateTimeLocal(mission.endedAt)].filter(Boolean).join(" -> ") || "-"}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" onClick={() => openEditMissionForm(mission)} className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50" title="Sửa nhiệm vụ">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => openMissionReport(mission)} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50" title="Xuất báo cáo">
                              <FileDown className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => { if (window.confirm("Xóa nhiệm vụ này?")) deleteMission(mission.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Xóa nhiệm vụ">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Transportations list */}
                        {(mission.transportations ?? []).length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Vận chuyển ({mission.transportations.length}):</p>
                            <div className="space-y-1.5">
                              {mission.transportations.map((t) => (
                                <div key={t.id} className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span>🚗 {t.vehicleType} · {t.vehiclePlate}</span>
                                    <span className="text-blue-800">👤 {t.driverName} ({t.driverPhone})</span>
                                  </div>
                                  {t.notes && <p className="mt-1 text-[11px] text-slate-500 italic">Ghi chú: {t.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                          <span className="text-xs text-slate-500 font-semibold">Đội TNV: {mission.rescueTeams.length}</span>
                          <div className="flex gap-2">
                            <select value={mission.status} onChange={(event) => updateMission(mission.id, { status: event.target.value })} className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-black ${statusTone[mission.status] ?? "bg-slate-50 text-slate-700"}`}>
                              {MISSION_STATUSES.map((item) => <option key={item} value={item}>{missionStatusLabel(item)}</option>)}
                            </select>
                            <Link href={`/admin/email?type=mission-team&missionId=${mission.id}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 px-2.5 py-1.5 text-xs font-black text-blue-800 hover:bg-blue-50">
                              <Mail className="h-3.5 w-3.5" />
                              Email đội
                            </Link>
                            <button type="button" onClick={() => openMissionReport(mission)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 px-2.5 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-50">
                              <FileDown className="h-3.5 w-3.5" />
                              Xuất báo cáo
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {reportMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Preview báo cáo nhiệm vụ</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{reportMission.name}</h2>
              </div>
              <button type="button" onClick={() => setReportMission(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto bg-slate-100 p-5">
              <div className="mx-auto max-w-[820px] bg-white p-8 text-[13px] leading-6 text-slate-900 shadow-sm">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <p className="font-black uppercase">Ban điều phối cứu trợ</p>
                    <p>Số: {reportValue(reportRows, "Mã yêu cầu")} / {reportMission.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
                    <p>Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <h1 className="mt-8 text-center text-xl font-black uppercase text-slate-950">Biên bản xác nhận hoàn tất nhiệm vụ cứu trợ</h1>
                <p className="mt-1 text-center text-sm">Lập ngày: <InlineReportInput value={reportValue(reportRows, "Ngày xuất báo cáo")} onChange={(value) => updateReportValue("Ngày xuất báo cáo", value)} /></p>

                <p className="mt-6 indent-6">
                  Hôm nay, Ban điều phối cứu trợ lập biên bản xác nhận kết quả thực hiện nhiệm vụ <strong>{reportValue(reportRows, "Tên nhiệm vụ")}</strong>, thuộc <strong>{reportValue(reportRows, "Yêu cầu cứu trợ")}</strong>.
                </p>

                <ReportHeading> I. Thông tin chung</ReportHeading>
                <p><strong>Nhiệm vụ:</strong> <InlineReportInput value={reportValue(reportRows, "Tên nhiệm vụ")} onChange={(value) => updateReportValue("Tên nhiệm vụ", value)} />.</p>
                <p><strong>Loại nhiệm vụ:</strong> <InlineReportInput value={reportValue(reportRows, "Loại nhiệm vụ")} onChange={(value) => updateReportValue("Loại nhiệm vụ", value)} />. <strong>Mức ưu tiên:</strong> <InlineReportInput value={reportValue(reportRows, "Mức ưu tiên")} onChange={(value) => updateReportValue("Mức ưu tiên", value)} />. <strong>Trạng thái:</strong> <InlineReportInput value={reportValue(reportRows, "Trạng thái nhiệm vụ")} onChange={(value) => updateReportValue("Trạng thái nhiệm vụ", value)} />.</p>
                <p><strong>Thời gian thực hiện:</strong> từ <InlineReportInput value={reportValue(reportRows, "Thời gian bắt đầu")} onChange={(value) => updateReportValue("Thời gian bắt đầu", value)} /> đến <InlineReportInput value={reportValue(reportRows, "Thời gian kết thúc")} onChange={(value) => updateReportValue("Thời gian kết thúc", value)} />.</p>
                <p><strong>Địa điểm:</strong> <InlineReportInput value={reportValue(reportRows, "Địa điểm")} onChange={(value) => updateReportValue("Địa điểm", value)} /> - <InlineReportInput value={reportValue(reportRows, "Địa chỉ")} onChange={(value) => updateReportValue("Địa chỉ", value)} />.</p>
                <p><strong>Người/đơn vị yêu cầu:</strong> <InlineReportInput value={reportValue(reportRows, "Người yêu cầu")} onChange={(value) => updateReportValue("Người yêu cầu", value)} />; <strong>liên hệ:</strong> <InlineReportInput value={reportValue(reportRows, "SĐT người yêu cầu")} onChange={(value) => updateReportValue("SĐT người yêu cầu", value)} />.</p>

                <ReportHeading>II. Nội dung nhiệm vụ</ReportHeading>
                <ReportTextarea value={reportValue(reportRows, "Nội dung yêu cầu")} onChange={(value) => updateReportValue("Nội dung yêu cầu", value)} />

                <ReportHeading>III. Hàng hóa theo yêu cầu cứu trợ</ReportHeading>
                <ItemReportEditor row={reportRows.find((row) => row.label === REQUEST_ITEMS_REPORT_LABEL)} onCellChange={updateItemReportCell} />

                <ReportHeading>IV. Hàng hóa/nguồn lực đã phân bổ cho nhiệm vụ</ReportHeading>
                <ItemReportEditor row={reportRows.find((row) => row.label === ASSIGNED_ITEMS_REPORT_LABEL)} onCellChange={updateItemReportCell} />

                <ReportHeading>V. Phương tiện và nhân sự tham gia</ReportHeading>
                <p className="font-bold">Phương tiện vận chuyển:</p>
                <ReportTextarea value={reportValue(reportRows, "Phương tiện vận chuyển")} onChange={(value) => updateReportValue("Phương tiện vận chuyển", value)} />
                <p className="mt-3 font-bold">Đội tình nguyện viên tham gia nhiệm vụ:</p>
                <ReportTextarea value={reportValue(reportRows, "Đội tình nguyện viên")} onChange={(value) => updateReportValue("Đội tình nguyện viên", value)} />
                <VolunteerReportEditor row={reportRows.find((row) => row.label === VOLUNTEER_REPORT_LABEL)} onCellChange={updateVolunteerReportCell} />

                <ReportHeading>VI. Xác nhận hoàn tất</ReportHeading>
                <p className="indent-6">Các bên xác nhận nhiệm vụ đã được ghi nhận theo thông tin nêu trên. Biên bản này được lập để lưu hồ sơ điều phối, phục vụ đối soát nguồn lực và báo cáo sau nhiệm vụ.</p>

                {groupReportRows(reportRows).find((group) => group.section === "Thông tin bổ sung")?.rows.map((row) => (
                  <div key={row.id} className="mt-4">
                    <div className="flex items-center gap-2">
                      <InlineReportInput value={row.label} onChange={(value) => updateReportRow(row.id, { label: value })} />
                      <button type="button" onClick={() => removeReportRow(row.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Xóa dòng"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <ReportTextarea value={row.value} onChange={(value) => updateReportRow(row.id, { value })} />
                  </div>
                ))}

                <div className="mt-8 grid grid-cols-2 gap-12 text-center font-bold">
                  <div>Người lập biên bản<div className="mt-20 font-normal">.................................</div></div>
                  <div>Đại diện ban điều phối<div className="mt-20 font-normal">.................................</div></div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={addReportRow} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">
                    <Plus className="h-4 w-4" />
                    Thêm dòng ghi chú
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
              {reportEmailStatus && <p className="mr-auto rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{reportEmailStatus}</p>}
              <button type="button" onClick={() => setReportMission(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Đóng</button>
              <button
                type="button"
                onClick={sendMissionReportEmail}
                disabled={sendingReportEmail || !selectedRequesterEmail}
                title={selectedRequesterEmail ? `Gửi PDF tới ${selectedRequesterEmail}` : "Yêu cầu này chưa có email cán bộ địa phương"}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingReportEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Gửi Email
              </button>
              <button type="button" onClick={exportMissionReportPdf} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">
                <FileDown className="h-4 w-4" />
                Xuất file PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ReportHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-sm font-black uppercase text-slate-950">{children}</h3>;
}

function InlineReportInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      className="min-w-[120px] border-0 border-b border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:border-emerald-700"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ReportTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      className="mt-1 min-h-20 w-full resize-y border-0 border-b border-slate-200 bg-transparent px-1 py-1 leading-6 outline-none focus:border-emerald-700"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ItemReportEditor({ row, onCellChange }: { row?: MissionReportRow; onCellChange: (rowId: string, rowIndex: number, cellIndex: number, value: string) => void }) {
  if (!row) return <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu hàng hóa.</p>;
  const rows = parseItemReportRows(row.value);

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu hàng hóa.</p>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full max-w-[560px] border-collapse text-xs">
        <colgroup>
          <col className="w-12" />
          <col className="w-[58%]" />
          <col className="w-28" />
        </colgroup>
        <thead className="bg-slate-100 text-center">
          <tr>
            {ITEM_REPORT_HEADERS.map((header) => (
              <th key={header} className="border border-slate-400 px-1.5 py-1 font-bold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              <td className="border border-slate-400 px-1.5 py-1 text-center">{rowIndex + 1}</td>
              {cells.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="border border-slate-400 p-1">
                  <input
                    className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs leading-4 outline-none focus:bg-emerald-50"
                    value={cell}
                    onChange={(event) => onCellChange(row.id, rowIndex, cellIndex, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolunteerReportEditor({ row, onCellChange }: { row?: MissionReportRow; onCellChange: (rowId: string, rowIndex: number, cellIndex: number, value: string) => void }) {
  if (!row) return <p className="mt-2 text-sm text-slate-500">Chưa có tình nguyện viên đăng ký.</p>;
  const rows = parseVolunteerReportRows(row.value);

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Chưa có tình nguyện viên đăng ký.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <colgroup>
          <col className="w-12" />
          {VOLUNTEER_REPORT_HEADERS.map((header) => (
            <col key={header} />
          ))}
        </colgroup>
        <thead className="bg-slate-100 text-center uppercase tracking-[0.04em] text-slate-800">
          <tr>
            {VOLUNTEER_REPORT_TABLE_HEADERS.map((header) => (
              <th key={header} className="border border-slate-400 px-1.5 py-1 font-bold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              <td className="border border-slate-400 px-1.5 py-1 text-center">{rowIndex + 1}</td>
              {cells.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="border border-slate-400 align-top p-1">
                  <input
                    className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs leading-4 text-slate-800 outline-none focus:bg-emerald-50"
                    value={cell}
                    onChange={(event) => onCellChange(row.id, rowIndex, cellIndex, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
