import { FastifyInstance } from "fastify";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

export default async function volunteerTeamRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // GET /volunteer-teams
  fastify.get("/volunteer-teams", async (request) => {
    const { q, city } = request.query as { q?: string; city?: string };

    const where: Record<string, unknown> = {};
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { ward: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.volunteerTeam.findMany({
        where: where as any,
        include: {
          volunteers: {
            select: volunteerSelect(false),
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.volunteerTeam.count({ where: where as any }),
    ]);

    return { data: data.map((team: any) => ({ ...team, volunteers: team.volunteers.map(volunteerDto) })), total };
  });

  // POST /volunteer-teams
  fastify.post("/volunteer-teams", async (request, reply) => {
    const body = request.body as {
      name: string;
      city?: string;
      ward?: string;
      description?: string;
    };

    const team = await prisma.volunteerTeam.create({
      data: {
        name: body.name,
        city: body.city,
        ward: body.ward,
        description: body.description,
      },
      include: {
          volunteers: {
            select: volunteerSelect(false),
            orderBy: { createdAt: "desc" },
          },
      },
    });

    return reply.status(201).send({ data: { ...team, volunteers: team.volunteers.map(volunteerDto) } });
  });

  // PATCH /volunteer-teams/:id
  fastify.patch("/volunteer-teams/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await prisma.volunteerTeam.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Volunteer team not found" });
    }

    const team = await prisma.volunteerTeam.update({
      where: { id },
      data: body as any,
      include: {
          volunteers: {
            select: volunteerSelect(false),
            orderBy: { createdAt: "desc" },
          },
      },
    });

    return { data: { ...team, volunteers: team.volunteers.map(volunteerDto) } };
  });

  // DELETE /volunteer-teams/:id
  fastify.delete("/volunteer-teams/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.volunteerTeam.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Volunteer team not found" });
    }

    await (prisma as any).volunteer.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    await prisma.volunteerTeam.delete({ where: { id } });
    return { message: "Volunteer team deleted" };
  });
}
