import { FastifyInstance } from "fastify";
import fs from "node:fs";
import PDFDocument from "pdfkit";
import puppeteer from "puppeteer";
import { z } from "zod";
import { plainTextEmailToHtml, sendManualEmail, type EmailTrigger } from "../services/emailService.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().max(160).optional().nullable(),
  recipientUserId: z.string().optional().nullable(),
  donorId: z.string().optional().nullable(),
});

const attachmentSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(120).optional().nullable(),
  size: z.number().int().min(1).max(5 * 1024 * 1024),
  contentBase64: z.string().min(1),
});

const MAX_TOTAL_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const EMAIL_SEND_BODY_LIMIT = 20 * 1024 * 1024;

const sendEmailSchema = z.object({
  trigger: z.enum([
    "RESCUE_REQUEST_APPROVED",
    "SPONSORSHIP_APPROVED",
    "VOLUNTEER_JOIN_REQUEST_APPROVED",
  ]),
  subject: z.string().trim().min(3).max(255),
  body: z.string().trim().min(3).max(10000),
  recipients: z.array(recipientSchema).min(1).max(50),
  attachments: z.array(attachmentSchema).max(5).default([]),
  replyTo: z.string().email().optional().or(z.literal("")),
  context: z.object({
    rescueRequestId: z.string().optional().nullable(),
    volunteerRequestId: z.string().optional().nullable(),
    fundTransactionId: z.string().optional().nullable(),
    missionId: z.string().optional().nullable(),
    rescueTeamId: z.string().optional().nullable(),
    itemCategoryId: z.string().optional().nullable(),
    targetType: z.string().optional().nullable(),
  }).optional(),
});

const missionReportRowSchema = z.object({
  label: z.string().trim().min(1).max(160),
  value: z.string().max(20000).default(""),
});

const sendMissionReportSchema = z.object({
  rescueRequestId: z.string().min(1),
  missionId: z.string().min(1),
  reportRows: z.array(missionReportRowSchema).min(1).max(80),
  reportHtml: z.string().min(1).max(500_000),
});

type ManualRecipient = {
  email: string;
  name?: string | null;
  recipientUserId?: string | null;
  donorId?: string | null;
};

function shortCode(id?: string | null) {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

function rescueRequestLabel(item: { id: string; code?: string | null }) {
  return `Yêu cầu cứu trợ #${item.code || item.id.slice(0, 5).toUpperCase()}`;
}

function reportValue(rows: Array<{ label: string; value: string }>, label: string) {
  return rows.find((row) => row.label === label)?.value?.trim() || "-";
}

function parseTableRows(value: string, expectedColumns: number) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.includes("\t") ? line.split("\t") : line.split("|");
      return Array.from({ length: expectedColumns }, (_, index) => cells[index]?.trim() || "-");
    });
}

function pdfFontPath() {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansMono-Regular.ttf",
  ];
  return candidates.find((item) => fs.existsSync(item)) ?? null;
}

function pdfBoldFontPath() {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansMono-Bold.ttf",
  ];
  return candidates.find((item) => fs.existsSync(item)) ?? pdfFontPath();
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], widths: number[], fonts: { regular: string; bold: string }) {
  const startX = doc.x;
  const lineHeight = 14;
  const cellPadding = 4;
  const drawRow = (cells: string[], header = false) => {
    const heights = cells.map((cell, index) => doc.heightOfString(cell, { width: widths[index] - cellPadding * 2 }) + cellPadding * 2);
    const rowHeight = Math.max(18, ...heights);
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    let x = startX;
    doc.font(header ? fonts.bold : fonts.regular).fontSize(header ? 9 : 8.5);
    cells.forEach((cell, index) => {
      doc.rect(x, y, widths[index], rowHeight).stroke();
      doc.text(cell, x + cellPadding, y + cellPadding, { width: widths[index] - cellPadding * 2, lineGap: 1 });
      x += widths[index];
    });
    doc.y = y + rowHeight;
    doc.font(fonts.regular).fontSize(10).lineGap(lineHeight);
  };
  drawRow(headers, true);
  if (rows.length === 0) drawRow(["1", "Chưa có dữ liệu", "-"].slice(0, headers.length));
  rows.forEach((row, index) => drawRow(headers.length === 3 ? [String(index + 1), row[0] ?? "-", row[1] ?? "-"] : row));
  doc.moveDown(0.8);
}

