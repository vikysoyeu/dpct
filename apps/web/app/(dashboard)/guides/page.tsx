import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, HeartPulse, MapPinned, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { guideRoles } from "@/lib/guides-content";

const roleIcons = {
  victim: HeartPulse,
  volunteer: Users,
  coordinator: ClipboardCheck,
};

const operatingFlow = [
  {
    title: "Tiếp nhận",
    description: "Ghi nhận người liên hệ, vị trí, số người, nhu cầu và dấu hiệu nguy hiểm trực tiếp.",
  },
  {
    title: "Xác minh",
    description: "Đối chiếu ảnh, tọa độ, nguồn địa phương và cập nhật mới nhất từ tình nguyện viên.",
  },
  {
    title: "Điều phối",
    description: "Ghép yêu cầu với đội, phương tiện, hàng hóa và tuyến di chuyển an toàn.",
  },
  {
    title: "Theo dõi",
    description: "Cập nhật trạng thái, nhu cầu còn thiếu, rủi ro mới và kết quả bàn giao.",
  },
];

const quickChecks = [
  "Luôn ưu tiên tính mạng, y tế khẩn cấp và nhóm dễ tổn thương.",
  "Không đưa người hoặc đội vào vùng nguy hiểm khi thiếu bảo hộ, liên lạc hoặc phương án rút lui.",
  "Mọi báo cáo cần có thời gian, vị trí, nguồn thông tin và nhu cầu cụ thể.",
  "Khi tình hình thay đổi, cập nhật yêu cầu thay vì tạo nhiều bản ghi rời rạc.",
];

export default function GuidesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hướng dẫn an toàn"
        subtitle="Tài liệu thao tác nhanh cho người cần cứu trợ, tình nguyện viên và cán bộ điều phối trong quá trình ứng phó thiên tai."
        actions={[
          { href: "/rescue-request", label: "Gửi yêu cầu" },
          { href: "/map", label: "Xem bản đồ", variant: "secondary" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-surface-card p-6 shadow-ambient">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-danger/10 p-3 text-danger">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-label text-xs font-black uppercase tracking-[0.1em] text-danger">Nguyên tắc chung</p>
              <h2 className="mt-1 text-2xl font-black text-text-main">An toàn trước, dữ liệu rõ, điều phối theo ưu tiên</h2>
              <p className="mt-2 text-sm leading-6 text-text-subtle">
                Trang này tóm tắt các bước cần làm ngay trong ca cứu trợ. Nội dung tập trung vào thông tin có thể hành động tại hiện trường và đọc trực tiếp trong hệ thống.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-card p-6 shadow-ambient">
          <p className="font-label text-xs font-black uppercase tracking-[0.1em] text-primary">Kiểm tra nhanh</p>
          <ul className="mt-4 space-y-3">
            {quickChecks.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-text-main">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ui-grid-cards grid gap-4 md:grid-cols-3">
        {guideRoles.map((guide) => {
          const Icon = roleIcons[guide.role];
          return (
            <article key={guide.role} className="ui-card rounded-2xl bg-surface-card p-6 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-surface-low px-3 py-1 text-xs font-black text-text-subtle">{guide.label}</span>
              </div>

              <h2 className="mt-5 text-xl font-black leading-7 text-text-main">{guide.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-subtle">{guide.summary}</p>

              <ul className="mt-4 space-y-2">
                {guide.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2 text-sm font-semibold text-text-main">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {highlight}
                  </li>
                ))}
              </ul>

              <Link href={guide.href} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-primary">
                Xem hướng dẫn chi tiết
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ambient">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label text-xs font-black uppercase tracking-[0.1em] text-primary">Vòng điều phối</p>
            <h2 className="mt-1 text-2xl font-black text-text-main">Quy trình thống nhất cho mọi yêu cầu</h2>
          </div>
          <Link href="/rescue-requests" className="inline-flex items-center gap-2 text-sm font-black text-primary">
            Theo dõi yêu cầu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {operatingFlow.map((step, index) => (
            <article key={step.title} className="rounded-xl bg-surface-low p-4">
              <p className="text-2xl font-black text-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 font-black text-text-main">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-subtle">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/map" className="rounded-2xl bg-primary p-6 text-white shadow-ambient">
          <MapPinned className="h-7 w-7" />
          <h2 className="mt-4 text-xl font-black">Xem tình hình trên bản đồ</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">Kiểm tra điểm cứu trợ, khu vực rủi ro và thông tin hiện trường trước khi ra quyết định.</p>
        </Link>
        <Link href="/rescue-request" className="rounded-2xl bg-surface-card p-6 shadow-ambient">
          <HeartPulse className="h-7 w-7 text-danger" />
          <h2 className="mt-4 text-xl font-black text-text-main">Tạo yêu cầu cứu trợ</h2>
          <p className="mt-2 text-sm leading-6 text-text-subtle">Gửi thông tin vị trí, người liên hệ, nhu cầu và mức độ khẩn cấp để đội điều phối tiếp nhận.</p>
        </Link>
      </section>
    </div>
  );
}
