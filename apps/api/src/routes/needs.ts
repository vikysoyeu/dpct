import { FastifyInstance } from "fastify";

export default async function needRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // GET /locations/:id/needs — list needs for a location
  fastify.get("/locations/:id/needs", async (request, reply) => {
    const { id } = request.params as { id: string };

    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return reply.status(404).send({ message: "Location not found" });
    }

    const needs = await prisma.need.findMany({
      where: { locationId: id },
      orderBy: { createdAt: "desc" },
    });

    return { data: needs, total: needs.length };
  });

  // POST /locations/:id/needs — add a need to a location
  fastify.post("/locations/:id/needs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      category: string;
      item: string;
      quantity: number;
      unit: string;
    };

    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return reply.status(404).send({ message: "Location not found" });
    }

    const need = await prisma.need.create({
      data: {
        locationId: id,
        category: body.category as any,
        item: body.item,
        quantity: body.quantity,
        unit: body.unit,
      },
    });

    return reply.status(201).send({ data: need });
  });

  // PATCH /needs/:id — update a need
  fastify.patch("/needs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await prisma.need.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Need not found" });
    }

    const need = await prisma.need.update({
      where: { id },
      data: body as any,
    });

    return { data: need };
  });

  // DELETE /needs/:id — delete a need
  fastify.delete("/needs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.need.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Need not found" });
    }

    await prisma.need.delete({ where: { id } });
    return { message: "Need deleted" };
  });
}
