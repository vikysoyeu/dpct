import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendAutomaticEmail } from "../services/emailService.js";
import { notifyAdminsByRoles } from "../services/notificationService.js";
import { normalizeRescueRequestContent } from "../utils/text.js";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$|^(0|\+84)2\d{9}$/;

const publicRequestSchema = z.object({
  requesterName: z.string().trim().min(2).max(100),
  requesterPhone: z.string().trim().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  requesterEmail: z.string().trim().email("Email không hợp lệ").max(160).optional().or(z.literal("")),
  requesterTitle: z.string().trim().min(2).max(120),
  needType: z.string().trim().min(2).max(300),
  content: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(z.object({
    itemCategoryId: z.string().trim().min(1),
    quantity: z.number().int().positive(),
  })).default([]),
  address: z.string().trim().min(3).max(300),
  lat: z.number().finite(),
  lng: z.number().finite(),
  preciseLat: z.number().finite().optional(),
  preciseLng: z.number().finite().optional(),
});

function emptyToNull(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function locationTypeForNeed(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("cứu hộ") || normalized.includes("cứu nạn") || normalized.includes("y tế")) return "URGENT_NEED";
  if (normalized.includes("ăn") || normalized.includes("thực phẩm") || normalized.includes("nước")) return "FOOD_SUPPORT";
  return "NEED_POINT";
}

function urgencyForNeed(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("khẩn") || normalized.includes("cứu hộ") || normalized.includes("cứu nạn")) return 5;
  if (normalized.includes("y tế") || normalized.includes("hàng hóa")) return 4;
  return 3;
}

function redactPrivateText(value?: string | null) {
  if (!value) return value ?? null;
  return value
    .split(/\r?\n/)
    .filter((line) => !/(cán bộ gửi|số điện thoại|sđt|email|người gửi|họ tên)/i.test(line))
    .join("\n")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[đã ẩn email]")
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, "[đã ẩn SĐT]")
    .trim();
}

function publicLocation(location: any) {
  if (!location) return null;
  const imageUrls = Array.from(
    new Set((location.locationUpdates ?? []).map((update: any) => update.imageUrl).filter((url: any): url is string => !!url))
  );
  return {
    id: location.id,
    type: location.type,
    status: location.status,
    priority: location.priority,
    name: location.name,
    description: redactPrivateText(location.description),
    lat: location.lat,
    lng: location.lng,
    urgency: location.urgency,
    imageUrls,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
    needs: location.needs ?? [],
  };
}

function publicMission(mission: any) {
  return {
    id: mission.id,
    locationId: mission.locationId,
    requestId: mission.requestId,
    name: mission.name,
    missionType: mission.missionType,
    priority: mission.priority,
    status: mission.status,
    notes: redactPrivateText(mission.notes),
    startedAt: mission.startedAt,
    endedAt: mission.endedAt,
    teamCount: mission.rescueTeams?.length ?? 0,
    memberCount: mission.rescueTeams?.reduce((total: number, team: any) => total + (team.members?.length ?? 0), 0) ?? 0,
  };
}

function publicRescueRequest(rescueRequest: any) {
  return {
    id: rescueRequest.id,
    code: rescueRequest.code,
    locationId: rescueRequest.locationId,
    name: rescueRequest.name,
    content: redactPrivateText(rescueRequest.content),
    priority: rescueRequest.priority,
    status: rescueRequest.status,
    submittedAt: rescueRequest.submittedAt,
    location: publicLocation(rescueRequest.location),
    requestItems: rescueRequest.requestItems ?? [],
    volunteerRequestCount: rescueRequest.volunteerRequestCount ?? rescueRequest._count?.volunteerRequests ?? rescueRequest.volunteerRequests?.length ?? 0,
    missionCount: rescueRequest.missionCount ?? rescueRequest._count?.missions ?? rescueRequest.missions?.length ?? 0,
    missions: rescueRequest.missions?.map(publicMission) ?? undefined,
  };
}

