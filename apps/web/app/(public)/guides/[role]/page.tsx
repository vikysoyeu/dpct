import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { getGuideRole, guideRoles } from "@/lib/guides-content";

type PublicGuidePageProps = {
  params: {
    role: string;
  };
};

export function generateStaticParams() {
  return guideRoles.map((guide) => ({ role: guide.role }));
}

export default function PublicGuidePage({ params }: PublicGuidePageProps) {
  const guide = getGuideRole(params.role);
  if (!guide) notFound();

  return (
    <main className="min-h-screen bg-surface px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/guides" className="inline-flex items-center gap-2 rounded-xl bg-surface-high px-4 py-2 text-sm font-bold text-text-main">
          <ArrowLeft className="h-4 w-4" />
          Quay lại hướng dẫn
        </Link>

        <section className="rounded-2xl bg-surface-card p-6 shadow-ambient md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-label text-xs font-black uppercase tracking-[0.1em] text-primary">{guide.label}</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-text-main md:text-4xl">{guide.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-text-subtle md:text-base">{guide.summary}</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-4 text-primary">
              <HeartPulse className="h-8 w-8" />
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-danger/10 p-4 text-sm font-semibold leading-6 text-danger">
            {guide.urgentRule}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {guide.sections.map((section, sectionIndex) => (
              <article key={section.title} className="rounded-2xl bg-surface-card p-6 shadow-ambient">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">
                    {sectionIndex + 1}
                  </span>
                  <h2 className="text-xl font-black text-text-main">{section.title}</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-text-main">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-surface-card p-5 shadow-ambient">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="font-black text-text-main">Checklist trước khi báo cáo</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {guide.checklist.map((item) => (
                  <li key={item} className="flex gap-2 text-sm font-semibold text-text-main">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl bg-primary p-5 text-white shadow-ambient">
              <h2 className="font-black">Cần thao tác tiếp?</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">Dùng hệ thống để gửi yêu cầu, xem bản đồ hoặc theo dõi tình trạng điều phối.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/rescue-request" className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-bold text-primary">
                  Gửi yêu cầu cứu trợ
                </Link>
                <Link href="/map" className="rounded-xl bg-white/10 px-4 py-2.5 text-center text-sm font-bold text-white">
                  Xem bản đồ
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
