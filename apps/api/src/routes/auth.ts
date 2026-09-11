import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { notifyAdminsByRoles } from "../services/notificationService.js";
import { sendAutomaticEmail } from "../services/emailService.js";
import { volunteerDto, volunteerSelect } from "../utils/volunteer.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const volunteerLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const volunteerForgotPasswordSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
});

const volunteerResetPasswordSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  code: z.string().trim().regex(/^\d{6}$/, "Mã xác thực phải gồm 6 chữ số"),
  password: z.string().min(6),
});
const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$|^(0|\+84)2\d{9}$/;

const volunteerRegisterSchema = z.object({
  name: z.string().min(1, "Họ tên bắt buộc nhập").max(100, "Họ tên tối đa 100 ký tự"),
  password: z.string().min(6),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ"),
});

const volunteerProfileSchema = z.object({
  password: z.string().min(6).optional().or(z.literal("")),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không hợp lệ").optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
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
  emergencyContactPhone: z.string().trim().regex(phoneRegex, "Số điện thoại khẩn cấp không hợp lệ").optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "ON_MISSION", "RESTING"]).optional(),
});

const createAdminSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100),
  role: z.enum(["ADMIN", "ADMIN_TNV", "ADMIN_YCCT", "ADMIN_KHO"]).default("ADMIN_TNV"),
});

const updateAdminSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "ADMIN_TNV", "ADMIN_YCCT", "ADMIN_KHO"]).optional(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  const profileSelect = volunteerSelect(true);

  function emptyToUndefined(value: string | undefined) {
    return value && value.trim() ? value.trim() : undefined;
  }

  function toDateOrUndefined(value: string | undefined) {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  function resetCodeHash(email: string, code: string) {
    return createHash("sha256")
      .update(`${email.trim().toLowerCase()}:${code}:${process.env.JWT_SECRET ?? "dpct"}`)
      .digest("hex");
  }

  function newResetCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  async function getAdminRole(adminId: string) {
    const rows = await (fastify.prisma as any).$queryRawUnsafe(
      `SELECT "role"::text AS "role" FROM "AdminUser" WHERE "id" = $1 LIMIT 1`,
      adminId,
    ) as Array<{ role: string }>;
    return rows[0]?.role ?? "ADMIN";
  }

  async function getAdminDto(adminId: string) {
    const rows = await (fastify.prisma as any).$queryRawUnsafe(
      `SELECT "id", "username", "displayName", "role"::text AS "role", "createdAt", "updatedAt"
       FROM "AdminUser"
       WHERE "id" = $1
       LIMIT 1`,
      adminId,
    ) as Array<{
      id: string;
      username: string;
      displayName: string;
      role: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    return rows[0] ?? null;
  }

  // ── Public ──────────────────────────────────────────────────────────

  /** Admin login */
  fastify.post("/auth/admin/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Username và password là bắt buộc." });
    }

    const { username, password } = body.data;

    const admin = await fastify.prisma.adminUser.findUnique({
      where: { username },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return reply.status(401).send({ message: "Sai tên đăng nhập hoặc mật khẩu." });
    }

    const adminRole = await getAdminRole(admin.id);
    const token = fastify.jwt.sign({
      sub: admin.id,
      username: admin.username,
      role: adminRole,
      kind: "admin",
    });

    return { token, admin: { id: admin.id, username: admin.username, displayName: admin.displayName, role: adminRole } };
  });

  /** Volunteer register */
  fastify.post("/auth/volunteer/register", async (request, reply) => {
    const body = volunteerRegisterSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu đăng ký không hợp lệ.", errors: body.error.flatten() });
    }

    const input = body.data;
    const prisma = fastify.prisma as any;
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: input.phone },
          { email: input.email },
        ],
      },
    });

    if (existing) {
      return reply.status(409).send({ message: "Username, email hoặc số điện thoại đã được sử dụng." });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const volunteer = await prisma.volunteer.create({
      data: {
        accountStatus: "CHO_DUYET",
        skills: [],
        user: {
          create: {
            username: `vol-${input.phone}`,
            passwordHash,
            email: input.email,
            role: "VOLUNTEER",
            name: input.name,
            phone: input.phone,
          },
        },
      },
      select: profileSelect,
    });
    const dto = volunteerDto(volunteer);

    const token = fastify.jwt.sign({
      sub: dto.id,
      username: dto.username ?? undefined,
      role: "VOLUNTEER",
      kind: "volunteer",
    });

    await notifyAdminsByRoles(fastify, ["ADMIN_TNV"], {
      type: "VOLUNTEER_REGISTERED",
      title: "TNV mới đăng ký tài khoản",
      message: `${dto.email ?? dto.phone} đang chờ duyệt tài khoản tình nguyện viên.`,
      link: "/admin/resources",
      metadata: { volunteerId: dto.id },
    });

    return reply.status(201).send({ token, volunteer: dto });
  });

  /** Volunteer login */
  fastify.post("/auth/volunteer/login", async (request, reply) => {
    const body = volunteerLoginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Tên đăng nhập/SĐT và mật khẩu là bắt buộc." });
    }

    const { identifier, password } = body.data;
    const prisma = fastify.prisma as any;
    const user = await prisma.user.findFirst({
      where: {
        role: "VOLUNTEER",
        OR: [{ username: identifier }, { phone: identifier }, { email: identifier }],
      },
      include: { volunteerProfile: true },
    });
    const volunteer = user?.volunteerProfile;

    if (!user?.passwordHash || !volunteer || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ message: "Sai thông tin đăng nhập hoặc mật khẩu." });
    }

    if (volunteer.accountStatus === "KHOA") {
      return reply.status(403).send({ message: "Tài khoản tình nguyện viên đang bị khóa." });
    }

    const token = fastify.jwt.sign({
      sub: volunteer.id,
      username: user.username ?? undefined,
      role: "VOLUNTEER",
      kind: "volunteer",
    });

    const profile = await prisma.volunteer.findUnique({
      where: { id: volunteer.id },
      select: profileSelect,
    });

    return { token, volunteer: volunteerDto(profile) };
  });

  /** Request volunteer password reset code */
  fastify.post("/auth/volunteer/forgot-password", async (request, reply) => {
    const body = volunteerForgotPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Email không hợp lệ.", errors: body.error.flatten() });
    }

    const emailInput = body.data.email.trim();
    const email = emailInput.toLowerCase();
    const prisma = fastify.prisma as any;
    const user = await prisma.user.findFirst({
      where: { role: "VOLUNTEER", email: { equals: emailInput, mode: "insensitive" } },
      include: { volunteerProfile: true },
    });

    const genericResponse = { message: "Nếu email thuộc tài khoản TNV, hệ thống đã gửi mã xác thực đặt lại mật khẩu." };
    if (!user?.volunteerProfile) return genericResponse;
    if (user.volunteerProfile.accountStatus === "KHOA") {
      return reply.status(403).send({ message: "Tài khoản tình nguyện viên đang bị khóa." });
    }

    const code = newResetCode();
    const codeHash = resetCodeHash(email, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const resetId = randomUUID();

    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `UPDATE "VolunteerPasswordResetCode"
         SET "usedAt" = NOW(), "updatedAt" = NOW()
         WHERE "userId" = $1 AND "usedAt" IS NULL`,
        user.id,
      ),
      prisma.$executeRawUnsafe(
        `INSERT INTO "VolunteerPasswordResetCode" ("id", "userId", "email", "codeHash", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        resetId,
        user.id,
        email,
        codeHash,
        expiresAt,
      ),
    ]);

    await sendAutomaticEmail(fastify, {
      trigger: "VOLUNTEER_PASSWORD_RESET",
      to: email,
      recipientName: user.name,
      recipientUserId: user.id,
      variables: {
        code,
        volunteerName: user.name,
        expiresInMinutes: 10,
      },
      metadata: { volunteerId: user.volunteerProfile.id },
      idempotencyKey: `volunteer-password-reset:${resetId}`,
    });

    return genericResponse;
  });

  /** Reset volunteer password with email code */
  fastify.post("/auth/volunteer/reset-password", async (request, reply) => {
    const body = volunteerResetPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu đặt lại mật khẩu không hợp lệ.", errors: body.error.flatten() });
    }

    const email = body.data.email.toLowerCase();
    const codeHash = resetCodeHash(email, body.data.code);
    const prisma = fastify.prisma as any;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT prc."id", prc."userId", u."name", v."id" AS "volunteerId", v."accountStatus"::text AS "accountStatus"
       FROM "VolunteerPasswordResetCode" prc
       JOIN "User" u ON u."id" = prc."userId"
       JOIN "Volunteer" v ON v."userId" = u."id"
       WHERE prc."email" = $1
         AND prc."codeHash" = $2
         AND prc."usedAt" IS NULL
         AND prc."expiresAt" > NOW()
         AND u."role" = 'VOLUNTEER'::"UserRole"
       ORDER BY prc."createdAt" DESC
       LIMIT 1`,
      email,
      codeHash,
    ) as Array<{ id: string; userId: string; name: string; volunteerId: string; accountStatus: string }>;
    const reset = rows[0];

    if (!reset) {
      return reply.status(400).send({ message: "Mã xác thực không đúng hoặc đã hết hạn." });
    }
    if (reset.accountStatus === "KHOA") {
      return reply.status(403).send({ message: "Tài khoản tình nguyện viên đang bị khóa." });
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.$executeRawUnsafe(
        `UPDATE "VolunteerPasswordResetCode"
         SET "usedAt" = NOW(), "updatedAt" = NOW()
         WHERE "id" = $1`,
        reset.id,
      ),
    ]);

    return { message: "Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới." };
  });

  /** Verify current token — used by frontend to check session validity */
  fastify.get("/auth/admin/me", { preHandler: [fastify.requireAdmin] }, async (request) => {
    const admin = await getAdminDto(request.user.sub);

    if (!admin) {
      throw { statusCode: 401, message: "Admin not found" };
    }

    return admin;
  });

  /** Verify current volunteer token */
  fastify.get("/auth/volunteer/me", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const prisma = fastify.prisma as any;
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: request.user.sub },
      select: profileSelect,
    });

    if (!volunteer) {
      return reply.status(401).send({ message: "Volunteer not found" });
    }

    return volunteerDto(volunteer);
  });

  /** Update current volunteer profile */
  fastify.patch("/auth/volunteer/me", { preHandler: [fastify.requireVolunteer] }, async (request, reply) => {
    const body = volunteerProfileSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu hồ sơ không hợp lệ.", errors: body.error.flatten() });
    }

    const input = body.data;
    const data: Record<string, unknown> = {};
    const assignText = (key: string) => {
      if (key in input) data[key] = emptyToUndefined((input as Record<string, string | undefined>)[key]) ?? null;
    };

    const userData: Record<string, unknown> = {};
    if (input.name !== undefined) userData.name = input.name;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.email !== undefined) userData.email = emptyToUndefined(input.email) ?? null;
    if (input.dateOfBirth !== undefined) data.dateOfBirth = toDateOrUndefined(input.dateOfBirth) ?? null;
    if (input.skills !== undefined) data.skills = input.skills;
    if (input.status !== undefined) data.status = input.status;
    ["gender", "address", "city", "ward", "vehicleType", "availability", "experience", "emergencyContactName", "emergencyContactPhone"].forEach(assignText);

    if (input.password) {
      userData.passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (Object.keys(data).length === 0 && Object.keys(userData).length === 0) {
      return reply.status(400).send({ message: "Không có gì để cập nhật." });
    }

    const prisma = fastify.prisma as any;
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

  // ── Admin CRUD (requires auth) ──────────────────────────────────────

  /** List all admin accounts */
  fastify.get("/auth/admin/users", { preHandler: [fastify.requireAdminRole(["ADMIN"])] }, async () => {
    return (fastify.prisma as any).$queryRawUnsafe(
      `SELECT "id", "username", "displayName", "role"::text AS "role", "createdAt", "updatedAt"
       FROM "AdminUser"
       ORDER BY "createdAt" ASC`,
    );
  });

  /** Create a new admin account */
  fastify.post("/auth/admin/users", { preHandler: [fastify.requireAdminRole(["ADMIN"])] }, async (request, reply) => {
    const body = createAdminSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu không hợp lệ.", errors: body.error.flatten() });
    }

    const { username, password, displayName, role } = body.data;

    const existing = await fastify.prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      return reply.status(409).send({ message: "Username đã tồn tại." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await fastify.prisma.adminUser.create({
      data: { username, passwordHash, displayName },
      select: { id: true },
    });

    await (fastify.prisma as any).$executeRawUnsafe(
      `UPDATE "AdminUser" SET "role" = $1::"UserRole" WHERE "id" = $2`,
      role,
      admin.id,
    );

    return reply.status(201).send(await getAdminDto(admin.id));
  });

  /** Update an admin account */
  fastify.patch("/auth/admin/users/:id", { preHandler: [fastify.requireAdminRole(["ADMIN"])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateAdminSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: "Dữ liệu không hợp lệ.", errors: body.error.flatten() });
    }

    const data: Record<string, unknown> = {};
    if (body.data.displayName) data.displayName = body.data.displayName;
    if (body.data.password) data.passwordHash = await bcrypt.hash(body.data.password, 10);

    if (Object.keys(data).length === 0 && !body.data.role) {
      return reply.status(400).send({ message: "Không có gì để cập nhật." });
    }

    if (Object.keys(data).length > 0) {
      await fastify.prisma.adminUser.update({
        where: { id },
        data,
      });
    }

    if (body.data.role) {
      await (fastify.prisma as any).$executeRawUnsafe(
        `UPDATE "AdminUser" SET "role" = $1::"UserRole" WHERE "id" = $2`,
        body.data.role,
        id,
      );
    }

    return getAdminDto(id);
  });

  /** Delete an admin account */
  fastify.delete("/auth/admin/users/:id", { preHandler: [fastify.requireAdminRole(["ADMIN"])] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Prevent deleting yourself
    if (id === request.user.sub) {
      return reply.status(400).send({ message: "Không thể xóa chính tài khoản đang đăng nhập." });
    }

    const count = await fastify.prisma.adminUser.count();
    if (count <= 1) {
      return reply.status(400).send({ message: "Không thể xóa tài khoản admin cuối cùng." });
    }

    await fastify.prisma.adminUser.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── OTP placeholders (unchanged) ───────────────────────────────────

  fastify.post("/auth/request-otp", async (_request, reply) => {
    return reply.status(501).send({
      message: "OTP authentication not yet implemented. Planned for auth phase.",
    });
  });

  fastify.post("/auth/verify-otp", async (_request, reply) => {
    return reply.status(501).send({
      message: "OTP verification not yet implemented. Planned for auth phase.",
    });
  });
}
