import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { FastifyInstance } from "fastify";
import { sendAutomaticEmail } from "../services/emailService.js";
import { notifyAdminsByRoles } from "../services/notificationService.js";

const SEPAY_ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER ?? "0000000000";
const SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE ?? "MB";
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME ?? "QUY CUU TRO";
const SEPAY_QR_BASE = "https://qr.sepay.vn/img";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$|^(0|\+84)2\d{9}$/;

type CreateDonationBody = {
  donorKind: "INDIVIDUAL" | "DONOR";
  donorId?: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  amount: number;
};

type CreateSponsorshipBody = {
  donorMode: "NEW" | "EXISTING";
  donorId?: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  donorAddress?: string;
  donorType?: string;
  donorNotes?: string;
  requestId?: string;
  goods?: Array<{
    itemCategoryId?: string;
    quantity?: number;
    description?: string;
  }>;
};

type SepayWebhookPayload = {
  id: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string;
  code?: string | null;
  content?: string;
  transferType?: "in" | "out" | string;
  description?: string;
  transferAmount?: number;
  accumulated?: number;
  referenceCode?: string;
};

type AdminFundTransactionBody = {
  donorId?: string | null;
  donorName?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  requestId?: string | null;
  type?: "THU" | "CHI";
  method?: "BANK_TRANSFER" | "CASH";
  amount?: number | string;
  transactedAt?: string;
  content?: string | null;
  status?: "THANH_CONG" | "THAT_BAI" | "CHO_DOI_SOAT";
  notes?: string | null;
  sepayId?: string | null;
};

function toTransactionDto(transaction: any) {
  return {
    ...transaction,
    amount: transaction.amount?.toString?.() ?? String(transaction.amount ?? 0),
  };
}

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function rescueRequestLabel(item: { id: string; code?: string | null }) {
  return `Yêu cầu cứu trợ #${item.code || item.id.slice(0, 5).toUpperCase()}`;
}

function parseFundTransactionInput(body: AdminFundTransactionBody, current?: any) {
  const type = body.type ?? current?.type;
  const method = body.method ?? current?.method ?? "BANK_TRANSFER";
  const status = body.status ?? current?.status ?? "THANH_CONG";
  const amount = body.amount === undefined ? Number(current?.amount ?? 0) : Number(body.amount);
  const transactedAt = body.transactedAt === undefined ? new Date(current?.transactedAt ?? Date.now()) : new Date(body.transactedAt);

  if (type !== "THU" && type !== "CHI") {
    throw new Error("Loại giao dịch không hợp lệ.");
  }

  if (method !== "BANK_TRANSFER" && method !== "CASH") {
    throw new Error("Phương thức giao dịch không hợp lệ.");
  }

  if (status !== "THANH_CONG" && status !== "THAT_BAI" && status !== "CHO_DOI_SOAT") {
    throw new Error("Trạng thái giao dịch không hợp lệ.");
  }

  if (!Number.isInteger(amount) || amount <= 0 || amount > 999_999_999_999) {
    throw new Error("Số tiền giao dịch không hợp lệ.");
  }

  if (Number.isNaN(transactedAt.getTime())) {
    throw new Error("Thời gian giao dịch không hợp lệ.");
  }

  return {
    donorId: body.donorId === undefined ? current?.donorId ?? null : cleanText(body.donorId),
    donorName: body.donorName === undefined ? current?.donorName ?? null : cleanText(body.donorName),
    donorPhone: (() => {
      const phone = body.donorPhone === undefined ? current?.donorPhone ?? null : cleanText(body.donorPhone);
      if (phone && !PHONE_REGEX.test(phone.replace(/\s+/g, ""))) {
        throw new Error("Số điện thoại không hợp lệ.");
      }
      return phone;
    })(),
    donorEmail: (() => {
      const email = body.donorEmail === undefined ? current?.donorEmail ?? null : cleanText(body.donorEmail);
      if (email && !EMAIL_REGEX.test(email)) {
        throw new Error("Email không hợp lệ.");
      }
      return email;
    })(),
    requestId: body.requestId === undefined ? current?.requestId ?? null : cleanText(body.requestId),
    sepayId: body.sepayId === undefined ? current?.sepayId ?? null : cleanText(body.sepayId),
    type,
    method,
    amount,
    transactedAt,
    content: body.content === undefined ? current?.content ?? null : cleanText(body.content),
    status,
    notes: body.notes === undefined ? current?.notes ?? null : cleanText(body.notes),
  };
}

