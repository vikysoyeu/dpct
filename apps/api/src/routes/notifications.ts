import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

async function requireAccount(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  if (request.user.kind !== "admin" && request.user.kind !== "volunteer") {
    return reply.status(403).send({ message: "Account access required" });
  }
}

function recipientWhere(user: FastifyRequest["user"]) {
  if (user.kind === "admin") {
    return {
      field: `"adminUserId"`,
      kind: "ADMIN",
    };
  }

  return {
    field: `"userId"`,
    kind: "USER",
  };
}

function notificationDto(row: any) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    readAt: row.readAt?.toISOString?.() ?? row.readAt,
  };
}

export default async function notificationRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  fastify.get("/notifications", { preHandler: [requireAccount] }, async (request) => {
    const { limit = "20" } = request.query as { limit?: string };
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const recipient = recipientWhere(request.user);

    const [rows, countRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT *
         FROM "Notification"
         WHERE "recipientKind" = $1::"NotificationRecipientKind"
           AND ${recipient.field} = $2
         ORDER BY "createdAt" DESC
         LIMIT $3`,
        recipient.kind,
        request.user.sub,
        pageSize,
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS "count"
         FROM "Notification"
         WHERE "recipientKind" = $1::"NotificationRecipientKind"
           AND ${recipient.field} = $2
           AND "readAt" IS NULL`,
        recipient.kind,
        request.user.sub,
      ),
    ]);

    return {
      data: rows.map(notificationDto),
      unreadCount: countRows[0]?.count ?? 0,
    };
  });

  fastify.get("/notifications/unread-count", { preHandler: [requireAccount] }, async (request) => {
    const recipient = recipientWhere(request.user);
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS "count"
       FROM "Notification"
       WHERE "recipientKind" = $1::"NotificationRecipientKind"
         AND ${recipient.field} = $2
         AND "readAt" IS NULL`,
      recipient.kind,
      request.user.sub,
    );

    return { unreadCount: rows[0]?.count ?? 0 };
  });

  fastify.patch("/notifications/:id/read", { preHandler: [requireAccount] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const recipient = recipientWhere(request.user);
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "Notification"
       SET "readAt" = COALESCE("readAt", NOW())
       WHERE "id" = $1
         AND "recipientKind" = $2::"NotificationRecipientKind"
         AND ${recipient.field} = $3
       RETURNING *`,
      id,
      recipient.kind,
      request.user.sub,
    );

    if (!rows[0]) return reply.status(404).send({ message: "Không tìm thấy thông báo." });
    return { data: notificationDto(rows[0]) };
  });

  fastify.patch("/notifications/read-all", { preHandler: [requireAccount] }, async (request) => {
    const recipient = recipientWhere(request.user);
    await prisma.$executeRawUnsafe(
      `UPDATE "Notification"
       SET "readAt" = COALESCE("readAt", NOW())
       WHERE "recipientKind" = $1::"NotificationRecipientKind"
         AND ${recipient.field} = $2
         AND "readAt" IS NULL`,
      recipient.kind,
      request.user.sub,
    );

    return { ok: true };
  });
}
