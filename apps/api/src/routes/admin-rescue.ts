import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendAutomaticEmail } from "../services/emailService.js";
import { notifyAdminsByRoles, notifyUsers, statusLabel } from "../services/notificationService.js";
import { normalizeRescueRequestContent } from "../utils/text.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

const REQUEST_STATUSES = ["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"] as const;
const MISSION_STATUSES = ["CHO_TIEP_NHAN", "DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"] as const;
const MISSION_CREATE_REQUEST_STATUSES = new Set(["DANG_THUC_HIEN"]);
const TEAM_CREATE_REQUEST_STATUSES = new Set(["DANG_THUC_HIEN"]);
const TEAM_CREATE_MISSION_STATUSES = new Set(["DANG_TUYEN", "DA_DU_DOI", "DA_DU_HANG", "SAN_SANG"]);
const REQUEST_APPROVED_STATUSES = new Set(["DANG_THUC_HIEN"]);

const requestSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1).max(160),
  content: z.string().max(2000).optional().or(z.literal("")),
  items: z.array(z.object({
    itemCategoryId: z.string().trim().min(1),
    quantity: z.number().int().positive(),
  })).optional(),
  priority: z.enum(["THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"]).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  requesterName: z.string().max(100).optional().or(z.literal("")),
  requesterPhone: z.string().max(20).optional().or(z.literal("")),
  requesterEmail: z.string().email().max(160).optional().or(z.literal("")),
  requesterTitle: z.string().max(120).optional().or(z.literal("")),
});

const requestUpdateSchema = requestSchema.partial();

const transportationSchema = z.object({
  vehicleType: z.string().max(120),
  vehiclePlate: z.string().max(50),
  driverName: z.string().max(100),
  driverPhone: z.string().max(20),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

const missionSchema = z.object({
  name: z.string().min(1).max(160),
  missionType: z.string().max(100).optional().or(z.literal("")),
  priority: z.enum(["THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"]).optional(),
  status: z.enum(MISSION_STATUSES).optional(),
  startedAt: z.string().datetime().optional().or(z.literal("")),
  endedAt: z.string().datetime().optional().or(z.literal("")),
  transportations: z.array(transportationSchema).optional(),
});

const missionUpdateSchema = missionSchema.partial();

const memberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["DOI_TRUONG", "DOI_PHO", "THANH_VIEN", "CONG_TAC_VIEN"]).default("THANH_VIEN"),
});

const createTeamSchema = z.object({
  requestId: z.string().min(1).optional(),
  missionId: z.string().min(1).optional(),
  teamName: z.string().min(1).max(160),
  type: z.string().max(100).optional().or(z.literal("")),
  memberIds: z.array(z.string().min(1)).default([]),
  members: z.array(memberSchema).default([]),
  externalMembers: z.array(z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(8).max(20),
    skills: z.array(z.string().min(1).max(50)).default([]),
    role: z.enum(["DOI_TRUONG", "DOI_PHO", "THANH_VIEN", "CONG_TAC_VIEN"]).default("THANH_VIEN"),
  })).default([]),
});

const volunteerAccountSchema = z.object({
  username: z.string().min(3).max(50).optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  status: z.enum(["AVAILABLE", "ON_MISSION", "RESTING"]).optional(),
  accountStatus: z.enum(["HOAT_DONG", "TAM_DUNG", "KHOA", "CHO_DUYET"]).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  city: z.string().max(100).optional().or(z.literal("")),
  ward: z.string().max(100).optional().or(z.literal("")),
  roleIds: z.array(z.number().int()).optional(),
});