function buildPaymentCode() {
  return `DPCT${new Date().toISOString().slice(2, 10).replaceAll("-", "")}${randomBytes(3).toString("hex").toUpperCase()}`;
}

function buildQrUrl(amount: number, paymentCode: string) {
  const params = new URLSearchParams({
    acc: SEPAY_ACCOUNT_NUMBER,
    bank: SEPAY_BANK_CODE,
    amount: String(amount),
    des: paymentCode,
  });

  return `${SEPAY_QR_BASE}?${params.toString()}`;
}

function verifyApiKey(authorization?: string) {
  const expected = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!expected || expected === "change_me") return true;
  const actual = authorization?.startsWith("Apikey ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export default async function fundRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  fastify.get("/donors", async () => {
    const [donors, total] = await Promise.all([
      prisma.donor.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.donor.count(),
    ]);

    const donorIds = donors.map((donor) => donor.id);
    const goods = donorIds.length > 0
      ? await prisma.donorGoods.findMany({
        where: { donorId: { in: donorIds } },
        include: { itemCategory: true },
        orderBy: [{ donorId: "asc" }, { itemCategoryId: "asc" }],
      })
      : [];
    const goodsByDonor = new Map<string, any[]>();
    for (const item of goods) {
      goodsByDonor.set(item.donorId, [...(goodsByDonor.get(item.donorId) ?? []), item]);
    }

    const data = donors.map((donor) => ({
      ...donor,
      goods: goodsByDonor.get(donor.id) ?? [],
    }));

    return { data, total };
  });

  fastify.get("/item-categories", async () => {
    const [data, total] = await Promise.all([
      prisma.itemCategory.findMany({ orderBy: [{ groupName: "asc" }, { name: "asc" }] }),
      prisma.itemCategory.count(),
    ]);

    return { data, total };
  });

  fastify.post("/sponsorships", async (request, reply) => {
    const body = request.body as CreateSponsorshipBody;
    if (body.donorMode === "NEW") {
      const donorPhone = body.donorPhone?.trim();
      const donorEmail = body.donorEmail?.trim();
      if (donorPhone && !PHONE_REGEX.test(donorPhone.replace(/\s+/g, ""))) {
        return reply.status(400).send({ message: "Số điện thoại không hợp lệ." });
      }
      if (donorEmail && !EMAIL_REGEX.test(donorEmail)) {
        return reply.status(400).send({ message: "Email không hợp lệ." });
      }
    }
    const goods = (body.goods ?? [])
      .map((item) => ({
        itemCategoryId: item.itemCategoryId?.trim(),
        quantity: Number(item.quantity),
        description: item.description?.trim() ?? "",
      }))
      .filter((item) => item.itemCategoryId && Number.isInteger(item.quantity) && item.quantity > 0);

    if (goods.length === 0) {
      return reply.status(400).send({ message: "Vui lòng nhập ít nhất một loại hàng hóa tài trợ." });
    }

    const itemCategories = await prisma.itemCategory.findMany({
      where: { id: { in: goods.map((item) => item.itemCategoryId!) } },
    });
    const categoryById = new Map(itemCategories.map((item) => [item.id, item]));
    if (categoryById.size !== new Set(goods.map((item) => item.itemCategoryId)).size) {
      return reply.status(400).send({ message: "Danh mục hàng hóa không hợp lệ." });
    }

    let rescueRequest: any = null;
    if (body.requestId) {
      rescueRequest = await prisma.rescueRequest.findUnique({ where: { id: body.requestId }, include: { location: true } });
      if (!rescueRequest) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    }

    const goodsSummary = goods.map((item) => {
      const category = categoryById.get(item.itemCategoryId!)!;
      return `- ${category.name}: ${item.quantity} ${category.unit}${item.description ? ` - ${item.description}` : ""}`;
    }).join("\n");
    const requestLabel = rescueRequest ? rescueRequestLabel(rescueRequest) : "Không chỉ định";

    const data = await prisma.$transaction(async (tx: any) => {
      let donor: any;
      if (body.donorMode === "EXISTING") {
        if (!body.donorId) throw new Error("Vui lòng chọn nhà tài trợ.");
        donor = await tx.donor.findUnique({ where: { id: body.donorId } });
        if (!donor) throw new Error("Không tìm thấy nhà tài trợ.");
      } else {
        const donorName = body.donorName?.trim();
        if (!donorName) throw new Error("Vui lòng nhập tên nhà tài trợ.");
        donor = await tx.donor.create({
          data: {
            name: donorName,
            phone: body.donorPhone?.trim() || null,
            email: body.donorEmail?.trim() || null,
            address: body.donorAddress?.trim() || null,
            type: body.donorType?.trim() || null,
            notes: body.donorNotes?.trim() || null,
          },
        });
      }

      const sponsorshipNote = [
        `Tài trợ hàng hóa ${new Date().toISOString()}`,
        rescueRequest ? `Yêu cầu cứu trợ: ${rescueRequestLabel(rescueRequest)}` : "Yêu cầu cứu trợ: Không chỉ định",
        goodsSummary,
      ].join("\n");

      await tx.donor.update({
        where: { id: donor.id },
        data: { notes: [donor.notes, sponsorshipNote].filter(Boolean).join("\n\n") },
      });

      const mergedGoods = new Map<string, { quantity: number; unit: string }>();
      for (const item of goods) {
        const category = categoryById.get(item.itemCategoryId!)!;
        const current = mergedGoods.get(category.id);
        mergedGoods.set(category.id, {
          quantity: (current?.quantity ?? 0) + item.quantity,
          unit: category.unit,
        });
      }

      for (const [itemCategoryId, item] of mergedGoods) {
        const existingGoods = await tx.donorGoods.findUnique({
          where: { donorId_itemCategoryId: { donorId: donor.id, itemCategoryId } },
        });

        if (!existingGoods) {
          await tx.donorGoods.create({
            data: {
              donorId: donor.id,
              itemCategoryId,
              quantity: item.quantity,
              unit: item.unit,
              status: "CHO_TIEP_NHAN",
            },
          });
          continue;
        }

        await tx.donorGoods.update({
          where: { donorId_itemCategoryId: { donorId: donor.id, itemCategoryId } },
          data: {
            quantity: existingGoods.status === "HOAN_THANH" ? item.quantity : { increment: item.quantity },
            unit: item.unit,
            status: "CHO_TIEP_NHAN",
          },
        });
      }

      return tx.donor.findUnique({
        where: { id: donor.id },
        include: { goods: { include: { itemCategory: true } } },
      });
    });

    await notifyAdminsByRoles(fastify, ["ADMIN_KHO"], {
      type: "SPONSORSHIP_CREATED",
      title: "Có yêu cầu tài trợ hàng hóa",
      message: `${data?.name ?? "Nhà tài trợ"} vừa gửi ${goods.length} loại hàng hóa tài trợ.`,
      link: "/admin/inventory",
      metadata: { donorId: data?.id, goodsCount: goods.length, requestId: body.requestId ?? null },
    });

    await sendAutomaticEmail(fastify, {
      trigger: "SPONSORSHIP_SUBMITTED",
      to: data?.email,
      recipientName: data?.name,
      donorId: data?.id,
      rescueRequestId: body.requestId ?? null,
      idempotencyKey: `sponsorship-submitted:${data?.id}:${Date.now()}`,
      variables: {
        goodsSummary,
        requestLabel,
        donorName: data?.name ?? "",
        donorPhone: data?.phone ?? "",
        donorEmail: data?.email ?? "",
        donorAddress: data?.address ?? "",
        donorType: data?.type ?? "",
      },
      metadata: { goodsCount: goods.length, requestId: body.requestId ?? null },
    });

    return reply.status(201).send({ data });
  });

  fastify.post("/fund/donations", async (request, reply) => {
    const body = request.body as CreateDonationBody;
    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount <= 0 || amount > 499_000_000) {
      return reply.status(400).send({ message: "Số tiền quyên góp phải từ 1đ đến 499.000.000đ." });
    }

    let donorName = body.donorName?.trim();
    let donorPhone = body.donorPhone?.trim();
    let donorEmail = body.donorEmail?.trim();
    let donorId: string | undefined;

    if (body.donorKind === "DONOR") {
      if (!body.donorId) {
        return reply.status(400).send({ message: "Vui lòng chọn nhà tài trợ." });
      }

      const donor = await prisma.donor.findUnique({ where: { id: body.donorId } });
      if (!donor) {
        return reply.status(404).send({ message: "Không tìm thấy nhà tài trợ." });
      }

      donorId = donor.id;
      donorName = donor.name;
      donorPhone = donor.phone ?? undefined;
      donorEmail = donor.email ?? undefined;
    } else {
      if (!donorName || !donorPhone) {
        return reply.status(400).send({ message: "Vui lòng nhập họ tên và số điện thoại." });
      }
      if (!PHONE_REGEX.test(donorPhone.replace(/\s+/g, ""))) {
        return reply.status(400).send({ message: "Số điện thoại không hợp lệ." });
      }
      if (donorEmail && !EMAIL_REGEX.test(donorEmail)) {
        return reply.status(400).send({ message: "Email không hợp lệ." });
      }
    }

    const paymentCode = buildPaymentCode();
    const notes = body.donorKind === "DONOR" ? "Quyên góp từ nhà tài trợ" : "Quyên góp cá nhân";
    const [transaction] = await prisma.$queryRaw<any[]>`
      INSERT INTO "FundTransaction" (
        "id",
        "donorId",
        "donorName",
        "donorPhone",
        "donorEmail",
        "type",
        "method",
        "amount",
        "content",
        "status",
        "notes",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${donorId ?? null},
        ${donorName ?? null},
        ${donorPhone ?? null},
        ${donorEmail ?? null},
        'THU'::"TransactionType",
        'BANK_TRANSFER'::"TransactionMethod",
        ${amount},
        ${paymentCode},
        'CHO_DOI_SOAT'::"TransactionStatus",
        ${notes},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    await notifyAdminsByRoles(fastify, ["ADMIN_KHO"], {
      type: "DONATION_CREATED",
      title: "Có quyên góp chờ đối soát",
      message: `${donorName ?? "Người quyên góp"} tạo khoản quyên góp ${amount.toLocaleString("vi-VN")}đ.`,
      link: "/admin/fund",
      metadata: { transactionId: transaction.id, amount },
    });

    return reply.status(201).send({
      data: toTransactionDto(transaction),
      payment: {
        qrUrl: buildQrUrl(amount, paymentCode),
        code: paymentCode,
        accountNumber: SEPAY_ACCOUNT_NUMBER,
        bank: SEPAY_BANK_CODE,
        accountName: SEPAY_ACCOUNT_NAME,
      },
    });
  });

  fastify.get("/fund/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [transaction] = await prisma.$queryRaw<any[]>`
      SELECT ft.*, d."name" AS "linkedDonorName"
      FROM "FundTransaction" ft
      LEFT JOIN "Donor" d ON d."id" = ft."donorId"
      WHERE ft."id" = ${id}
      LIMIT 1
    `;

    if (!transaction) {
      return reply.status(404).send({ message: "Không tìm thấy giao dịch quỹ." });
    }

    return { data: toTransactionDto({ ...transaction, donorName: transaction.donorName ?? transaction.linkedDonorName }) };
  });

  fastify.get("/admin/fund", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async () => {
    const [transactions, incomeRows, outcomeRows] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT ft.*, d."name" AS "linkedDonorName"
        FROM "FundTransaction" ft
        LEFT JOIN "Donor" d ON d."id" = ft."donorId"
        ORDER BY ft."transactedAt" DESC
        LIMIT 100
      `,
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COALESCE(SUM("amount"), 0)::bigint AS total
        FROM "FundTransaction"
        WHERE "type" = 'THU'::"TransactionType" AND "status" = 'THANH_CONG'::"TransactionStatus"
      `,
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COALESCE(SUM("amount"), 0)::bigint AS total
        FROM "FundTransaction"
        WHERE "type" = 'CHI'::"TransactionType" AND "status" = 'THANH_CONG'::"TransactionStatus"
      `,
    ]);

    const totalIn = incomeRows[0]?.total ?? BigInt(0);
    const totalOut = outcomeRows[0]?.total ?? BigInt(0);

    return {
      data: {
        totalIn: totalIn.toString(),
        totalOut: totalOut.toString(),
        balance: (totalIn - totalOut).toString(),
        transactions: transactions.map((transaction) =>
          toTransactionDto({ ...transaction, donorName: transaction.donorName ?? transaction.linkedDonorName }),
        ),
      },
    };
  });

  fastify.post("/admin/fund/transactions", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request, reply) => {
    let input: ReturnType<typeof parseFundTransactionInput>;
    try {
      input = parseFundTransactionInput(request.body as AdminFundTransactionBody);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Dữ liệu giao dịch không hợp lệ." });
    }

    if (input.donorId) {
      const donor = await prisma.donor.findUnique({ where: { id: input.donorId } });
      if (!donor) return reply.status(404).send({ message: "Không tìm thấy nhà tài trợ." });
    }

    if (input.requestId) {
      const rescueRequest = await prisma.rescueRequest.findUnique({ where: { id: input.requestId } });
      if (!rescueRequest) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    }

    try {
      const [transaction] = await prisma.$queryRaw<any[]>`
        INSERT INTO "FundTransaction" (
          "id", "donorId", "donorName", "donorPhone", "donorEmail", "requestId", "sepayId",
          "type", "method", "amount", "transactedAt", "content", "status", "notes", "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${input.donorId}, ${input.donorName}, ${input.donorPhone}, ${input.donorEmail}, ${input.requestId}, ${input.sepayId},
          ${input.type}::"TransactionType", ${input.method}::"TransactionMethod", ${input.amount}, ${input.transactedAt}, ${input.content},
          ${input.status}::"TransactionStatus", ${input.notes}, NOW(), NOW()
        )
        RETURNING *
      `;

      return reply.status(201).send({ data: toTransactionDto(transaction) });
    } catch (error: any) {
      if (error?.code === "P2010" || error?.meta?.code === "23505") {
        return reply.status(409).send({ message: "Mã SePay đã tồn tại." });
      }
      throw error;
    }
  });

  fastify.patch("/admin/fund/transactions/:id", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [current] = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM "FundTransaction"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    if (!current) {
      return reply.status(404).send({ message: "Không tìm thấy giao dịch quỹ." });
    }

    let input: ReturnType<typeof parseFundTransactionInput>;
    try {
      input = parseFundTransactionInput(request.body as AdminFundTransactionBody, current);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Dữ liệu giao dịch không hợp lệ." });
    }

    if (input.donorId) {
      const donor = await prisma.donor.findUnique({ where: { id: input.donorId } });
      if (!donor) return reply.status(404).send({ message: "Không tìm thấy nhà tài trợ." });
    }

    if (input.requestId) {
      const rescueRequest = await prisma.rescueRequest.findUnique({ where: { id: input.requestId } });
      if (!rescueRequest) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    }

    try {
      const [transaction] = await prisma.$queryRaw<any[]>`
        UPDATE "FundTransaction"
        SET
          "donorId" = ${input.donorId},
          "donorName" = ${input.donorName},
          "donorPhone" = ${input.donorPhone},
          "donorEmail" = ${input.donorEmail},
          "requestId" = ${input.requestId},
          "sepayId" = ${input.sepayId},
          "type" = ${input.type}::"TransactionType",
          "method" = ${input.method}::"TransactionMethod",
          "amount" = ${input.amount},
          "transactedAt" = ${input.transactedAt},
          "content" = ${input.content},
          "status" = ${input.status}::"TransactionStatus",
          "notes" = ${input.notes},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING *
      `;

      return { data: toTransactionDto(transaction) };
    } catch (error: any) {
      if (error?.code === "P2010" || error?.meta?.code === "23505") {
        return reply.status(409).send({ message: "Mã SePay đã tồn tại." });
      }
      throw error;
    }
  });

  fastify.delete("/admin/fund/transactions/:id", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await prisma.fundTransaction.deleteMany({ where: { id } });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: "Không tìm thấy giao dịch quỹ." });
    }

    return reply.status(204).send();
  });

  fastify.post("/webhooks/sepay", async (request, reply) => {
    const auth = request.headers.authorization;

    if (!verifyApiKey(auth)) {
      return reply.status(401).send({ success: false, message: "Unauthorized" });
    }

    const payload = request.body as SepayWebhookPayload;
    const sepayId = String(payload.id ?? "");
    const code = payload.code ?? payload.content?.match(/DPCT[0-9A-F]{12}/i)?.[0];
    const transferAmount = Number(payload.transferAmount ?? 0);

    if (!sepayId || payload.transferType !== "in" || !code) {
      return { success: true };
    }

    const existingBySepayId = await prisma.fundTransaction.findUnique({ where: { sepayId } });
    if (existingBySepayId) {
      return { success: true };
    }

    const pending = await prisma.fundTransaction.findFirst({
      where: { content: code, status: "CHO_DOI_SOAT" },
    });

    if (!pending) {
      return { success: true };
    }

    const updated = await prisma.fundTransaction.update({
      where: { id: pending.id },
      data: {
        sepayId,
        status: transferAmount === Number(pending.amount) ? "THANH_CONG" : "CHO_DOI_SOAT",
        transactedAt: payload.transactionDate ? new Date(payload.transactionDate.replace(" ", "T")) : new Date(),
        notes: [
          pending.notes,
          `SePay ${payload.gateway ?? ""} ${payload.referenceCode ?? ""}`.trim(),
          payload.description,
          payload.content,
          transferAmount !== Number(pending.amount) ? `Số tiền webhook: ${transferAmount}` : undefined,
        ].filter(Boolean).join("\n"),
      },
    });

    if (updated.status === "THANH_CONG") {
      await notifyAdminsByRoles(fastify, ["ADMIN_KHO"], {
        type: "DONATION_CONFIRMED",
        title: "Quyên góp đã thanh toán",
        message: `Giao dịch ${updated.content ?? updated.id} đã nhận đủ ${Number(updated.amount).toLocaleString("vi-VN")}đ.`,
        link: "/admin/fund",
        metadata: { transactionId: updated.id, amount: updated.amount.toString(), sepayId },
      });
      await sendAutomaticEmail(fastify, {
        trigger: "DONATION_CONFIRMED",
        to: updated.donorEmail,
        recipientName: updated.donorName,
        fundTransactionId: updated.id,
        donorId: updated.donorId,
        idempotencyKey: `donation-confirmed:${updated.id}`,
        variables: {
          amount: `${Number(updated.amount).toLocaleString("vi-VN")}đ`,
          transactionCode: updated.content ?? updated.id.slice(0, 8).toUpperCase(),
          donorName: updated.donorName ?? "",
          donorPhone: updated.donorPhone ?? "",
          donorEmail: updated.donorEmail ?? "",
          transactedAt: updated.transactedAt?.toLocaleString?.("vi-VN") ?? "",
        },
        metadata: { sepayId },
      });
    }

    return { success: true };
  });
}
