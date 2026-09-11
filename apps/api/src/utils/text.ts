const RESCUE_NEED_LABELS = [
  "Hàng hóa",
  "Cứu hộ",
  "Cứu nạn",
  "Y tế",
  "Nước sạch",
  "Thực phẩm",
  "Nhu yếu phẩm",
  "Khác",
];

const rescueNeedLabelPattern = RESCUE_NEED_LABELS
  .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export function normalizeMultilineText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeRescueRequestContent(value?: string | null) {
  const normalized = normalizeMultilineText(value);
  if (!normalized) return "";

  return normalized
    .replace(new RegExp(`[ \\t]+(-\\s*(?:${rescueNeedLabelPattern})\\s*:)`, "gi"), "\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