async function missionReportPdfBase64(rows: Array<{ label: string; value: string }>, missionId: string) {
  return new Promise<{ base64: string; size: number }>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve({ base64: buffer.toString("base64"), size: buffer.length });
    });
    doc.on("error", reject);

    const regular = pdfFontPath();
    const bold = pdfBoldFontPath();
    if (regular) doc.registerFont("DejaVu", regular);
    if (bold) doc.registerFont("DejaVuBold", bold);
    const fonts = { regular: regular ? "DejaVu" : "Helvetica", bold: bold ? "DejaVuBold" : "Helvetica-Bold" };
    doc.font(fonts.regular).fontSize(10);

    const title = reportValue(rows, "Tên nhiệm vụ");
    const requestCode = reportValue(rows, "Mã yêu cầu");
    const reportDate = reportValue(rows, "Ngày xuất báo cáo");
    const missionType = reportValue(rows, "Loại nhiệm vụ");
    const priority = reportValue(rows, "Mức ưu tiên");
    const status = reportValue(rows, "Trạng thái nhiệm vụ");
    const startedAt = reportValue(rows, "Thời gian bắt đầu");
    const endedAt = reportValue(rows, "Thời gian kết thúc");
    const requestName = reportValue(rows, "Yêu cầu cứu trợ");
    const content = reportValue(rows, "Nội dung yêu cầu");
    const location = reportValue(rows, "Địa điểm");
    const address = reportValue(rows, "Địa chỉ");
    const requester = reportValue(rows, "Người yêu cầu");
    const requesterPhone = reportValue(rows, "SĐT người yêu cầu");
    const transport = reportValue(rows, "Phương tiện vận chuyển");
    const teams = reportValue(rows, "Đội tình nguyện viên");

    doc.font(fonts.bold).fontSize(10).text("BAN ĐIỀU PHỐI CỨU TRỢ", 48, 48, { width: 220, align: "center" });
    doc.font(fonts.regular).fontSize(9).text(`Số: ${requestCode} / ${missionId.slice(0, 8).toUpperCase()}`, 48, 64, { width: 220, align: "center" });
    doc.font(fonts.bold).fontSize(10).text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 310, 48, { width: 240, align: "center" });
    doc.font(fonts.regular).fontSize(9).text("Độc lập - Tự do - Hạnh phúc", 310, 64, { width: 240, align: "center" });
    doc.moveDown(4);
    doc.font(fonts.bold).fontSize(15).text("BIÊN BẢN XÁC NHẬN HOÀN TẤT NHIỆM VỤ CỨU TRỢ", { align: "center" });
    doc.font(fonts.regular).fontSize(10).text(`Lập ngày: ${reportDate}`, { align: "center" });
    doc.moveDown();
    doc.text(`Hôm nay, Ban điều phối cứu trợ lập biên bản xác nhận kết quả thực hiện nhiệm vụ "${title}", thuộc ${requestName}.`, { align: "justify" });

    const heading = (text: string) => {
      doc.moveDown(0.8);
      doc.font(fonts.bold).fontSize(11).text(text);
      doc.font(fonts.regular).fontSize(10);
    };

    heading("I. Thông tin chung");
    doc.text(`Nhiệm vụ: ${title}.`);
    doc.text(`Loại nhiệm vụ: ${missionType}. Mức ưu tiên: ${priority}. Trạng thái: ${status}.`);
    doc.text(`Thời gian thực hiện: từ ${startedAt} đến ${endedAt}.`);
    doc.text(`Địa điểm: ${location} - ${address}.`);
    doc.text(`Người/đơn vị yêu cầu: ${requester}; liên hệ: ${requesterPhone}.`);

    heading("II. Nội dung nhiệm vụ");
    doc.text(content, { align: "justify" });

    heading("III. Hàng hóa theo yêu cầu cứu trợ");
    drawTable(doc, ["STT", "Danh mục hàng", "Số lượng"], parseTableRows(reportValue(rows, "Hàng hóa yêu cầu"), 2), [42, 260, 90], fonts);

    heading("IV. Hàng hóa/nguồn lực đã phân bổ cho nhiệm vụ");
    drawTable(doc, ["STT", "Danh mục hàng", "Số lượng"], parseTableRows(reportValue(rows, "Hàng hóa phân bổ cho nhiệm vụ"), 2), [42, 260, 90], fonts);

    heading("V. Phương tiện và nhân sự tham gia");
    doc.font(fonts.bold).text("Phương tiện vận chuyển:");
    doc.font(fonts.regular).text(transport);
    doc.font(fonts.bold).text("Đội tình nguyện viên tham gia nhiệm vụ:");
    doc.font(fonts.regular).text(teams);
    drawTable(doc, ["Họ tên", "SĐT", "Tuổi", "Giới tính", "Khu vực"], parseTableRows(reportValue(rows, "TNV đăng ký yêu cầu"), 5), [150, 85, 48, 70, 120], fonts);

    heading("VI. Xác nhận hoàn tất");
    doc.text("Các bên xác nhận nhiệm vụ đã được ghi nhận theo thông tin nêu trên. Biên bản này được lập để lưu hồ sơ điều phối, phục vụ đối soát nguồn lực và báo cáo sau nhiệm vụ.", { align: "justify" });
    doc.moveDown(2);
    const signatureY = doc.y;
    doc.font(fonts.bold).text("Người lập biên bản", 90, signatureY, { width: 160, align: "center" });
    doc.text("Đại diện ban điều phối", 330, signatureY, { width: 170, align: "center" });
    doc.font(fonts.regular).text(".................................", 90, signatureY + 72, { width: 160, align: "center" });
    doc.text(".................................", 330, signatureY + 72, { width: 170, align: "center" });
    doc.end();
  });
}

