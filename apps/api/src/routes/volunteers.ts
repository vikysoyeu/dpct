import { FastifyInstance } from "fastify";
import { notifyUsers } from "../services/notificationService.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

const DEFAULT_VOLUNTEER_PASSWORD = "123456";

export default async function volunteerRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // GET /volunteers — list users with role VOLUNTEER
  fastify.get("/volunteers", async (request, reply) => {
    const { status, skill, teamId, q } = request.query as {
      status?: string;
      skill?: string;
      teamId?: string;
      q?: string;
    };

    const where: Record<string, unknown> = {};

    if (skill) {
      where.skills = { has: skill };
    }
    if (status) {
      where.status = status;
    }
    if (teamId) {
      where.teamId = teamId;
    }
    if (q) {
      where.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      (prisma as any).volunteer.findMany({
        where: where as any,
        select: volunteerSelect(true),
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).volunteer.count({ where: where as any }),
    ]);

    return { data: data.map(volunteerDto), total };
  });

  // GET /volunteers/:id
  fastify.get("/volunteers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const volunteer = await (prisma as any).volunteer.findUnique({
      where: { id },
      select: volunteerSelect(true),
    });
    if (!volunteer) {
      return reply.status(404).send({ message: "Volunteer not found" });
    }
    return { data: volunteerDto(volunteer) };
  });

  // POST /volunteers — create a volunteer user
  fastify.post("/volunteers", async (request, reply) => {
    const body = request.body as {
      name: string;
      phone: string;
      skills?: string[];
      vehicleType?: string;
      status?: string;
      teamId?: string;
      email?: string;
    };

    const passwordHash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash(DEFAULT_VOLUNTEER_PASSWORD, 10));
    const volunteer = await (prisma as any).volunteer.create({
      data: {
        user: {
          create: {
            username: `vol-${body.phone}`,
            passwordHash,
            email: body.email || null,
            role: "VOLUNTEER",
            name: body.name,
            phone: body.phone,
          },
        },
        skills: body.skills ?? [],
        vehicleType: body.vehicleType,
        status: (body.status as any) ?? "AVAILABLE",
        teamId: body.teamId,
      },
      select: volunteerSelect(true),
    });
    const dto = volunteerDto(volunteer);

    if (volunteer.teamId) {
      await notifyUsers(fastify, [volunteer.userId], {
        type: "VOLUNTEER_ADDED_TO_TEAM",
        title: "Bạn đã được thêm vào đội TNV",
        message: `Bạn đã được thêm vào ${volunteer.team?.name ?? "một đội tình nguyện viên"}.`,
        link: "/volunteer/profile",
        metadata: { volunteerId: volunteer.id, teamId: volunteer.teamId },
      });
    }

    return reply.status(201).send({ data: dto });
  });

  // PATCH /volunteers/:id — update volunteer info
  fastify.patch("/volunteers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await (prisma as any).volunteer.findUnique({
      where: { id },
      select: { id: true, userId: true, teamId: true },
    });
    if (!existing) {
      return reply.status(404).send({ message: "Volunteer not found" });
    }

    const { name, phone, email, username, passwordHash, ...profileData } = body as any;
    const volunteer = await (prisma as any).volunteer.update({
      where: { id },
      data: {
        ...profileData,
        user: (name !== undefined || phone !== undefined || email !== undefined || username !== undefined || passwordHash !== undefined)
          ? { update: { name, phone, email, username, passwordHash } }
          : undefined,
      },
      select: volunteerSelect(true),
    });

    if (body.teamId && body.teamId !== existing.teamId) {
      await notifyUsers(fastify, [volunteer.userId], {
        type: "VOLUNTEER_ADDED_TO_TEAM",
        title: "Bạn đã được thêm vào đội TNV",
        message: `Bạn đã được thêm vào ${volunteer.team?.name ?? "một đội tình nguyện viên"}.`,
        link: "/volunteer/profile",
        metadata: { volunteerId: volunteer.id, teamId: volunteer.teamId },
      });
    }

    return { data: volunteerDto(volunteer) };
  });

  // DELETE /volunteers/:id
  fastify.delete("/volunteers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await (prisma as any).volunteer.findUnique({
      where: { id },
    });
    if (!existing) {
      return reply.status(404).send({ message: "Volunteer not found" });
    }

    await (prisma as any).volunteer.delete({ where: { id } });
    return { message: "Volunteer deleted" };
  });
}
