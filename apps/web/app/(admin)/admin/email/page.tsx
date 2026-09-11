"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Paperclip, Send, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/navigation/back-button";
import { apiClient } from "@/lib/api";

type EmailRecipient = {
  email: string;
  name?: string | null;
  recipientUserId?: string | null;
  donorId?: string | null;
};

type EmailContext = {
  targetType: string;
  title: string;
  trigger: "RESCUE_REQUEST_APPROVED" | "SPONSORSHIP_APPROVED" | "VOLUNTEER_JOIN_REQUEST_APPROVED";
  recipients: EmailRecipient[];
  template: {
    subject: string;
    body: string;
  };
  context: Record<string, string | null | undefined>;
};

type SendResult = {
  sent: number;
  failed: number;
  skipped: number;
};

type EmailAttachment = {
  filename: string;
  contentType: string;
  size: number;
  contentBase64: string;
};

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${value} B`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",").pop() ?? "" : value);
    };
    reader.onerror = () => reject(new Error("Không đọc được file đính kèm."));
    reader.readAsDataURL(file);
  });
}

export default function AdminEmailPage() {
  const params = useSearchParams();
  const [context, setContext] = useState<EmailContext | null>(null);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [extraEmail, setExtraEmail] = useState("");
  const [extraName, setExtraName] = useState("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const contextQuery = useMemo(() => {
    const query = new URLSearchParams();
    for (const key of ["type", "id", "donorId", "itemCategoryId", "missionId", "userId"]) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    return query.toString();
  }, [params]);

  useEffect(() => {
    let mounted = true;
    async function fetchContext() {
      if (!contextQuery) {
        setError("Thiếu ngữ cảnh soạn email.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      setAttachments([]);
      try {
        const res = await apiClient.get<{ data: EmailContext }>(`/admin/email/context?${contextQuery}`);
        if (!mounted) return;
        setContext(res.data);
        setRecipients(res.data.recipients);
        setSubject(res.data.template.subject);
        setBody(res.data.template.body);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Không tải được mẫu email.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void fetchContext();
    return () => { mounted = false; };
  }, [contextQuery]);

  const canSend = !!context && recipients.length > 0 && subject.trim().length >= 3 && body.trim().length >= 3 && !sending;
  const totalAttachmentSize = attachments.reduce((sum, attachment) => sum + attachment.size, 0);

  function addRecipient() {
    const email = extraEmail.trim();
    if (!email) return;
    if (recipients.some((recipient) => recipient.email.toLowerCase() === email.toLowerCase())) {
      setExtraEmail("");
      setExtraName("");
      return;
    }
    setRecipients([...recipients, { email, name: extraName.trim() || null }]);
    setExtraEmail("");
    setExtraName("");
  }

  function removeRecipient(email: string) {
    setRecipients(recipients.filter((recipient) => recipient.email !== email));
  }

  async function addAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const next = [...attachments];
      for (const file of Array.from(files)) {
        if (next.length >= 5) {
          setError("Chỉ được đính kèm tối đa 5 file.");
          break;
        }
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setError(`File "${file.name}" vượt quá 5MB.`);
          continue;
        }
        if (next.reduce((sum, item) => sum + item.size, 0) + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
          setError("Tổng dung lượng file đính kèm không được vượt quá 10MB.");
          break;
        }
        const contentBase64 = await readFileAsBase64(file);
        next.push({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          contentBase64,
        });
      }
      setAttachments(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được file đính kèm.");
    }
  }

  function removeAttachment(filename: string) {
    setAttachments(attachments.filter((attachment) => attachment.filename !== filename));
  }

  async function sendEmail() {
    if (!context || !canSend) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.post<{ data: SendResult }>("/admin/email/send", {
        trigger: context.trigger,
        subject,
        body,
        replyTo,
        recipients,
        attachments,
        context: {
          ...context.context,
          targetType: context.targetType,
        },
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soạn email"
        subtitle="Gửi email thủ công tới cán bộ, nhà tài trợ hoặc tình nguyện viên theo ngữ cảnh quản lý."
        actions={[{ href: "/admin/needs", label: "Yêu cầu cứu trợ" }, { href: "/admin/inventory", label: "Kho", variant: "secondary" }]}
      />

      <BackButton fallbackHref="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-800">
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </BackButton>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
      {result && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          Đã xử lý: {result.sent} gửi thành công, {result.failed} lỗi, {result.skipped} bỏ qua.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải mẫu email
        </div>
      ) : context ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-800">Ngữ cảnh</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{context.title}</h2>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">Người nhận</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{recipients.length}</span>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {recipients.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">Chưa có email người nhận. Hãy thêm thủ công bên dưới.</p>
                ) : recipients.map((recipient) => (
                  <div key={recipient.email} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{recipient.name || recipient.email}</p>
                      <p className="truncate text-xs text-slate-500">{recipient.email}</p>
                    </div>
                    <button type="button" onClick={() => removeRecipient(recipient.email)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Bỏ người nhận">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-sm font-black text-slate-950">Thêm người nhận</p>
              <input className={fieldClass} placeholder="Tên người nhận" value={extraName} onChange={(event) => setExtraName(event.target.value)} />
              <input className={fieldClass} type="email" placeholder="email@example.com" value={extraEmail} onChange={(event) => setExtraEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addRecipient(); }} />
              <button type="button" onClick={addRecipient} disabled={!extraEmail.trim()} className="w-full rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                Thêm vào danh sách
              </button>
            </div>
          </aside>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
              <Mail className="h-5 w-5 text-blue-800" />
              <h2 className="font-black text-slate-950">Nội dung email</h2>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Tiêu đề</span>
              <input className={fieldClass} value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Nội dung</span>
              <textarea className="min-h-[360px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" value={body} onChange={(event) => setBody(event.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Email phản hồi</span>
              <input className={fieldClass} type="email" placeholder="Để trống nếu dùng cấu hình mặc định" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">File đính kèm</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{attachments.length} file · {formatBytes(totalAttachmentSize)} / 10 MB</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50">
                  <Paperclip className="h-4 w-4" />
                  Chọn file
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void addAttachments(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((attachment) => (
                    <div key={`${attachment.filename}-${attachment.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{attachment.filename}</p>
                        <p className="text-xs text-slate-500">{attachment.contentType} · {formatBytes(attachment.size)}</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(attachment.filename)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Bỏ file">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-slate-500">Email sẽ được ghi vào log gửi email của hệ thống.</p>
              <button type="button" onClick={sendEmail} disabled={!canSend} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Đang gửi..." : `Gửi email (${recipients.length})`}
              </button>
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}
