import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import nodemailer from "nodemailer";

export type EmailTrigger =
  | "RESCUE_REQUEST_SUBMITTED"
  | "RESCUE_REQUEST_APPROVED"
  | "SPONSORSHIP_SUBMITTED"
  | "SPONSORSHIP_APPROVED"
  | "VOLUNTEER_JOIN_REQUEST_SUBMITTED"
  | "VOLUNTEER_JOIN_REQUEST_APPROVED"
  | "VOLUNTEER_ACCOUNT_APPROVED"
  | "VOLUNTEER_PASSWORD_RESET"
  | "DONATION_CONFIRMED";

type EmailTemplateRecord = {
  id: string | null;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  fromName: string | null;
  replyTo: string | null;
};

type SendAutomaticEmailInput = {
  trigger: EmailTrigger;
  to?: string | null;
  recipientName?: string | null;
  recipientUserId?: string | null;
  donorId?: string | null;
  rescueRequestId?: string | null;
  volunteerRequestId?: string | null;
  fundTransactionId?: string | null;
  variables?: Record<string, string | number | null | undefined>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

type SendManualEmailInput = Omit<SendAutomaticEmailInput, "idempotencyKey" | "variables"> & {
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  replyTo?: string | null;
  fromName?: string | null;
  attachments?: EmailAttachment[];
};

type EmailProvider = "resend" | "smtp" | "gmail" | "brevo";

type EmailAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let smtpTransporter: nodemailer.Transporter | null = null;

function cleanEmail(value?: string | null) {
  const email = value?.trim();
  return email && EMAIL_RE.test(email) ? email : null;
}

function shouldSkipAutomaticEmail(recipientEmail: string) {
  return recipientEmail.toLowerCase().includes("demo");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTemplate(template: string, variables: Record<string, string | number | null | undefined>, html: boolean) {
  return template.replace(/\{\{\{?\s*([A-Z_a-z][A-Z_a-z0-9]*)\s*\}?\}\}/g, (_, key: string) => {
    const value = variables[key];
    const text = value == null || value === "" ? "-" : String(value);
    return html ? escapeHtml(text).replace(/\n/g, "<br>") : text;
  });
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function activeEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER ?? "resend").trim().toLowerCase();
  if (provider === "smtp" || provider === "gmail" || provider === "brevo") return provider;
  return "resend";
}

function fromAddress(template: EmailTemplateRecord) {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
  if (!fromEmail) return null;
  const fromName = template.fromName ?? process.env.SMTP_FROM_NAME ?? process.env.RESEND_FROM_NAME ?? "Dieu phoi cuu tro";
  return `${fromName} <${fromEmail}>`;
}

function resendErrorMessage(payload: unknown, status: number, statusText: string) {
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown; error?: unknown }).message ?? (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return `Resend API ${status} ${statusText}`.trim();
}

function smtpConfig() {
  const provider = activeEmailProvider();
  const host = process.env.SMTP_HOST || (provider === "gmail" ? "smtp.gmail.com" : "");
  const port = Number(process.env.SMTP_PORT || (provider === "gmail" ? 465 : 587));
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")).toLowerCase() === "true";

  if (!host || !port || !user || !pass) return null;
  return { host, port, secure, auth: { user, pass } };
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const config = smtpConfig();
  if (!config) return null;
  smtpTransporter = nodemailer.createTransport(config);
  return smtpTransporter;
}

async function sendViaSmtp(
  template: EmailTemplateRecord,
  recipientEmail: string,
  rendered: { subject: string; html: string; text: string | null },
  attachments: EmailAttachment[] = [],
) {
  const transporter = getSmtpTransporter();
  const from = fromAddress(template);
  if (!transporter || !from) {
    return { skipped: true, errorMessage: "Missing SMTP_HOST/SMTP_USER/SMTP_PASS or SMTP_FROM_EMAIL." };
  }

  const result = await transporter.sendMail({
    from,
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? undefined,
    replyTo: template.replyTo ?? undefined,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.contentBase64, "base64"),
      contentType: attachment.contentType ?? undefined,
    })),
  });

  return { messageId: result.messageId ?? null };
}

