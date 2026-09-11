import { FastifyInstance } from "fastify";
import { notifyAdminsByRoles } from "../services/notificationService.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

export default async function locationRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  const userSummary = {
    id: true,
    name: true,
    phone: true,
    email: true,
    role: true,
    username: true,
  };

  const detailInclude = {
    needs: { orderBy: [{ priority: "desc" }, { createdAt: "desc" }] },
    inventory: { include: { lastUpdatedBy: { select: userSummary } }, orderBy: { updatedAt: "desc" } },
    reportedBy: { select: userSummary },
    verifiedBy: { select: userSummary },
    locationUpdates: {
      include: { user: { select: userSummary } },
      orderBy: { createdAt: "desc" },
    },
    rescueRequests: { orderBy: { submittedAt: "desc" } },
    missions: {
      include: {
        rescueTeams: {
          include: {
            members: { include: { user: { select: volunteerSelect(false) } } },
          },
        },
        transportations: true,
      },
      orderBy: [{ startedAt: "desc" }, { name: "asc" }],
    },
  };

  function imageUrlsFromUpdates(locationUpdates: any[] | undefined) {
    return Array.from(
      new Set((locationUpdates ?? []).map((update) => update.imageUrl).filter((url): url is string => !!url))
    );
  }

  function normalizeLocation(location: any) {
    if (!location) return location;
    const base = {
      ...location,
      imageUrls: imageUrlsFromUpdates(location.locationUpdates),
    };
    if (!base?.missions) return base;
    return {
      ...base,
      missions: base.missions.map((mission: any) => ({
        ...mission,
        rescueTeams: (mission.rescueTeams ?? []).map((team: any) => ({
          ...team,
          members: (team.members ?? []).map((member: any) => ({ ...member, user: volunteerDto(member.user) })),
        })),
      })),
    };
  }

  // GET /locations — list all (with optional filters)
  fastify.get("/locations", async (request, reply) => {
    const { type, status, urgency, q, area } = request.query as {
      type?: string;
      status?: string;
      urgency?: string;
      q?: string;
      area?: string;
    };

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (urgency) where.urgency = { gte: Number(urgency) };
    if (q || area) {
      const keyword = (q ?? area) as string;
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { province: { contains: keyword, mode: "insensitive" } },
        { ward: { contains: keyword, mode: "insensitive" } },
        { address: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.location.findMany({
        where,
        include: {
          needs: true,
          inventory: true,
          missions: true,
          locationUpdates: { orderBy: { createdAt: "desc" } },
          reportedBy: { select: userSummary },
          verifiedBy: { select: userSummary },
        },
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      }),
      prisma.location.count({ where }),
    ]);

    return { data: data.map(normalizeLocation), total };
  });

  // GET /locations/:id — single location with all location-management relations
  fastify.get("/locations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const location = await prisma.location.findUnique({
      where: { id },
      include: detailInclude as any,
    });
    if (!location) {
      return reply.status(404).send({ message: "Location not found" });
    }
    return { data: normalizeLocation(location) };
  });

  // POST /locations — create a new location
  fastify.post("/locations", async (request, reply) => {
    const body = request.body as {
      type: string;
      name: string;
      description?: string;
      province?: string;
      ward?: string;
      address?: string;
      lat: number;
      lng: number;
      urgency?: number;
    };

    const location = await prisma.location.create({
      data: {
        type: body.type as any,
        name: body.name,
        description: body.description?.trim() || undefined,
        province: body.province?.trim() || undefined,
        ward: body.ward?.trim() || undefined,
        address: body.address?.trim() || undefined,
        lat: body.lat,
        lng: body.lng,
        urgency: body.urgency ?? 1,
        // For BLOCKED_ROAD, auto-set 2h expiry
        ...(body.type === "BLOCKED_ROAD"
          ? { expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) }
          : {}),
      },
      include: { needs: true, locationUpdates: true },
    });

    if (location.urgency >= 4 || location.type === "URGENT_NEED" || location.type === "BLOCKED_ROAD") {
      await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
        type: location.type === "BLOCKED_ROAD" ? "BLOCKED_ROAD_CREATED" : "URGENT_LOCATION_CREATED",
        title: location.type === "BLOCKED_ROAD" ? "Có điểm đường bị chặn mới" : "Có điểm khẩn cấp mới",
        message: `${location.name} vừa được ghi nhận với mức khẩn cấp ${location.urgency}.`,
        link: "/admin/locations",
        metadata: { locationId: location.id, type: location.type, urgency: location.urgency, expiresAt: location.expiresAt },
      });
    }

    return reply.status(201).send({ data: normalizeLocation(location) });
  });

  // PATCH /locations/:id — update a location
  fastify.patch("/locations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Location not found" });
    }

    const { imageUrls: _imageUrls, locationUpdates: _locationUpdates, ...locationBody } = body;
    const data = { ...locationBody } as Record<string, unknown>;
    for (const key of ["description", "province", "ward", "address"]) {
      if (typeof data[key] === "string") data[key] = (data[key] as string).trim() || null;
    }

    const location = await prisma.location.update({
      where: { id },
      data: data as any,
      include: { needs: true, locationUpdates: true },
    });

    return { data: normalizeLocation(location) };
  });

  fastify.post("/locations/:id/images", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      url?: string;
      content?: string;
      userId?: string;
    };

    const url = body.url?.trim();
    if (!url) {
      return reply.status(400).send({ message: "Thiếu URL ảnh." });
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Location not found" });
    }

    const userId = body.userId || existing.reportedById || existing.verifiedById;

    const location = await prisma.location.update({
      where: { id },
      data: {
        locationUpdates: {
          create: {
            userId: userId || undefined,
            imageUrl: url,
            content: body.content?.trim() || null,
          },
        },
      } as any,
      include: detailInclude as any,
    });

    return reply.status(201).send({ data: normalizeLocation(location) });
  });

  // DELETE /locations/:id — remove a location
  fastify.delete("/locations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Location not found" });
    }

    await prisma.location.delete({ where: { id } });
    return { message: "Location deleted" };
  });

  // POST /locations/:id/confirm — re-confirm a location (extends expiry for BLOCKED_ROAD)
  fastify.post("/locations/:id/confirm", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Location not found" });
    }

    const updateData: Record<string, unknown> = {
      status: "ACTIVE",
    };

    // Re-extend expiry for blocked roads
    if (existing.type === "BLOCKED_ROAD") {
      updateData.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    const location = await prisma.location.update({
      where: { id },
      data: updateData as any,
      include: { needs: true, locationUpdates: true },
    });

    if (existing.type === "BLOCKED_ROAD" && location.expiresAt) {
      await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
        type: "BLOCKED_ROAD_EXPIRY_EXTENDED",
        title: "Điểm chặn đường đã được xác nhận lại",
        message: `${location.name} đã gia hạn thời hạn xác nhận.`,
        link: "/admin/locations",
        metadata: { locationId: location.id, expiresAt: location.expiresAt },
      });
    }

    return { data: normalizeLocation(location) };
  });

  // PATCH /locations/updates/:updateId — update a location update
  fastify.patch("/locations/updates/:updateId", async (request, reply) => {
    const { updateId } = request.params as { updateId: string };
    const body = request.body as { imageUrl?: string; content?: string };

    const existingUpdate = await prisma.locationUpdate.findUnique({
      where: { id: updateId },
    });

    if (!existingUpdate) {
      return reply.status(404).send({ message: "Location update not found" });
    }

    const updatedUpdate = await prisma.locationUpdate.update({
      where: { id: updateId },
      data: {
        imageUrl: body.imageUrl !== undefined ? body.imageUrl.trim() || null : undefined,
        content: body.content !== undefined ? body.content : undefined,
      },
    });

    return { data: updatedUpdate };
  });

  // DELETE /locations/updates/:updateId — delete a location update
  fastify.delete("/locations/updates/:updateId", async (request, reply) => {
    const { updateId } = request.params as { updateId: string };

    const update = await prisma.locationUpdate.findUnique({
      where: { id: updateId },
    });

    if (!update) {
      return reply.status(404).send({ message: "Location update not found" });
    }

    await prisma.locationUpdate.delete({
      where: { id: updateId },
    });

    return { message: "Location update deleted" };
  });
}