export default async function publicRescueRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  fastify.get("/rescue-requests", async (request) => {
    const { status } = request.query as { status?: string };
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;

    const [data, total] = await Promise.all([
      prisma.rescueRequest.findMany({
        where,
        include: {
          location: { include: { needs: true, locationUpdates: { orderBy: { createdAt: "desc" } } } },
          requestItems: { include: { itemCategory: true } },
        },
        orderBy: [{ submittedAt: "desc" }],
        take: 100,
      }),
      prisma.rescueRequest.count({ where }),
    ]);

    const requestIds = data.map((item: any) => item.id);
    const [volunteerCounts, missionCounts] = requestIds.length > 0
      ? await Promise.all([
        prisma.volunteerRequest.groupBy({
          by: ["requestId"],
          where: { requestId: { in: requestIds } },
          _count: { _all: true },
        }),
        prisma.mission.groupBy({
          by: ["requestId"],
          where: { requestId: { in: requestIds } },
          _count: { _all: true },
        }),
      ])
      : [[], []];
    const volunteerCountByRequest = new Map(volunteerCounts.map((item: any) => [item.requestId, item._count._all]));
    const missionCountByRequest = new Map(missionCounts.map((item: any) => [item.requestId, item._count._all]));

    return {
      data: data.map((item: any) => publicRescueRequest({
        ...item,
        volunteerRequestCount: volunteerCountByRequest.get(item.id) ?? 0,
        missionCount: missionCountByRequest.get(item.id) ?? 0,
      })),
      total,
    };
  });

  fastify.get("/rescue-requests/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const data = await prisma.rescueRequest.findUnique({
      where: { code },
      include: {
        location: { include: { needs: true, locationUpdates: { orderBy: { createdAt: "desc" } } } },
        requestItems: { include: { itemCategory: true } },
        missions: {
          include: {
            rescueTeams: { include: { members: true } },
          },
          orderBy: [{ startedAt: "asc" }, { name: "asc" }],
        },
      },
    });

    if (!data) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    const [volunteerRequestCount, missionCount] = await Promise.all([
      prisma.volunteerRequest.count({ where: { requestId: data.id } }),
      prisma.mission.count({ where: { requestId: data.id } }),
    ]);

    return { data: publicRescueRequest({ ...data, volunteerRequestCount, missionCount }) };
  });

  fastify.post("/rescue-requests", async (request, reply) => {
    const body = publicRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        message: "Dữ liệu yêu cầu cứu trợ không hợp lệ.",
        errors: body.error.flatten(),
      });
    }

    const input = body.data;
    const lat = input.preciseLat ?? input.lat;
    const lng = input.preciseLng ?? input.lng;
    const locationType = locationTypeForNeed(input.needType);
    const urgency = urgencyForNeed(input.needType);
    const requesterEmail = emptyToNull(input.requesterEmail);
    const requesterPhone = emptyToNull(input.requesterPhone);
    const rescueContent = normalizeRescueRequestContent(input.content);
    const itemQuantityByCategory = new Map<string, number>();
    for (const item of input.items) {
      itemQuantityByCategory.set(item.itemCategoryId, (itemQuantityByCategory.get(item.itemCategoryId) ?? 0) + item.quantity);
    }
    const requestItems = [...itemQuantityByCategory].map(([itemCategoryId, quantity]) => ({ itemCategoryId, quantity }));

    if (requestItems.length === 0 && !rescueContent) {
      return reply.status(400).send({ message: "Vui lòng chọn danh mục hàng hoặc nhập mô tả nhu cầu khác." });
    }

    const itemCategories = requestItems.length > 0
      ? await prisma.itemCategory.findMany({ where: { id: { in: requestItems.map((item) => item.itemCategoryId) } } })
      : [];
    const categoryById = new Map(itemCategories.map((item: any) => [item.id, item]));
    if (categoryById.size !== requestItems.length) {
      return reply.status(400).send({ message: "Danh mục hàng hóa không hợp lệ." });
    }

    const data = await prisma.$transaction(async (tx: any) => {
      const location = await tx.location.create({
        data: {
          type: locationType,
          status: "PENDING",
          priority: urgency >= 5 ? "KHAN_CAP" : urgency >= 4 ? "CAO" : "TRUNG_BINH",
          name: "Yêu cầu cứu trợ",
          description: input.address,
          lat,
          lng,
          urgency,
        },
      });

      const rescueRequest = await tx.rescueRequest.create({
        data: {
          locationId: location.id,
          name: "Yêu cầu cứu trợ",
          content: rescueContent,
          priority: urgency >= 5 ? "KHAN_CAP" : urgency >= 4 ? "CAO" : "TRUNG_BINH",
          status: "CHO_TIEP_NHAN",
          requesterName: input.requesterName,
          requesterPhone: input.requesterPhone,
          requesterEmail,
          requestItems: requestItems.length > 0
            ? {
                create: requestItems.map((item) => ({
                  itemCategoryId: item.itemCategoryId,
                  quantity: item.quantity,
                })),
              }
            : undefined,
        },
        include: { location: { include: { locationUpdates: true } }, requestItems: { include: { itemCategory: true } } },
      });
      const requestName = `Yêu cầu cứu trợ #${rescueRequest.code}`;
      await tx.location.update({
        where: { id: location.id },
        data: { name: requestName },
      });
      const renamedRequest = await tx.rescueRequest.update({
        where: { id: rescueRequest.id },
        data: { name: requestName },
        include: { location: { include: { locationUpdates: true } }, requestItems: { include: { itemCategory: true } } },
      });

      await tx.$executeRawUnsafe(
        `UPDATE "RescueRequest" SET "requesterTitle" = $1 WHERE "id" = $2`,
        input.requesterTitle,
        rescueRequest.id,
      );

      return renamedRequest;
    });

    await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
      type: "RESCUE_REQUEST_CREATED",
      title: "Có yêu cầu cứu trợ mới",
      message: `${data.requesterName} vừa gửi yêu cầu cứu trợ tại ${data.location?.description?.split("\n")[0] ?? "khu vực mới"}.`,
      link: `/admin/needs`,
      metadata: { rescueRequestId: data.id, locationId: data.locationId, priority: data.priority },
    });

    await sendAutomaticEmail(fastify, {
      trigger: "RESCUE_REQUEST_SUBMITTED",
      to: requesterEmail,
      recipientName: data.requesterName,
      rescueRequestId: data.id,
      idempotencyKey: `rescue-request-submitted:${data.id}`,
      variables: {
        requestCode: data.code,
        content: rescueContent,
        address: input.address,
        priority: data.priority,
        requesterName: input.requesterName,
        requesterPhone: requesterPhone,
        requesterEmail: requesterEmail,
        requesterTitle: input.requesterTitle,
        needType: input.needType,
        items: requestItems.map((item) => {
          const category = categoryById.get(item.itemCategoryId) as any;
          return category ? `${category.name}: ${item.quantity} ${category.unit}` : "";
        }).filter(Boolean).join("\n"),
        coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      },
      metadata: { locationId: data.locationId },
    });

    return reply.status(201).send({ data });
  });
}