async function sendViaResend(
  template: EmailTemplateRecord,
  recipientEmail: string,
  rendered: { subject: string; html: string; text: string | null },
  idempotencyKey?: string,
  attachments: EmailAttachment[] = [],
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = fromAddress(template);
  if (!apiKey || !from) {
    return { skipped: true, errorMessage: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [recipientEmail],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text ?? undefined,
      reply_to: template.replyTo ?? undefined,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.contentBase64,
      })),
      tags: [
        { name: "trigger", value: rendered.subject.toLowerCase().slice(0, 50).replace(/[^a-z0-9-]/g, "-") },
      ],
    }),
  });

  const payload = await response.json().catch(() => null) as { id?: string } | null;
  if (!response.ok) {
    throw new Error(resendErrorMessage(payload, response.status, response.statusText));
  }
  return { messageId: payload?.id ?? null };
}

async function sendViaBrevo(
  template: EmailTemplateRecord,
  recipientEmail: string,
  rendered: { subject: string; html: string; text: string | null },
  idempotencyKey?: string,
  attachments: EmailAttachment[] = [],
) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = template.fromName ?? process.env.SMTP_FROM_NAME ?? "Dieu phoi cuu tro";

  if (!apiKey || !fromEmail) {
    return { skipped: true, errorMessage: "Missing BREVO_API_KEY or SMTP_FROM_EMAIL." };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: recipientEmail }],
      subject: rendered.subject,
      htmlContent: rendered.html,
      textContent: rendered.text ?? undefined,
      replyTo: template.replyTo ? { email: template.replyTo } : undefined,
      attachment: attachments.length > 0 ? attachments.map((att) => ({
        name: att.filename,
        content: att.contentBase64,
      })) : undefined,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
  });

  const payload = await response.json().catch(() => null) as { messageId?: string, message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message || `Brevo API ${response.status} ${response.statusText}`);
  }
  return { messageId: payload?.messageId ?? null };
}

async function findTemplate(fastify: FastifyInstance, trigger: EmailTrigger) {
  const prisma = fastify.prisma as any;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id", "subject", "htmlBody", "textBody", "fromName", "replyTo"
     FROM "EmailTemplate"
     WHERE "trigger" = $1::"EmailTemplateTrigger" AND "enabled" = true
     LIMIT 1`,
    trigger,
  ) as EmailTemplateRecord[];
  return rows[0] ?? null;
}

async function findExistingLog(fastify: FastifyInstance, idempotencyKey?: string) {
  if (!idempotencyKey) return null;
  const prisma = fastify.prisma as any;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id", "status" FROM "EmailLog" WHERE "idempotencyKey" = $1 LIMIT 1`,
    idempotencyKey,
  ) as Array<{ id: string; status: string }>;
  return rows[0] ?? null;
}