async function missionReportPdfFromHtmlBase64(html: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("print");
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    const buffer = Buffer.from(pdfBytes);
    return { base64: buffer.toString("base64"), size: buffer.length };
  } finally {
    await browser.close();
  }
}

function uniqueRecipients<T extends { email?: string | null; name?: string | null; recipientUserId?: string | null; donorId?: string | null }>(recipients: T[]): ManualRecipient[] {
  const seen = new Set<string>();
  const output: ManualRecipient[] = [];
  for (const recipient of recipients) {
    const email = recipient.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    output.push({
      email: recipient.email!.trim(),
      name: recipient.name ?? null,
      recipientUserId: recipient.recipientUserId ?? null,
      donorId: recipient.donorId ?? null,
    });
  }
  return output;
}

function buildResponse(input: {
  targetType: string;
  title: string;
  trigger: EmailTrigger;
  recipients: ManualRecipient[];
  subject: string;
  body: string;
  context?: Record<string, unknown>;
}) {
  return {
    data: {
      targetType: input.targetType,
      title: input.title,
      trigger: input.trigger,
      recipients: uniqueRecipients(input.recipients),
      template: {
        subject: input.subject,
        body: input.body,
      },
      context: input.context ?? {},
    },
  };
}

export default async function adminEmailRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  fastify.get("/admin/email/context", { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const query = request.query as {
      type?: string;
      id?: string;
      donorId?: string;
      itemCategoryId?: string;
      missionId?: string;
      userId?: string;
    };

    if (query.type === "rescue-request" && query.id) {
      const item = await prisma.rescueRequest.findUnique({
        where: { id: query.id },
        include: { submittedBy: true, location: true },
      });
      if (!item) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });

      const recipientEmail = item.requesterEmail ?? item.submittedBy?.email ?? null;
      return buildResponse({
        targetType: "rescue-request",
        title: `Cán bộ gửi yêu cầu: ${rescueRequestLabel(item)}`,
        trigger: "RESCUE_REQUEST_APPROVED",
        recipients: recipientEmail ? [{
          email: recipientEmail,
          name: item.requesterName ?? item.submittedBy?.name,
          recipientUserId: item.submittedById,
        }] : [],
        subject: `[DPCT] Trao đổi về yêu cầu cứu trợ ${shortCode(item.id)}`,
        body: [
          `Kính gửi ${item.requesterName ?? item.submittedBy?.name ?? "anh/chị"},`,
          "",
          `Ban điều phối cần trao đổi thêm về ${rescueRequestLabel(item)} tại ${item.location?.name ?? "khu vực đã ghi nhận"}.`,
          "",
          "Nội dung cần trao đổi:",
          "- ",
          "",
          "Trân trọng,",
          "Ban điều phối cứu trợ",
        ].join("\n"),
        context: { rescueRequestId: item.id },
      });
    }

    if (query.type === "sponsorship" && query.donorId && query.itemCategoryId) {
      const item = await prisma.donorGoods.findUnique({
        where: { donorId_itemCategoryId: { donorId: query.donorId, itemCategoryId: query.itemCategoryId } },
        include: { donor: true, itemCategory: true },
      });
      if (!item) return reply.status(404).send({ message: "Không tìm thấy yêu cầu tài trợ." });

      return buildResponse({
        targetType: "sponsorship",
        title: `Nhà tài trợ: ${item.donor?.name ?? "Không rõ"}`,
        trigger: "SPONSORSHIP_APPROVED",
        recipients: item.donor?.email ? [{ email: item.donor.email, name: item.donor.name, donorId: item.donorId }] : [],
        subject: `[DPCT] Trao đổi về tài trợ ${item.itemCategory?.name ?? "hàng hóa"}`,
        body: [
          `Kính gửi ${item.donor?.name ?? "Quý nhà tài trợ"},`,
          "",
          `Ban điều phối cần trao đổi thêm về phần tài trợ ${item.quantity} ${item.unit} ${item.itemCategory?.name ?? "hàng hóa"}.`,
          "",
          "Nội dung cần trao đổi:",
          "- ",
          "",
          "Trân trọng,",
          "Ban điều phối cứu trợ",
        ].join("\n"),
        context: { itemCategoryId: item.itemCategoryId },
      });
    }

    if (query.type === "mission-team" && query.missionId) {
      const mission = await prisma.mission.findUnique({
        where: { id: query.missionId },
        include: {
          request: true,
          rescueTeams: { include: { members: { include: { user: { select: volunteerSelect(false) } } } } },
        },
      });
      if (!mission) return reply.status(404).send({ message: "Không tìm thấy nhiệm vụ." });

      const team = mission.rescueTeams[0] ?? null;
      const recipients = uniqueRecipients((team?.members ?? []).map((member: any) => {
        const volunteer = volunteerDto(member.user);
        return {
          email: volunteer?.email,
          name: volunteer?.name,
          recipientUserId: volunteer?.userId,
        };
      }));

      return buildResponse({
        targetType: "mission-team",
        title: `Đội TNV: ${team?.name ?? mission.name}`,
        trigger: "VOLUNTEER_JOIN_REQUEST_APPROVED",
        recipients,
        subject: `[DPCT] Cập nhật nhiệm vụ ${mission.name}`,
        body: [
          "Chào đội tình nguyện viên,",
          "",
          `Ban điều phối gửi cập nhật cho nhiệm vụ "${mission.name}"${mission.request ? ` thuộc ${rescueRequestLabel(mission.request)}` : ""}.`,
          "",
          "Nội dung cần thông báo:",
          "- ",
          "",
          "Trân trọng,",
          "Ban điều phối cứu trợ",
        ].join("\n"),
        context: { rescueRequestId: mission.requestId, missionId: mission.id, rescueTeamId: team?.id ?? null },
      });
    }

    if (query.type === "volunteer" && query.userId) {
      const volunteer = volunteerDto(await prisma.volunteer.findUnique({ where: { id: query.userId }, select: volunteerSelect(false) }));
      if (!volunteer) return reply.status(404).send({ message: "Không tìm thấy tình nguyện viên." });

      return buildResponse({
        targetType: "volunteer",
        title: `Tình nguyện viên: ${volunteer.name}`,
        trigger: "VOLUNTEER_JOIN_REQUEST_APPROVED",
        recipients: volunteer.email ? [{ email: volunteer.email, name: volunteer.name, recipientUserId: volunteer.id }] : [],
        subject: "[DPCT] Trao đổi từ ban điều phối",
        body: [
          `Chào ${volunteer.name},`,
          "",
          "Ban điều phối cần trao đổi với bạn về hoạt động tình nguyện.",
          "",
          "Nội dung:",
          "- ",
          "",
          "Trân trọng,",
          "Ban điều phối cứu trợ",
        ].join("\n"),
        context: { missionId: query.missionId ?? null },
      });
    }

    return reply.status(400).send({ message: "Thiếu hoặc sai ngữ cảnh soạn email." });
  });

  fastify.post("/admin/email/send", { preHandler: [fastify.requireAdmin], bodyLimit: EMAIL_SEND_BODY_LIMIT }, async (request, reply) => {
    const body = sendEmailSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu email không hợp lệ.", errors: body.error.flatten() });

    const input = body.data;
    const totalAttachmentSize = input.attachments.reduce((sum, attachment) => sum + attachment.size, 0);
    if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      return reply.status(400).send({ message: "Tổng dung lượng file đính kèm không được vượt quá 10MB." });
    }

    const htmlBody = plainTextEmailToHtml(input.body);
    const results = await Promise.all(input.recipients.map((recipient) => sendManualEmail(fastify, {
      trigger: input.trigger,
      to: recipient.email,
      recipientName: recipient.name,
      recipientUserId: recipient.recipientUserId,
      donorId: recipient.donorId,
      rescueRequestId: input.context?.rescueRequestId,
      volunteerRequestId: input.context?.volunteerRequestId,
      fundTransactionId: input.context?.fundTransactionId,
      subject: input.subject,
      htmlBody,
      textBody: input.body,
      replyTo: input.replyTo || null,
      attachments: input.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentBase64: attachment.contentBase64,
        contentType: attachment.contentType ?? null,
      })),
      metadata: {
        manual: true,
        targetType: input.context?.targetType ?? null,
        attachmentCount: input.attachments.length,
        missionId: input.context?.missionId ?? null,
        rescueTeamId: input.context?.rescueTeamId ?? null,
        itemCategoryId: input.context?.itemCategoryId ?? null,
      },
    })));

    const sent = results.filter((result) => result?.status === "SENT").length;
    const failed = results.filter((result) => result?.status === "FAILED").length;
    const skipped = results.filter((result) => !result || result.status === "SKIPPED").length;

    return reply.status(201).send({ data: { sent, failed, skipped, results } });
  });

  fastify.post("/admin/email/send-mission-report", { preHandler: [fastify.requireAdmin], bodyLimit: EMAIL_SEND_BODY_LIMIT }, async (request, reply) => {
    const body = sendMissionReportSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu báo cáo email không hợp lệ.", errors: body.error.flatten() });

    const input = body.data;
    const rescueRequest = await prisma.rescueRequest.findUnique({
      where: { id: input.rescueRequestId },
      include: { submittedBy: true, location: true },
    });
    if (!rescueRequest) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });

    const mission = await prisma.mission.findUnique({ where: { id: input.missionId } });
    if (!mission || mission.requestId !== rescueRequest.id) return reply.status(404).send({ message: "Không tìm thấy nhiệm vụ thuộc yêu cầu này." });

    const recipientEmail = rescueRequest.requesterEmail ?? rescueRequest.submittedBy?.email ?? null;
    if (!recipientEmail) return reply.status(400).send({ message: "Yêu cầu này chưa có email cán bộ địa phương." });

    const pdf = await missionReportPdfFromHtmlBase64(input.reportHtml);
    if (pdf.size > 5 * 1024 * 1024) return reply.status(400).send({ message: "File PDF báo cáo vượt quá 5MB." });

    const missionName = reportValue(input.reportRows, "Tên nhiệm vụ");
    const subject = `[DPCT] Biên bản hoàn tất nhiệm vụ ${missionName}`;
    const textBody = [
      `Kính gửi ${rescueRequest.requesterName ?? rescueRequest.submittedBy?.name ?? "Cán bộ địa phương"},`,
      "",
      `Ban điều phối gửi kèm biên bản xác nhận hoàn tất nhiệm vụ "${missionName}" thuộc ${rescueRequestLabel(rescueRequest)} tại ${rescueRequest.location?.name ?? "khu vực đã ghi nhận"}.`,
      "",
      "Vui lòng xem file PDF đính kèm để đối chiếu thông tin nhiệm vụ, hàng hóa, phương tiện và nhân sự tham gia.",
      "",
      "Trân trọng,",
      "Ban điều phối cứu trợ",
    ].join("\n");

    const result = await sendManualEmail(fastify, {
      trigger: "RESCUE_REQUEST_APPROVED",
      to: recipientEmail,
      recipientName: rescueRequest.requesterName ?? rescueRequest.submittedBy?.name,
      recipientUserId: rescueRequest.submittedById,
      rescueRequestId: rescueRequest.id,
      subject,
      htmlBody: plainTextEmailToHtml(textBody),
      textBody,
      attachments: [{
        filename: `bien-ban-nhiem-vu-${mission.id.slice(0, 8).toUpperCase()}.pdf`,
        contentType: "application/pdf",
        contentBase64: pdf.base64,
      }],
      metadata: {
        manual: true,
        targetType: "mission-report",
        attachmentCount: 1,
        missionId: mission.id,
      },
    });

    const sent = result?.status === "SENT" ? 1 : 0;
    const failed = result?.status === "FAILED" ? 1 : 0;
    const skipped = !result || result.status === "SKIPPED" ? 1 : 0;
    return reply.status(201).send({ data: { sent, failed, skipped, results: [result] } });
  });
}
