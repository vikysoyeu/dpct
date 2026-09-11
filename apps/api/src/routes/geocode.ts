import { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveGeocode, searchGeocode } from "../services/geocodingService.js";

const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3).max(200),
  province: z.string().trim().min(1).max(120).optional(),
  ward: z.string().trim().min(1).max(120).optional(),
  lat: z.coerce.number().finite().optional(),
  lng: z.coerce.number().finite().optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

const resolveQuerySchema = z.object({
  id: z.string().min(3).max(2000),
});

export default async function geocodeRoutes(fastify: FastifyInstance) {
  fastify.get("/geocode/resolve", async (request, reply) => {
    const parsed = resolveQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Invalid geocode resolve query",
        issues: parsed.error.flatten(),
      });
    }

    try {
      const data = await resolveGeocode(parsed.data.id);
      if (!data) return reply.status(404).send({ message: "Không tìm thấy tọa độ cho địa điểm này." });
      return { data };
    } catch (error) {
      fastify.log.error({ error }, "Geocode resolve failed");
      return reply.status(502).send({
        message: "Không thể lấy tọa độ địa điểm lúc này.",
      });
    }
  });

  fastify.get("/geocode", async (request, reply) => {
    const parsed = geocodeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Invalid geocode query",
        issues: parsed.error.flatten(),
      });
    }

    try {
      return await searchGeocode(parsed.data);
    } catch (error) {
      fastify.log.error({ error }, "Geocoding failed");
      return reply.status(502).send({
        message: "Không thể tìm địa chỉ lúc này.",
      });
    }
  });
}