async function createEmailLog(
  fastify: FastifyInstance,
  input: SendAutomaticEmailInput,
  template: EmailTemplateRecord,
  rendered: { subject: string; html: string; text: string | null },
  recipientEmail: string,
) {
  const prisma = fastify.prisma as any;
  const id = randomUUID();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO "EmailLog" (
      "id", "templateId", "trigger", "status", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody",
      "idempotencyKey", "metadata", "recipientUserId", "donorId", "rescueRequestId", "volunteerRequestId",
      "fundTransactionId", "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3::"EmailTemplateTrigger", 'PENDING'::"EmailDeliveryStatus", $4, $5, $6, $7, $8,
      $9, $10::jsonb, $11, $12, $13, $14, $15, NOW(), NOW()
    )
    RETURNING "id"`,
    id,
    template.id,
    input.trigger,
    recipientEmail,
    input.recipientName ?? null,
    rendered.subject,
    rendered.html,
    rendered.text,
    input.idempotencyKey ?? null,
    metadata,
    input.recipientUserId ?? null,
    input.donorId ?? null,
    input.rescueRequestId ?? null,
    input.volunteerRequestId ?? null,
    input.fundTransactionId ?? null,
  ) as Array<{ id: string }>;
  return rows[0].id;
}

async function updateEmailLog(fastify: FastifyInstance, id: string, status: "SENT" | "FAILED" | "SKIPPED", data: { resendEmailId?: string | null; errorMessage?: string | null }) {
  const prisma = fastify.prisma as any;
  await prisma.$queryRawUnsafe(
    `UPDATE "EmailLog"
     SET "status" = $2::"EmailDeliveryStatus",
         "resendEmailId" = $3,
         "errorMessage" = $4,
         "sentAt" = CASE WHEN $2 = 'SENT' THEN NOW() ELSE "sentAt" END,
         "updatedAt" = NOW()
     WHERE "id" = $1`,
    id,
    status,
    data.resendEmailId ?? null,
    data.errorMessage ?? null,
  );
}

export async function sendAutomaticEmail(fastify: FastifyInstance, input: SendAutomaticEmailInput) {
  const recipientEmail = cleanEmail(input.to);
  if (!recipientEmail) return null;

  const existing = await findExistingLog(fastify, input.idempotencyKey);
  if (existing) return existing;

  const template = await findTemplate(fastify, input.trigger);
  if (!template) return null;

  const variables = {
    recipientName: input.recipientName ?? "Quý anh/chị",
    ...(input.variables ?? {}),
  };
  const rendered = {
    subject: renderTemplate(template.subject, variables, false),
    html: renderTemplate(template.htmlBody, variables, true),
    text: template.textBody ? renderTemplate(template.textBody, variables, false) : null,
  };

  const logId = await createEmailLog(fastify, input, template, rendered, recipientEmail);
  const provider = activeEmailProvider();

  if (shouldSkipAutomaticEmail(recipientEmail)) {
    await updateEmailLog(fastify, logId, "SKIPPED", { errorMessage: "Skipped automatic email because recipient contains demo." });
    return { id: logId, status: "SKIPPED" };
  }

  try {
    const result = provider === "resend"
      ? await sendViaResend(template, recipientEmail, rendered, input.idempotencyKey)
      : provider === "brevo"
      ? await sendViaBrevo(template, recipientEmail, rendered, input.idempotencyKey)
      : await sendViaSmtp(template, recipientEmail, rendered);

    if (result.skipped) {
      await updateEmailLog(fastify, logId, "SKIPPED", { errorMessage: result.errorMessage });
      return { id: logId, status: "SKIPPED" };
    }

    await updateEmailLog(fastify, logId, "SENT", { resendEmailId: result.messageId ?? null });
    return { id: logId, status: "SENT", resendEmailId: result.messageId ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    await updateEmailLog(fastify, logId, "FAILED", { errorMessage: message });
    fastify.log.warn({ trigger: input.trigger, emailLogId: logId, provider, error }, "Failed to send automatic email");
    return { id: logId, status: "FAILED" };
  }
}

export async function sendManualEmail(fastify: FastifyInstance, input: SendManualEmailInput) {
  const recipientEmail = cleanEmail(input.to);
  if (!recipientEmail) return null;

  const subject = input.subject.trim();
  const htmlBody = input.htmlBody.trim();
  const textBody = input.textBody?.trim() || input.htmlBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  if (!subject || !htmlBody) return null;

  const template: EmailTemplateRecord = {
    id: null,
    subject,
    htmlBody,
    textBody,
    fromName: input.fromName ?? null,
    replyTo: input.replyTo ?? null,
  };

  const rendered = { subject, html: htmlBody, text: textBody };
  const attachments = input.attachments ?? [];
  const logId = await createEmailLog(fastify, input, template, rendered, recipientEmail);
  const provider = activeEmailProvider();

  try {
    const result = provider === "resend"
      ? await sendViaResend(template, recipientEmail, rendered, undefined, attachments)
      : provider === "brevo"
      ? await sendViaBrevo(template, recipientEmail, rendered, undefined, attachments)
      : await sendViaSmtp(template, recipientEmail, rendered, attachments);

    if (result.skipped) {
      await updateEmailLog(fastify, logId, "SKIPPED", { errorMessage: result.errorMessage });
      return { id: logId, status: "SKIPPED" };
    }

    await updateEmailLog(fastify, logId, "SENT", { resendEmailId: result.messageId ?? null });
    return { id: logId, status: "SENT", resendEmailId: result.messageId ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    await updateEmailLog(fastify, logId, "FAILED", { errorMessage: message });
    fastify.log.warn({ trigger: input.trigger, emailLogId: logId, provider, error }, "Failed to send manual email");
    return { id: logId, status: "FAILED" };
  }
}

export function plainTextEmailToHtml(text: string) {
  return textToHtml(text);
}
