import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendAutomaticEmail } from "../services/emailService.js";
import { notifyAdminsByRoles } from "../services/notificationService.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

const registerRequestSchema = z.object({
  note: z.string().max(1000).optional().or(z.literal("")),
});

const VOLUNTEER_VISIBLE_REQUEST_STATUSES = ["DANG_THUC_HIEN"];
const VOLUNTEER_REGISTRATION_REQUEST_STATUS = "DANG_THUC_HIEN";
const APPROVED_REGISTRATION_STATUSES = new Set(["DA_TIEP_NHAN", "DANG_XU_LY"]);

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  ward: z.string().max(100).optional().or(z.literal("")),
  skills: z.array(z.string().min(1).max(50)).optional(),
  vehicleType: z.string().max(100).optional().or(z.literal("")),
  availability: z.string().max(255).optional().or(z.literal("")),
  experience: z.string().max(1000).optional().or(z.literal("")),
  emergencyContactName: z.string().max(100).optional().or(z.literal("")),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "ON_MISSION", "RESTING"]).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export default async function volunteerPortalRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  const privateMissionInclude = {
    rescueTeams: {
      include: {
        members: {
          include: {
            user: { select: volunteerSelect(false) },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    },
  };

  const rescueRequestInclude = {
    location: { include: { needs: true, locationUpdates: { orderBy: { createdAt: "desc" } } } },
    requestItems: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
    volunteerRequests: {
      select: { id: true, volunteerId: true, status: true, note: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
    },
    missions: {
      include: privateMissionInclude,
      orderBy: { startedAt: "desc" },
    },
  };

  const profileSelect = volunteerSelect(true);

  function emptyToNull(value: string | undefined) {
    return value && value.trim() ? value.trim() : null;
  }

  function toDateOrNull(value: string | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function isApprovedVolunteer(volunteer: { accountStatus?: string | null } | null) {
    return volunteer?.accountStatus === "HOAT_DONG";
  }

  function isApprovedRegistration(registration?: { status?: string | null } | null) {
    return Boolean(registration?.status && APPROVED_REGISTRATION_STATUSES.has(registration.status));
  }

  function canVolunteerViewRequest(rescueRequest: any, volunteerId: string) {
    if (VOLUNTEER_VISIBLE_REQUEST_STATUSES.includes(rescueRequest.status)) return true;
    return rescueRequest.volunteerRequests?.some((item: any) => item.volunteerId === volunteerId) ?? false;
  }

  function publicRequestForVolunteer(rescueRequest: any, volunteerId: string) {
    const ownRegistration = rescueRequest.volunteerRequests?.find((item: any) => item.volunteerId === volunteerId) ?? null;
    const canViewOperationalDetails = isApprovedRegistration(ownRegistration);
    const publicMissions = publicMissionsForVolunteer(rescueRequest.missions);
    return {
      ...rescueRequest,
      location: locationForVolunteer(rescueRequest.location),
      volunteerRequestCount: rescueRequest.volunteerRequests?.length ?? 0,
      missionCount: rescueRequest.missions?.length ?? 0,
      volunteerRequests: canViewOperationalDetails
        ? rescueRequest.volunteerRequests
        : rescueRequest.volunteerRequests.filter((item: any) => item.volunteerId === volunteerId),
      missions: canViewOperationalDetails ? normalizeMissionVolunteers(rescueRequest.missions) : publicMissions,
    };
  }

  function locationForVolunteer(location: any) {
    if (!location) return null;
    const imageUrls = Array.from(
      new Set((location.locationUpdates ?? []).map((update: any) => update.imageUrl).filter((url: any): url is string => !!url))
    );
    return { ...location, imageUrls };
  }

  function normalizeMissionVolunteers(missions: any[]) {
    return (missions ?? []).map((mission) => ({
      ...mission,
      teamCount: mission.rescueTeams?.length ?? 0,
      memberCount: mission.rescueTeams?.reduce((total: number, team: any) => total + (team.members?.length ?? 0), 0) ?? 0,
      rescueTeams: (mission.rescueTeams ?? []).map((team: any) => ({
        ...team,
        members: (team.members ?? []).map((member: any) => ({ ...member, user: volunteerDto(member.user) })),
      })),
    }));
  }

  function publicMissionsForVolunteer(missions: any[]) {
    return (missions ?? []).map((mission) => ({
      id: mission.id,
      locationId: mission.locationId,
      requestId: mission.requestId,
      name: mission.name,
      missionType: mission.missionType,
      priority: mission.priority,
      status: mission.status,
      startedAt: mission.startedAt,
      endedAt: mission.endedAt,
      teamCount: mission.rescueTeams?.length ?? 0,
      memberCount: mission.rescueTeams?.reduce((total: number, team: any) => total + (team.members?.length ?? 0), 0) ?? 0,
      rescueTeams: [],
    }));
  }

  fastify.get("/volunteer/rescue-requests", { preHandler: [fastify.requireVolunteer] }, async (request) => {
    const { status, q } = request.query as { status?: string; q?: string };
    const where: Record<string, unknown> = {
      status: { in: VOLUNTEER_VISIBLE_REQUEST_STATUSES },
    };

    if (status && VOLUNTEER_VISIBLE_REQUEST_STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { location: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.rescueRequest.findMany({
        where,
        include: rescueRequestInclude,
        orderBy: [{ priority: "desc" }, { submittedAt: "desc" }],
      }),
      prisma.rescueRequest.count({ where }),
    ]);

    return { data: data.map((item: any) => publicRequestForVolunteer(item, request.user.sub)), total };
  });

  fastify.get("/volunteer/rescue-requests/:code", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const rescueRequest = await prisma.rescueRequest.findUnique({
      where: { code },
      include: rescueRequestInclude,
    });

    if (!rescueRequest) {
      return reply.status(404).send({ message: "Rescue request not found" });
    }
    if (!canVolunteerViewRequest(rescueRequest, request.user.sub)) {
      return reply.status(404).send({ message: "Rescue request not found" });
    }

    return { data: publicRequestForVolunteer(rescueRequest, request.user.sub) };
  });

  fastify.post("/volunteer/rescue-requests/:code/register", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = registerRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Ghi chú đăng ký không hợp lệ.", errors: body.error.flatten() });
    }

    const volunteerProfile = await prisma.volunteer.findUnique({
      where: { id: request.user.sub },
      select: { id: true, accountStatus: true },
    });
    if (!isApprovedVolunteer(volunteerProfile)) {
      return reply.status(403).send({ message: "Hồ sơ tình nguyện viên cần được duyệt trước khi đăng ký yêu cầu cứu trợ." });
    }

    const rescueRequest = await prisma.rescueRequest.findUnique({ where: { code } });
    if (!rescueRequest) {
      return reply.status(404).send({ message: "Rescue request not found" });
    }
    if (rescueRequest.status !== VOLUNTEER_REGISTRATION_REQUEST_STATUS) {
      return reply.status(409).send({ message: "Yêu cầu cứu trợ này chưa mở tuyển hoặc đã ngừng nhận đăng ký TNV." });
    }

    const registration = await prisma.volunteerRequest.upsert({
      where: {
        volunteerId_requestId: {
          volunteerId: request.user.sub,
          requestId: rescueRequest.id,
        },
      },
      update: {
        note: emptyToNull(body.data.note),
      },
      create: {
        volunteerId: request.user.sub,
        requestId: rescueRequest.id,
        note: emptyToNull(body.data.note),
      },
      include: {
        request: { include: rescueRequestInclude },
      },
    });

    const volunteer = volunteerDto(await prisma.volunteer.findUnique({
      where: { id: request.user.sub },
      select: volunteerSelect(false),
    }));
    await notifyAdminsByRoles(fastify, ["ADMIN_TNV", "ADMIN_YCCT"], {
      type: "VOLUNTEER_JOIN_REQUEST_CREATED",
      title: "TNV đăng ký tham gia yêu cầu",
      message: `${volunteer?.name ?? volunteer?.phone ?? "Một TNV"} vừa đăng ký tham gia ${registration.request?.name ?? "yêu cầu cứu trợ"}.`,
      link: "/admin/needs",
      metadata: { volunteerRequestId: registration.id, rescueRequestId: rescueRequest.id, rescueRequestCode: rescueRequest.code, volunteerId: request.user.sub },
    });

    await sendAutomaticEmail(fastify, {
      trigger: "VOLUNTEER_JOIN_REQUEST_SUBMITTED",
      to: volunteer?.email,
      recipientName: volunteer?.name,
      rescueRequestId: rescueRequest.id,
      volunteerRequestId: registration.id,
      idempotencyKey: `volunteer-join-submitted:${registration.id}`,
      variables: {
        requestName: rescueRequest.name,
        note: body.data.note || "Không có ghi chú",
        volunteerName: volunteer?.name ?? "",
        volunteerPhone: volunteer?.phone ?? "",
        volunteerEmail: volunteer?.email ?? "",
        skills: (volunteer?.skills ?? []).join(", ") || "Chưa cập nhật",
        area: [volunteer?.city, volunteer?.ward].filter(Boolean).join(" - ") || "Chưa cập nhật",
        vehicleType: volunteer?.vehicleType ?? "Chưa cập nhật",
      },
      metadata: { rescueRequestId: rescueRequest.id, volunteerRequestId: registration.id },
    });

    return reply.status(201).send({ data: registration });
  });

  fastify.patch("/volunteer/missions/:id/complete", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: privateMissionInclude,
    });

    if (!mission) return reply.status(404).send({ message: "Không tìm thấy nhiệm vụ." });

    const isLeader = mission.rescueTeams?.some((team: any) =>
      team.members?.some((member: any) => member.userId === request.user.sub && member.role === "DOI_TRUONG")
    );
    if (!isLeader) return reply.status(403).send({ message: "Chỉ đội trưởng của nhiệm vụ mới được hoàn thành nhiệm vụ." });
    if (mission.status === "HUY_BO") return reply.status(409).send({ message: "Nhiệm vụ đã hủy không thể chuyển sang hoàn thành." });

    const updated = await prisma.mission.update({
      where: { id },
      data: { status: "HOAN_THANH", endedAt: new Date() },
      include: privateMissionInclude,
    });

    await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
      type: "MISSION_COMPLETED",
      title: "Nhiệm vụ đã hoàn thành",
      message: `${updated.name} đã được đội trưởng xác nhận hoàn thành.`,
      link: "/admin/needs",
      metadata: { missionId: updated.id, volunteerId: request.user.sub, rescueRequestId: updated.requestId },
    });

    return { data: normalizeMissionVolunteers([updated])[0] };
  });

  fastify.get("/volunteer/my-requests", { preHandler: [fastify.requireVolunteer] }, async (request) => {
    const data = await prisma.volunteerRequest.findMany({
      where: { volunteerId: request.user.sub },
      include: {
        request: { include: rescueRequestInclude },
      },
      orderBy: { submittedAt: "desc" },
    });

    return { data: data.map((item: any) => ({ ...item, request: publicRequestForVolunteer(item.request, request.user.sub) })), total: data.length };
  });

  fastify.get("/volunteer/profile", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: request.user.sub },
      select: profileSelect,
    });

    if (!volunteer) return reply.status(404).send({ message: "Volunteer not found" });
    return volunteerDto(volunteer);
  });

  fastify.patch("/volunteer/profile", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const body = profileSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu hồ sơ không hợp lệ.", errors: body.error.flatten() });
    }

    const input = body.data;
    const data: Record<string, unknown> = {};
    const userData: Record<string, unknown> = {};
    if (input.name !== undefined) userData.name = input.name;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.email !== undefined) userData.email = emptyToNull(input.email);
    if (input.dateOfBirth !== undefined) data.dateOfBirth = toDateOrNull(input.dateOfBirth);
    if (input.skills !== undefined) data.skills = input.skills;
    if (input.status !== undefined) data.status = input.status;
    if (input.password) userData.passwordHash = await bcrypt.hash(input.password, 10);
    ["gender", "address", "city", "ward", "vehicleType", "availability", "experience", "emergencyContactName", "emergencyContactPhone"].forEach((key) => {
      if (key in input) data[key] = emptyToNull((input as Record<string, string | undefined>)[key]);
    });

    if (Object.keys(data).length === 0 && Object.keys(userData).length === 0) {
      return reply.status(400).send({ message: "Không có gì để cập nhật." });
    }

    const volunteer = await prisma.volunteer.update({
      where: { id: request.user.sub },
      data: {
        ...data,
        user: Object.keys(userData).length > 0 ? { update: userData } : undefined,
      },
      select: profileSelect,
    });

    return volunteerDto(volunteer);
  });
}