function emptyToNull(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function rescueContentOrNull(value?: string) {
  const normalized = normalizeRescueRequestContent(value);
  return normalized || null;
}

function optionalDate(value?: string) {
  return value && value.trim() ? new Date(value) : null;
}

function missionDataFromInput(input: z.infer<typeof missionSchema>) {
  const data: Record<string, unknown> = {
    name: input.name,
    missionType: emptyToNull(input.missionType),
    priority: input.priority ?? "TRUNG_BINH",
    status: input.status ?? "DANG_TUYEN",
  };
  if (input.startedAt !== undefined) data.startedAt = optionalDate(input.startedAt);
  if (input.endedAt !== undefined) data.endedAt = optionalDate(input.endedAt);
  return data;
}

function locationAddress(location?: { description?: string | null; name?: string | null } | null) {
  const line = location?.description?.split("\n").find((item) => item.startsWith("Địa chỉ xác nhận:"));
  return line?.replace("Địa chỉ xác nhận:", "").trim() || location?.description?.split("\n")[0]?.trim() || location?.name || "Chưa cập nhật";
}

function requesterTitleFromLocation(location?: { description?: string | null } | null) {
  const line = location?.description?.split("\n").find((item) => item.startsWith("Cán bộ gửi:"));
  const title = line?.split(" - ").slice(1).join(" - ").trim();
  return title || null;
}

function teamMemberRoleLabel(role: string) {
  const labels: Record<string, string> = {
    DOI_TRUONG: "Đội trưởng",
    DOI_PHO: "Đội phó",
    THANH_VIEN: "Thành viên",
    CONG_TAC_VIEN: "Cộng tác viên",
  };
  return labels[role] ?? role;
}

function rescueRequestLabel(item: { id: string; code?: string | null }) {
  return `Yêu cầu cứu trợ #${item.code || item.id.slice(0, 5).toUpperCase()}`;
}

function missionStatusAfterTeamReady(currentStatus: string, hasGoods: boolean) {
  if (hasGoods || currentStatus === "DA_DU_HANG" || currentStatus === "SAN_SANG") return "SAN_SANG";
  return "DA_DU_DOI";
}

function missionStatusAfterTeamSave(currentStatus: string, hasTeam: boolean, hasGoods: boolean) {
  if (["DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"].includes(currentStatus)) return currentStatus;
  if (hasTeam) return missionStatusAfterTeamReady(currentStatus, hasGoods);
  if (hasGoods) return "DA_DU_HANG";
  if (["DA_DU_DOI", "SAN_SANG"].includes(currentStatus)) return "DANG_TUYEN";
  return currentStatus;
}

function mergeRequestItems(items: Array<{ itemCategoryId: string; quantity: number }>) {
  const quantityByCategory = new Map<string, number>();
  for (const item of items) {
    quantityByCategory.set(item.itemCategoryId, (quantityByCategory.get(item.itemCategoryId) ?? 0) + item.quantity);
  }
  return [...quantityByCategory].map(([itemCategoryId, quantity]) => ({ itemCategoryId, quantity }));
}

function normalizeRescueTeam(team: any) {
  if (!team) return team;
  return {
    ...team,
    members: (team.members ?? []).map((member: any) => ({ ...member, user: volunteerDto(member.user) })),
  };
}

function normalizeMission(mission: any) {
  if (!mission) return mission;
  return {
    ...mission,
    rescueTeams: (mission.rescueTeams ?? []).map(normalizeRescueTeam),
  };
}

function normalizeRescueRequest(data: any) {
  if (!data) return data;
  return {
    ...data,
    volunteerRequests: (data.volunteerRequests ?? []).map((item: any) => ({ ...item, volunteer: volunteerDto(item.volunteer) })),
    missions: (data.missions ?? []).map(normalizeMission),
  };
}

async function validateRequestItems(prisma: any, items: Array<{ itemCategoryId: string; quantity: number }>) {
  if (items.length === 0) return { ok: true };
  const categories = await prisma.itemCategory.findMany({ where: { id: { in: items.map((item) => item.itemCategoryId) } } });
  if (categories.length !== items.length) return { ok: false, message: "Danh mục hàng hóa không hợp lệ." };
  return { ok: true };
}

export default async function adminRescueRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;
  const requireRescueRequests = fastify.requireAdminRole(["ADMIN_YCCT", "ADMIN_TNV"]);
  const requireResources = fastify.requireAdminRole(["ADMIN_TNV", "ADMIN_YCCT"]);
  const requirePermissionAdmin = fastify.requireAdminRole(["ADMIN"]);

  const requestInclude = {
    location: { include: { needs: true } },
    requestItems: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
    submittedBy: { select: { id: true, name: true, phone: true, email: true, role: true } },
    volunteerRequests: {
      include: {
        volunteer: {
          select: {
            ...volunteerSelect(false),
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    },
    missions: {
      include: {
        rescueTeams: {
          include: {
            members: {
              include: {
                user: {
                  select: volunteerSelect(false),
                },
              },
              orderBy: { joinedAt: "asc" },
            },
          },
        },
        transportations: true,
        itemAssignments: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
      },
      orderBy: { startedAt: "desc" },
    },
  };

  fastify.get("/admin/rescue-requests", { preHandler: [requireRescueRequests] }, async (request) => {
    const { status, q } = request.query as { status?: string; q?: string };
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { requesterName: { contains: q, mode: "insensitive" } },
        { requesterPhone: { contains: q, mode: "insensitive" } },
        { location: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.rescueRequest.findMany({
        where,
        include: requestInclude,
        orderBy: [{ priority: "desc" }, { submittedAt: "desc" }],
      }),
      prisma.rescueRequest.count({ where }),
    ]);

    return { data: data.map(normalizeRescueRequest), total };
  });

  fastify.get("/admin/rescue-requests/:id", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await prisma.rescueRequest.findUnique({ where: { id }, include: requestInclude });
    if (!data) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    return { data: normalizeRescueRequest(data) };
  });

  fastify.post("/admin/rescue-requests", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const body = requestSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu yêu cầu không hợp lệ.", errors: body.error.flatten() });

    const location = await prisma.location.findUnique({ where: { id: body.data.locationId } });
    if (!location) return reply.status(404).send({ message: "Không tìm thấy địa điểm." });
    const requestItems = mergeRequestItems(body.data.items ?? []);
    const validItems = await validateRequestItems(prisma, requestItems);
    if (!validItems.ok) return reply.status(400).send({ message: validItems.message });

    const data = await prisma.rescueRequest.create({
      data: {
        locationId: body.data.locationId,
        name: body.data.name,
        content: rescueContentOrNull(body.data.content),
        priority: body.data.priority ?? "TRUNG_BINH",
        status: body.data.status ?? "CHO_TIEP_NHAN",
        requesterName: emptyToNull(body.data.requesterName),
        requesterPhone: emptyToNull(body.data.requesterPhone),
        requesterEmail: emptyToNull(body.data.requesterEmail),
        requestItems: requestItems.length > 0 ? { create: requestItems } : undefined,
      },
      include: requestInclude,
    });
    if (body.data.requesterTitle !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "RescueRequest" SET "requesterTitle" = $1 WHERE "id" = $2`,
        emptyToNull(body.data.requesterTitle),
        data.id,
      );
    }

    await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
      type: "RESCUE_REQUEST_CREATED",
      title: "Có yêu cầu cứu trợ mới",
      message: `${data.name} vừa được tạo bởi điều phối viên.`,
      link: `/admin/needs`,
      metadata: { rescueRequestId: data.id, locationId: data.locationId, priority: data.priority },
    });

    return reply.status(201).send({ data: normalizeRescueRequest(data) });
  });

  fastify.patch("/admin/rescue-requests/:id", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = requestUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu cập nhật không hợp lệ.", errors: body.error.flatten() });

    const input = body.data;
    const data: Record<string, unknown> = {};
    if (input.locationId !== undefined) data.locationId = input.locationId;
    if (input.name !== undefined) data.name = input.name;
    if (input.content !== undefined) data.content = rescueContentOrNull(input.content);
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.requesterName !== undefined) data.requesterName = emptyToNull(input.requesterName);
    if (input.requesterPhone !== undefined) data.requesterPhone = emptyToNull(input.requesterPhone);
    if (input.requesterEmail !== undefined) data.requesterEmail = emptyToNull(input.requesterEmail);
    if (input.locationId !== undefined) {
      const location = await prisma.location.findUnique({ where: { id: input.locationId } });
      if (!location) return reply.status(404).send({ message: "Không tìm thấy địa điểm." });
    }

    const requestItems = input.items !== undefined ? mergeRequestItems(input.items) : null;
    if (requestItems) {
      const validItems = await validateRequestItems(prisma, requestItems);
      if (!validItems.ok) return reply.status(400).send({ message: validItems.message });
    }

    const existing = await prisma.rescueRequest.findUnique({ where: { id }, include: { submittedBy: true } });
    const updated = await prisma.$transaction(async (tx: any) => {
      if (requestItems) {
        await tx.rescueRequestItem.deleteMany({ where: { rescueRequestId: id } });
        if (requestItems.length > 0) {
          await tx.rescueRequestItem.createMany({
            data: requestItems.map((item) => ({ rescueRequestId: id, ...item })),
          });
        }
      }
      if (input.locationId !== undefined) {
        await tx.mission.updateMany({ where: { requestId: id }, data: { locationId: input.locationId } });
      }
      return tx.rescueRequest.update({ where: { id }, data, include: requestInclude });
    });
    if (input.requesterTitle !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "RescueRequest" SET "requesterTitle" = $1 WHERE "id" = $2`,
        emptyToNull(input.requesterTitle),
        updated.id,
      );
    }

    if (input.status && existing?.submittedById && input.status !== existing.status) {
      await notifyUsers(fastify, [existing.submittedById], {
        type: "RESCUE_REQUEST_STATUS_CHANGED",
        title: "Yêu cầu cứu trợ đã đổi trạng thái",
        message: `${updated.name} hiện ${statusLabel(input.status)}.`,
        link: `/volunteer/requests/${updated.id}`,
        metadata: { rescueRequestId: updated.id, status: input.status },
      });
    }

    if (input.status && REQUEST_APPROVED_STATUSES.has(input.status) && existing?.status !== input.status) {
      await sendAutomaticEmail(fastify, {
        trigger: "RESCUE_REQUEST_APPROVED",
        to: updated.requesterEmail ?? existing?.submittedBy?.email,
        recipientName: updated.requesterName ?? existing?.submittedBy?.name,
        recipientUserId: existing?.submittedById ?? null,
        rescueRequestId: updated.id,
        idempotencyKey: `rescue-request-approved:${updated.id}`,
        variables: {
          requestCode: updated.id.slice(0, 8).toUpperCase(),
          content: updated.content ?? "",
          address: locationAddress(updated.location),
          priority: updated.priority,
          requesterName: updated.requesterName ?? existing?.submittedBy?.name ?? "",
          requesterPhone: updated.requesterPhone ?? existing?.submittedBy?.phone ?? "",
          requesterEmail: updated.requesterEmail ?? existing?.submittedBy?.email ?? "",
          requesterTitle: input.requesterTitle ?? requesterTitleFromLocation(updated.location) ?? "",
        },
        metadata: { status: input.status },
      });
    }

    return { data: normalizeRescueRequest(updated) };
  });

  fastify.delete("/admin/rescue-requests/:id", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.rescueRequest.delete({ where: { id } });
    return reply.status(204).send();
  });

  fastify.post("/admin/rescue-requests/:id/missions", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = missionSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu nhiệm vụ không hợp lệ.", errors: body.error.flatten() });

    const rescueRequest = await prisma.rescueRequest.findUnique({ where: { id } });
    if (!rescueRequest) return reply.status(404).send({ message: "Không tìm thấy yêu cầu cứu trợ." });
    if (!MISSION_CREATE_REQUEST_STATUSES.has(rescueRequest.status)) {
      return reply.status(409).send({ message: "Chỉ có yêu cầu đang thực hiện mới được tạo nhiệm vụ." });
    }

    const data = await prisma.$transaction(async (tx: any) => {
      const mission = await tx.mission.create({
        data: {
          ...missionDataFromInput(body.data),
          requestId: rescueRequest.id,
          locationId: rescueRequest.locationId,
          priority: body.data.priority ?? rescueRequest.priority,
          transportations: body.data.transportations && body.data.transportations.length > 0 ? {
            create: body.data.transportations.map((t: any) => ({
              vehicleType: t.vehicleType,
              vehiclePlate: t.vehiclePlate,
              driverName: t.driverName,
              driverPhone: t.driverPhone,
              notes: emptyToNull(t.notes),
            }))
          } : undefined,
        },
        include: {
          rescueTeams: { include: { members: { include: { user: { select: volunteerSelect(false) } } } } },
          transportations: true,
          itemAssignments: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
        },
      });
      return mission;
    });

    await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
      type: "MISSION_CREATED",
      title: "Nhiệm vụ cứu trợ mới",
      message: `${data.name} đã được lập cho ${rescueRequestLabel(rescueRequest)}.`,
      link: "/admin/needs",
      metadata: { missionId: data.id, rescueRequestId: rescueRequest.id },
    });

    return reply.status(201).send({ data: normalizeMission(data) });
  });

  fastify.patch("/admin/missions/:id", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = missionUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu cập nhật nhiệm vụ không hợp lệ.", errors: body.error.flatten() });

    const existing = await prisma.mission.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ message: "Không tìm thấy nhiệm vụ." });

    const data: Record<string, unknown> = {};
    const input = body.data;
    if (input.name !== undefined) data.name = input.name;
    if (input.missionType !== undefined) data.missionType = emptyToNull(input.missionType);
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.startedAt !== undefined) data.startedAt = optionalDate(input.startedAt);
    if (input.endedAt !== undefined) data.endedAt = optionalDate(input.endedAt);

    const updated = await prisma.$transaction(async (tx: any) => {
      if (input.transportations !== undefined) {
        await tx.transportation.deleteMany({ where: { missionId: id } });
        if (input.transportations.length > 0) {
          await tx.transportation.createMany({
            data: input.transportations.map((t: any) => ({
              missionId: id,
              vehicleType: t.vehicleType,
              vehiclePlate: t.vehiclePlate,
              driverName: t.driverName,
              driverPhone: t.driverPhone,
              notes: emptyToNull(t.notes),
            })),
          });
        }
      }
      return tx.mission.update({
        where: { id },
        data,
        include: {
          rescueTeams: { include: { members: { include: { user: { select: volunteerSelect(false) } } } } },
          transportations: true,
          itemAssignments: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
        },
      });
    });
    return { data: normalizeMission(updated) };
  });

  fastify.delete("/admin/missions/:id", { preHandler: [requireRescueRequests] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.mission.delete({ where: { id } });
    return reply.status(204).send();
  });

  fastify.post("/admin/rescue-teams", { preHandler: [requireResources] }, async (request, reply) => {
    const body = createTeamSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu tạo đội không hợp lệ.", errors: body.error.flatten() });
    if (!body.data.missionId && !body.data.requestId) {
      return reply.status(400).send({ message: "Cần chọn nhiệm vụ để tạo đội cứu trợ." });
    }

    let data: any;
    try {
      data = await prisma.$transaction(async (tx: any) => {
        const mission = body.data.missionId
          ? await tx.mission.findUnique({ where: { id: body.data.missionId }, include: { request: true } })
          : null;
        const rescueRequest = mission?.request
          ?? (body.data.requestId ? await tx.rescueRequest.findUnique({ where: { id: body.data.requestId }, include: { location: true } }) : null);
        if (!rescueRequest) throw new Error("Không tìm thấy yêu cầu cứu trợ.");
        if (!TEAM_CREATE_REQUEST_STATUSES.has(rescueRequest.status)) {
          throw new Error("Chỉ có yêu cầu đang thực hiện mới được lập đội TNV.");
        }
        if (mission && !TEAM_CREATE_MISSION_STATUSES.has(mission.status)) {
          throw new Error("Chỉ có nhiệm vụ đang tuyển hoặc đã đủ đội mới được lập đội TNV.");
        }

      const targetMission = mission ?? await tx.mission.create({
        data: {
          requestId: rescueRequest.id,
          locationId: rescueRequest.locationId,
          name: `Nhiệm vụ ${rescueRequestLabel(rescueRequest)}`,
          missionType: body.data.type || "Cứu trợ",
          priority: rescueRequest.priority,
          status: "DANG_TUYEN",
        },
      });

      const existingTeams = await tx.rescueTeam.findMany({
        where: { missionId: targetMission.id },
        orderBy: { createdAt: "asc" },
      });
      const team = existingTeams[0]
        ? await tx.rescueTeam.update({
            where: { id: existingTeams[0].id },
            data: {
              name: body.data.teamName,
              type: emptyToNull(body.data.type),
            },
          })
        : await tx.rescueTeam.create({
            data: {
              missionId: targetMission.id,
              name: body.data.teamName,
              type: emptyToNull(body.data.type),
            },
          });
      if (existingTeams.length > 1) {
        await tx.rescueTeam.deleteMany({ where: { id: { in: existingTeams.slice(1).map((item: any) => item.id) } } });
      }

      const memberRoles = new Map<string, string>();
      for (const userId of body.data.memberIds) memberRoles.set(userId, memberRoles.size === 0 ? "DOI_TRUONG" : "THANH_VIEN");
      for (const member of body.data.members) memberRoles.set(member.userId, member.role);

      for (const external of body.data.externalMembers) {
        const existingUser = await tx.user.findUnique({ where: { phone: external.phone }, include: { volunteerProfile: true } });
        const user = existingUser ?? await tx.user.create({
          data: {
            username: `ext-${external.phone}`,
            passwordHash: await bcrypt.hash("123456", 10),
            role: "VOLUNTEER",
            name: external.name,
            phone: external.phone,
          },
        });
        const volunteer = existingUser?.volunteerProfile ?? await tx.volunteer.create({
          data: {
            userId: user.id,
            accountStatus: "HOAT_DONG",
            skills: external.skills,
          },
        });
        memberRoles.set(volunteer.id, external.role);
      }

      const assignedToOtherMissions = await tx.rescueTeamMember.findMany({
        where: {
          team: {
            mission: {
              requestId: rescueRequest.id,
              id: { not: targetMission.id },
            },
          },
        },
        select: { userId: true },
      });
      for (const member of assignedToOtherMissions) {
        memberRoles.delete(member.userId);
      }

      const registered = await tx.volunteerRequest.findMany({
        where: { requestId: rescueRequest.id, volunteerId: { in: [...memberRoles.keys()] } },
      });
      const registeredIds = new Set(registered.map((item: any) => item.volunteerId));

      await tx.rescueTeamMember.deleteMany({
        where: {
          teamId: team.id,
          userId: { notIn: [...memberRoles.keys()] },
        },
      });

      for (const [userId, role] of memberRoles) {
        if (!registeredIds.has(userId)) {
          await tx.volunteerRequest.create({ data: { requestId: rescueRequest.id, volunteerId: userId, status: "DA_TIEP_NHAN" } });
        } else {
          await tx.volunteerRequest.update({
            where: { volunteerId_requestId: { volunteerId: userId, requestId: rescueRequest.id } },
            data: { status: "DA_TIEP_NHAN" },
          });
        }
        await tx.rescueTeamMember.upsert({
          where: { userId_teamId: { userId, teamId: team.id } },
          update: { role },
          create: { userId, teamId: team.id, role },
        });
      }

      const missionGoods = await tx.missionItemAssignment.aggregate({
        where: { missionId: targetMission.id },
        _sum: { quantity: true },
      });
      const hasTeamMembers = memberRoles.size > 0;
      await tx.mission.update({
        where: { id: targetMission.id },
        data: { status: missionStatusAfterTeamSave(targetMission.status, hasTeamMembers, Number(missionGoods._sum.quantity ?? 0) > 0) },
      });
        return tx.rescueTeam.findUnique({
          where: { id: team.id },
          include: { mission: { include: { request: true } }, members: { include: { user: { select: volunteerSelect(false) } } } },
        });
      });
    } catch (error) {
      if (error instanceof Error) return reply.status(409).send({ message: error.message });
      throw error;
    }

    data = normalizeRescueTeam(data);
    const memberIds = (data?.members ?? []).map((member: any) => member.user?.userId).filter(Boolean);
    await notifyUsers(fastify, memberIds, {
      type: "VOLUNTEER_ADDED_TO_RESCUE_TEAM",
      title: "Bạn đã được thêm vào đội cứu trợ",
      message: `Bạn đã được phân vào ${data.name}${data.mission?.name ? ` cho ${data.mission.name}` : ""}.`,
      link: "/volunteer/my-requests",
      metadata: { rescueTeamId: data.id, missionId: data.missionId },
    });

    await Promise.all((data?.members ?? []).map((member: any) => sendAutomaticEmail(fastify, {
      trigger: "VOLUNTEER_JOIN_REQUEST_APPROVED",
      to: member.user?.email,
      recipientName: member.user?.name,
      recipientUserId: member.user?.userId,
      rescueRequestId: data.mission?.requestId ?? null,
      idempotencyKey: `volunteer-join-approved:${data.id}:${member.userId}`,
      variables: {
        teamName: data.name,
        missionName: data.mission?.name ?? "Nhiệm vụ cứu trợ",
        role: teamMemberRoleLabel(member.role),
        requestName: data.mission?.request?.name ?? "Yêu cầu cứu trợ",
        volunteerName: member.user?.name ?? "",
        volunteerPhone: member.user?.phone ?? "",
        volunteerEmail: member.user?.email ?? "",
      },
      metadata: { rescueTeamId: data.id, missionId: data.missionId },
    })));

    return reply.status(201).send({ data });
  });

  fastify.delete("/admin/rescue-teams/:id", { preHandler: [requireResources] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.rescueTeam.delete({ where: { id } });
    return reply.status(204).send();
  });

  fastify.patch("/admin/rescue-teams/:teamId/members/:userId", { preHandler: [requireResources] }, async (request, reply) => {
    const { teamId, userId } = request.params as { teamId: string; userId: string };
    const body = z.object({
      role: z.enum(["DOI_TRUONG", "DOI_PHO", "THANH_VIEN", "CONG_TAC_VIEN"]),
    }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Vai trò thành viên không hợp lệ.", errors: body.error.flatten() });

    const data = await prisma.rescueTeamMember.update({
      where: { userId_teamId: { userId, teamId } },
      data: { role: body.data.role },
      include: { user: { select: volunteerSelect(false) }, team: true },
    });
    return { data: { ...data, user: volunteerDto(data.user) } };
  });

  fastify.get("/admin/roles", { preHandler: [fastify.requireAdmin] }, async () => {
    const data = await prisma.role.findMany({ orderBy: { id: "asc" } });
    return { data, total: data.length };
  });

  fastify.post("/admin/volunteer-accounts", { preHandler: [requirePermissionAdmin] }, async (request, reply) => {
    const body = volunteerAccountSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu tài khoản TNV không hợp lệ.", errors: body.error.flatten() });

    const input = body.data;
    const data = await prisma.volunteer.create({
      data: {
        status: input.status ?? "AVAILABLE",
        accountStatus: input.accountStatus ?? "HOAT_DONG",
        skills: input.skills ?? [],
        city: emptyToNull(input.city),
        ward: emptyToNull(input.ward),
        user: {
          create: {
            username: emptyToNull(input.username) ?? `vol-${input.phone}`,
            passwordHash: await bcrypt.hash(input.password || "123456", 10),
            email: emptyToNull(input.email),
            role: "VOLUNTEER",
            name: input.name,
            phone: input.phone,
            roleLinks: input.roleIds ? { create: input.roleIds.map((roleId) => ({ roleId })) } : undefined,
          },
        },
      },
      select: { ...volunteerSelect(false), user: { select: { ...volunteerSelect(false).user.select, roleLinks: { include: { role: true } } } } },
    });
    const dto = volunteerDto(data);

    if (dto.accountStatus === "HOAT_DONG") {
      await notifyUsers(fastify, [dto.userId], {
        type: "VOLUNTEER_ACCOUNT_APPROVED",
        title: "Tài khoản TNV đã được xác nhận",
        message: "Tài khoản tình nguyện viên của bạn đã sẵn sàng hoạt động.",
        link: "/volunteer/profile",
        metadata: { volunteerId: dto.id },
      });
      await sendAutomaticEmail(fastify, {
        trigger: "VOLUNTEER_ACCOUNT_APPROVED",
        to: dto.email,
        recipientName: dto.name,
        recipientUserId: dto.userId,
        idempotencyKey: `volunteer-account-approved:${dto.id}`,
        variables: {
          recipientName: dto.name,
          volunteerName: dto.name,
          volunteerPhone: dto.phone,
          volunteerEmail: dto.email ?? "",
          skills: (dto.skills ?? []).join(", ") || "Chưa cập nhật",
          area: [dto.city, dto.ward].filter(Boolean).join(" - ") || "Chưa cập nhật",
        },
        metadata: { volunteerId: dto.id },
      });
    }

    return reply.status(201).send({ data: dto });
  });

  fastify.patch("/admin/volunteer-accounts/:id", { preHandler: [requirePermissionAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = volunteerAccountSchema.partial().safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu tài khoản TNV không hợp lệ.", errors: body.error.flatten() });

    const input = body.data;
    const data: Record<string, unknown> = {};
    const userData: Record<string, unknown> = {};
    if (input.username !== undefined) userData.username = emptyToNull(input.username);
    if (input.password) userData.passwordHash = await bcrypt.hash(input.password, 10);
    if (input.email !== undefined) userData.email = emptyToNull(input.email);
    if (input.name !== undefined) userData.name = input.name;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.status !== undefined) data.status = input.status;
    if (input.accountStatus !== undefined) data.accountStatus = input.accountStatus;
    if (input.skills !== undefined) data.skills = input.skills;
    if (input.city !== undefined) data.city = emptyToNull(input.city);
    if (input.ward !== undefined) data.ward = emptyToNull(input.ward);

    const existing = await prisma.volunteer.findUnique({ where: { id } });
    const updated = await prisma.$transaction(async (tx: any) => {
      if (Object.keys(data).length > 0) {
        await tx.volunteer.update({ where: { id }, data });
      }
      const volunteer = await tx.volunteer.findUnique({ where: { id }, select: { userId: true } });
      if (!volunteer) throw new Error("Không tìm thấy tài khoản TNV.");
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: volunteer.userId }, data: userData });
      }
      if (input.roleIds) {
        await tx.userRoleLink.deleteMany({ where: { userId: volunteer.userId } });
        if (input.roleIds.length > 0) {
          await tx.userRoleLink.createMany({ data: input.roleIds.map((roleId) => ({ userId: volunteer.userId, roleId })) });
        }
      }
      return tx.volunteer.findUnique({
        where: { id },
        select: { ...volunteerSelect(false), user: { select: { ...volunteerSelect(false).user.select, roleLinks: { include: { role: true } } } } },
      });
    });
    const updatedDto = volunteerDto(updated);

    if (input.accountStatus && existing?.accountStatus !== input.accountStatus) {
      await notifyUsers(fastify, [updatedDto.userId], {
        type: input.accountStatus === "HOAT_DONG" ? "VOLUNTEER_ACCOUNT_APPROVED" : "VOLUNTEER_ACCOUNT_STATUS_CHANGED",
        title: input.accountStatus === "HOAT_DONG" ? "Tài khoản TNV đã được xác nhận" : "Tài khoản TNV đã đổi trạng thái",
        message: `Tài khoản tình nguyện viên của bạn hiện ${statusLabel(input.accountStatus)}.`,
        link: "/volunteer/profile",
        metadata: { volunteerId: id, accountStatus: input.accountStatus },
      });
      if (input.accountStatus === "HOAT_DONG") {
        await sendAutomaticEmail(fastify, {
          trigger: "VOLUNTEER_ACCOUNT_APPROVED",
          to: updatedDto?.email,
          recipientName: updatedDto?.name,
          recipientUserId: updatedDto?.userId,
          idempotencyKey: `volunteer-account-approved:${id}`,
          variables: {
            recipientName: updatedDto?.name ?? "",
            volunteerName: updatedDto?.name ?? "",
            volunteerPhone: updatedDto?.phone ?? "",
            volunteerEmail: updatedDto?.email ?? "",
            skills: (updatedDto?.skills ?? []).join(", ") || "Chưa cập nhật",
            area: [updatedDto?.city, updatedDto?.ward].filter(Boolean).join(" - ") || "Chưa cập nhật",
          },
          metadata: { volunteerId: id },
        });
      }
    }

    return { data: updatedDto };
  });
}
