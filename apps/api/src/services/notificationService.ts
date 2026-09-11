import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";

export type NotificationRecipient = {
  kind: "USER" | "ADMIN";
  id: string;
};

export type NotificationInput = {
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type NotificationRecord = NotificationInput & {
  id: string;
  recipientKind: "USER" | "ADMIN";
  userId: string | null;
  adminUserId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function roomFor(recipient: NotificationRecipient) {
  return `${recipient.kind === "ADMIN" ? "admin" : "volunteer"}:${recipient.id}`;
}

function toPayload(row: NotificationRecord) {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    readAt: row.readAt instanceof Date ? row.readAt.toISOString() : row.readAt,
  };
}

export async function createNotification(
  fastify: FastifyInstance,
  recipient: NotificationRecipient,
  input: NotificationInput,
) {
  const prisma = fastify.prisma as any;
  const id = randomUUID();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  const [row] = await prisma.$queryRawUnsafe(
    `INSERT INTO "Notification" (
      "id", "recipientKind", "userId", "adminUserId", "type", "title", "message", "link", "metadata", "createdAt"
    )
    VALUES (
      $1,
      $2::"NotificationRecipientKind",
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9::jsonb,
      NOW()
    )
    RETURNING *`,
    id,
    recipient.kind,
    recipient.kind === "USER" ? recipient.id : null,
    recipient.kind === "ADMIN" ? recipient.id : null,
    input.type,
    input.title,
    input.message,
    input.link ?? null,
    metadata,
  ) as NotificationRecord[];

  fastify.io?.to(roomFor(recipient)).emit("notification:new", toPayload(row));
  return row;
}

export async function notifyUsers(
  fastify: FastifyInstance,
  userIds: string[],
  input: NotificationInput,
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  return Promise.all(uniqueIds.map((id) => createNotification(fastify, { kind: "USER", id }, input)));
}

export async function notifyAdminsByRoles(
  fastify: FastifyInstance,
  roles: string[],
  input: NotificationInput,
) {
  const prisma = fastify.prisma as any;
  const uniqueRoles = [...new Set(["ADMIN", ...roles])];
  const placeholders = uniqueRoles.map((_, index) => `$${index + 1}::"UserRole"`).join(", ");
  const admins = await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "AdminUser" WHERE "role" IN (${placeholders})`,
    ...uniqueRoles,
  ) as Array<{ id: string }>;

  return Promise.all(admins.map((admin) => createNotification(fastify, { kind: "ADMIN", id: admin.id }, input)));
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    CHO_TIEP_NHAN: "chờ tiếp nhận",
    DANG_TUYEN: "đang tuyển",
    DA_DU_DOI: "đã đủ đội",
    DA_DU_HANG: "đã đủ hàng",
    SAN_SANG: "sẵn sàng",
    DANG_THUC_HIEN: "đang thực hiện",
    DANG_XU_LY: "đang xử lý",
    HOAN_THANH: "hoàn thành",
    HUY_BO: "hủy bỏ",
    HOAT_DONG: "hoạt động",
    TAM_DUNG: "tạm dừng",
    KHOA: "khóa",
    CHO_DUYET: "chờ duyệt",
    PENDING: "chờ xử lý",
    ACTIVE: "đang hoạt động",
    DONE: "hoàn tất",
    CANCELLED: "đã hủy",
    THANH_CONG: "thành công",
    THAT_BAI: "thất bại",
    CHO_DOI_SOAT: "chờ đối soát",
  };
  return labels[status] ?? status;
}

function rescueRequestLabel(item: { id: string; code?: string | null }) {
  return `Yêu cầu cứu trợ #${item.code || item.id.slice(0, 5).toUpperCase()}`;
}

export function startNotificationWatchers(fastify: FastifyInstance) {
  const prisma = fastify.prisma as any;

  async function notifyTeamFormationDeadline() {
    const requests = await prisma.$queryRawUnsafe(
      `SELECT rr."id", rr."code", rr."name", rr."priority", rr."submittedAt"
       FROM "RescueRequest" rr
       WHERE rr."status"::text = 'DANG_THUC_HIEN'
         AND rr."submittedAt" <= NOW() - INTERVAL '90 minutes'
         AND NOT EXISTS (
           SELECT 1 FROM "Mission" m WHERE m."requestId" = rr."id"
         )
         AND NOT EXISTS (
           SELECT 1 FROM "Notification" n
           WHERE n."type" = 'TEAM_FORMATION_DEADLINE_SOON'
             AND n."metadata" @> jsonb_build_object('rescueRequestId', rr."id")
         )
       ORDER BY rr."submittedAt" ASC
       LIMIT 20`,
    ) as Array<{ id: string; code?: string | null; name: string; priority: string; submittedAt: Date }>;

    for (const rescueRequest of requests) {
      await notifyAdminsByRoles(fastify, ["ADMIN_YCCT", "ADMIN_TNV"], {
        type: "TEAM_FORMATION_DEADLINE_SOON",
        title: "Sắp hết hạn lập đội cho nhiệm vụ",
        message: `${rescueRequestLabel(rescueRequest)} đã chờ lập đội hơn 90 phút.`,
        link: "/admin/needs",
        metadata: {
          rescueRequestId: rescueRequest.id,
          priority: rescueRequest.priority,
          submittedAt: rescueRequest.submittedAt,
          slaMinutes: 120,
        },
      });
    }
  }

  const interval = setInterval(() => {
    notifyTeamFormationDeadline().catch((error) => fastify.log.error(error, "Failed to check notification deadlines"));
  }, 5 * 60 * 1000);

  notifyTeamFormationDeadline().catch((error) => fastify.log.error(error, "Failed to check notification deadlines"));

  fastify.addHook("onClose", async () => {
    clearInterval(interval);
  });
}
