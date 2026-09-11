import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdminRole: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireVolunteer: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username?: string; role?: string; kind?: "admin" | "volunteer" };
    user: { sub: string; username?: string; role?: string; kind?: "admin" | "volunteer" };
  }
}

function hasAdminRole(userRole: string | undefined, allowed: string[]) {
  return userRole === "ADMIN" || (!!userRole && allowed.includes(userRole));
}

async function jwtPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change_me") {
    fastify.log.warn("JWT_SECRET is not set or is using the default value. Set a strong secret in production.");
  }

  await fastify.register(fjwt, {
    secret: secret || "dev-fallback-secret",
    sign: { expiresIn: "24h" },
  });

  fastify.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    if (request.user.kind !== "admin") {
      return reply.status(403).send({ message: "Admin access required" });
    }
  });

  fastify.decorate("requireAdminRole", (roles: string[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    if (request.user.kind !== "admin") {
      return reply.status(403).send({ message: "Admin access required" });
    }

    let role = request.user.role;
    if (!role) {
      const rows = await (fastify as any).prisma.$queryRawUnsafe(
        `SELECT "role"::text AS "role" FROM "AdminUser" WHERE "id" = $1 LIMIT 1`,
        request.user.sub,
      ) as Array<{ role: string }>;
      role = rows[0]?.role;
    }

    if (!hasAdminRole(role, roles)) {
      return reply.status(403).send({ message: "Không có quyền truy cập chức năng này." });
    }
  });

  fastify.decorate("requireVolunteer", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    if (request.user.kind !== "volunteer" || request.user.role !== "VOLUNTEER") {
      return reply.status(403).send({ message: "Volunteer access required" });
    }
  });
}

export default fp(jwtPlugin, { name: "jwt" });
