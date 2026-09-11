const DESCRIPTION_BREAK_LABELS = [
  "- Hàng hóa:",
  "- Cứu hộ:",
  "- Cứu nạn:",
  "- Y tế:",
  "- Nước sạch:",
  "- Thực phẩm:",
  "- Nhu yếu phẩm:",
  "- Khác:",
  "Hàng hóa:",
  "Loại cứu trợ:",
  "Địa chỉ:",
  "Tọa độ lưu:",
  "Cán bộ địa phương:",
  "Chức vụ:",
  "Email:",
  "Số điện thoại:",
  "SĐT:",
  "Nhu cầu:",
  "Ghi chú:",
  "Vị trí:",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatDescription(value?: string | null) {
  if (!value) return "";
  let text = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  text = text.replace(/\s+(-\s*[^:\n]{1,40}:)/g, "\n$1");
  for (const label of DESCRIPTION_BREAK_LABELS) {
    text = text.replace(new RegExp(`\\s+(${escapeRegExp(label)})`, "g"), "\n$1");
  }
  return text.replace(/\n{3,}/g, "\n\n");
}
