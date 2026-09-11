"use client";

import { AlertTriangle, ClipboardCheck, HeartPulse, MapPinned, Megaphone, ShieldCheck, Truck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

const sections = [
  {
    title: "Trước khi nhận nhiệm vụ",
    icon: ClipboardCheck,
    items: [
      "Cập nhật hồ sơ, kỹ năng, phương tiện, lịch rảnh và liên hệ khẩn cấp để điều phối viên chọn đúng nhiệm vụ.",
      "Đọc kỹ địa điểm, thời gian tập kết, người phụ trách và phạm vi công việc trước khi xác nhận tham gia.",
      "Chuẩn bị giấy tờ cá nhân, điện thoại đầy pin, pin dự phòng, nước uống, thuốc cá nhân và đồ bảo hộ phù hợp.",
    ],
  },
  {
    title: "An toàn hiện trường",
    icon: ShieldCheck,
    items: [
      "Luôn đi theo đội, không tự ý tách nhóm hoặc vào khu vực ngập sâu, sạt lở, điện rò, công trình hư hỏng.",
      "Ưu tiên cứu người và đảm bảo an toàn cá nhân trước khi vận chuyển hàng hóa hoặc tài sản.",
      "Báo ngay cho đội trưởng khi có dấu hiệu mất an toàn, kiệt sức, thiếu trang bị hoặc thay đổi thời tiết bất thường.",
    ],
  },
  {
    title: "Giao tiếp và điều phối",
    icon: Megaphone,
    items: [
      "Chỉ nhận chỉ đạo từ đội trưởng, điều phối viên hoặc lực lượng chức năng tại điểm cứu trợ.",
      "Ghi nhận thông tin bằng ngôn ngữ rõ ràng: ai cần hỗ trợ, cần gì, ở đâu, mức khẩn, số điện thoại liên hệ.",
      "Không đăng hình ảnh nạn nhân, trẻ em hoặc thông tin nhạy cảm khi chưa được phép.",
    ],
  },
  {
    title: "Vận chuyển và phân phát",
    icon: Truck,
    items: [
      "Kiểm đếm hàng trước khi nhận, ghi lại loại hàng, số lượng, điểm nhận và điểm giao.",
      "Ưu tiên nhu cầu thiết yếu: nước sạch, thực phẩm, thuốc, áo phao, đèn pin, đồ vệ sinh và vật tư y tế.",
      "Khi phát hàng, giữ hàng lối, tránh chen lấn và báo đội trưởng nếu nguồn lực không đủ cho danh sách ưu tiên.",
    ],
  },
  {
    title: "Sơ cứu cơ bản",
    icon: HeartPulse,
    items: [
      "Chỉ thực hiện sơ cứu trong phạm vi kỹ năng đã được huấn luyện; gọi y tế khi có chấn thương nặng.",
      "Giữ ấm người bị nạn, kiểm tra ý thức, nhịp thở, chảy máu và nguy cơ sốc.",
      "Không tự ý dùng thuốc cho người khác nếu không có chỉ định hoặc thông tin y tế rõ ràng.",
    ],
  },
  {
    title: "Sau nhiệm vụ",
    icon: Users,
    items: [
      "Báo cáo kết quả, sự cố, hàng tồn, nhu cầu phát sinh và danh sách điểm cần quay lại.",
      "Nghỉ ngơi, vệ sinh cá nhân, theo dõi sức khỏe sau khi tiếp xúc nước bẩn, bùn đất hoặc môi trường ô nhiễm.",
      "Cập nhật lại trạng thái sẵn sàng trong hồ sơ nếu cần nghỉ hoặc đã nhận nhiệm vụ mới.",
    ],
  },
];

const quickNotes = [
  "Không cam kết hỗ trợ vượt khả năng của đội.",
  "Không thu tiền, nhận tiền riêng hoặc phân phối ngoài kế hoạch điều phối.",
  "Không tranh luận tại hiện trường; ghi nhận vấn đề và báo đội trưởng.",
  "Không lái xe, xuồng hoặc thiết bị chuyên dụng nếu chưa đủ kỹ năng và điều kiện an toàn.",
];

export default function VolunteerHandbookPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cẩm nang/Hướng dẫn"
        subtitle="Các lưu ý vận hành, an toàn và ứng xử dành cho tình nguyện viên khi tham gia cứu trợ."
        actions={[
          { href: "/volunteer/requests", label: "Yêu cầu cứu trợ" },
          { href: "/volunteer/profile", label: "Cập nhật hồ sơ", variant: "secondary" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl bg-surface-card p-5 shadow-ambient">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <section.icon className="h-5 w-5" />
                </span>
                <h2 className="text-base font-black text-primary">{section.title}</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-subtle">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="font-black text-primary">Lưu ý bắt buộc</h2>
            </div>
            <div className="mt-4 space-y-3">
              {quickNotes.map((item) => (
                <p key={item} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-900">{item}</p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-primary" />
              <h2 className="font-black text-primary">Khi đến điểm tập kết</h2>
            </div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-text-subtle">
              <li>1. Báo danh với đội trưởng.</li>
              <li>2. Nhận vai trò và khu vực phụ trách.</li>
              <li>3. Kiểm tra trang bị an toàn.</li>
              <li>4. Thống nhất kênh liên lạc của đội.</li>
            </ol>
          </section>
        </aside>
      </section>
    </div>
  );
}
