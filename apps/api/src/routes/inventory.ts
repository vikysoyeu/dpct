import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendAutomaticEmail } from "../services/emailService.js";

const assignmentSchema = z.object({
  items: z.array(z.object({
    itemCategoryId: z.string().trim().min(1),
    quantity: z.number().int().min(0),
  })).default([]),
});

function missionStatusAfterGoodsReady(currentStatus: string, hasGoods: boolean, hasTeam: boolean) {
  if (["DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"].includes(currentStatus)) return currentStatus;
  if (hasGoods && hasTeam) return "SAN_SANG";
  if (hasGoods) return "DA_DU_HANG";
  if (hasTeam) return "DA_DU_DOI";
  if (["DA_DU_HANG", "SAN_SANG"].includes(currentStatus)) return "DANG_TUYEN";
  return currentStatus;
}

export default async function inventoryRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  function extractLatestSponsorshipNote(notes?: string | null) {
    if (!notes) return { requestLabel: null, goodsNote: null };
    const sections = notes.split(/\n\n+/).filter((section) => section.includes("Tài trợ hàng hóa"));
    const latest = sections[sections.length - 1] ?? "";
    const requestLine = latest.split(/\r?\n/).find((line) => line.startsWith("Yêu cầu cứu trợ:"));
    return {
      requestLabel: requestLine ? requestLine.replace("Yêu cầu cứu trợ:", "").trim() : null,
      goodsNote: latest || null,
    };
  }

  function sponsorshipDto(item: any) {
    const note = extractLatestSponsorshipNote(item.donor?.notes);
    return {
      id: `${item.donorId}:${item.itemCategoryId}`,
      donorId: item.donorId,
      itemCategoryId: item.itemCategoryId,
      quantity: item.quantity,
      unit: item.unit,
      status: item.status,
      donor: item.donor,
      itemCategory: item.itemCategory,
      requestLabel: note.requestLabel,
      goodsNote: note.goodsNote,
    };
  }

  function mergeAssignmentItems(items: Array<{ itemCategoryId: string; quantity: number }>) {
    const quantityByCategory = new Map<string, number>();
    for (const item of items) {
      quantityByCategory.set(item.itemCategoryId, (quantityByCategory.get(item.itemCategoryId) ?? 0) + item.quantity);
    }
    return [...quantityByCategory]
      .filter(([, quantity]) => quantity > 0)
      .map(([itemCategoryId, quantity]) => ({ itemCategoryId, quantity }));
  }

  async function stockByCategory(itemCategoryIds: string[]) {
    if (itemCategoryIds.length === 0) return [];
    const categories = await prisma.itemCategory.findMany({
      where: { id: { in: itemCategoryIds } },
      orderBy: { name: "asc" },
    });
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        OR: categories.map((category) => ({
          item: { equals: category.name, mode: "insensitive" },
          unit: category.unit,
        })),
      } as any,
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ item: "asc" }, { updatedAt: "asc" }],
    });

    return categories.map((category) => {
      const matching = inventory.filter((item) => item.item.toLowerCase() === category.name.toLowerCase() && item.unit === category.unit);
      return {
        itemCategoryId: category.id,
        availableQuantity: matching.reduce((sum, item) => sum + item.quantity, 0),
        inventoryItems: matching,
      };
    });
  }

  async function consumeInventory(tx: any, category: { name: string; unit: string }, quantity: number) {
    let remaining = quantity;
    const rows = await tx.inventoryItem.findMany({
      where: {
        item: { equals: category.name, mode: "insensitive" },
        unit: category.unit,
        quantity: { gt: 0 },
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    });

    const available = rows.reduce((sum: number, row: any) => sum + row.quantity, 0);
    if (available < quantity) {
      throw new Error(`Tồn kho ${category.name} chỉ còn ${available} ${category.unit}.`);
    }

    for (const row of rows) {
      if (remaining <= 0) break;
      const deducted = Math.min(row.quantity, remaining);
      await tx.inventoryItem.update({
        where: { id: row.id },
        data: { quantity: { decrement: deducted } },
      });
      remaining -= deducted;
    }
  }

  async function returnInventory(tx: any, mission: { locationId: string }, category: { name: string; unit: string }, quantity: number) {
    if (quantity <= 0) return;
    const existing = await tx.inventoryItem.findFirst({
      where: {
        locationId: mission.locationId,
        item: { equals: category.name, mode: "insensitive" },
        unit: category.unit,
      },
    });
    if (existing) {
      await tx.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
    } else {
      await tx.inventoryItem.create({
        data: {
          locationId: mission.locationId,
          item: category.name,
          quantity,
          unit: category.unit,
        },
      });
    }
  }

  // GET /inventory — all inventory items, optionally filtered by locationId
  fastify.get("/inventory", async (request) => {
    const { locationId } = request.query as { locationId?: string };

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;

    const [data, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: where as any,
        include: { location: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.inventoryItem.count({ where: where as any }),
    ]);

    return { data, total };
  });

  fastify.get("/admin/sponsorships", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request) => {
    const { status } = request.query as { status?: string };
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      if (["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"].includes(status)) {
        where.status = status;
      } else {
        where.missions = { some: { status } };
      }
    }

    const [data, total] = await Promise.all([
      prisma.donorGoods.findMany({
        where: where as any,
        include: {
          donor: true,
          itemCategory: true,
        },
        orderBy: [
          { status: "asc" },
          { donor: { updatedAt: "desc" } },
        ] as any,
      }),
      prisma.donorGoods.count({ where: where as any }),
    ]);

    return { data: data.map(sponsorshipDto), total };
  });

  fastify.patch("/admin/sponsorships/:donorId/:itemCategoryId", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request, reply) => {
    const { donorId, itemCategoryId } = request.params as { donorId: string; itemCategoryId: string };
    const body = request.body as { status?: string; locationId?: string };
    const nextStatus = body.status;

    if (!nextStatus || !["CHO_TIEP_NHAN", "DANG_XU_LY", "HOAN_THANH", "HUY_BO"].includes(nextStatus)) {
      return reply.status(400).send({ message: "Trạng thái tài trợ không hợp lệ." });
    }

    const existing = await prisma.donorGoods.findUnique({
      where: { donorId_itemCategoryId: { donorId, itemCategoryId } },
      include: { itemCategory: true, donor: true },
    });
    if (!existing) return reply.status(404).send({ message: "Không tìm thấy hàng hóa tài trợ." });

    if (nextStatus === "HOAN_THANH" && !body.locationId) {
      return reply.status(400).send({ message: "Vui lòng chọn kho/địa điểm để nhập hàng." });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      if (nextStatus === "HOAN_THANH" && existing.status !== "HOAN_THANH") {
        const location = await tx.location.findUnique({ where: { id: body.locationId } });
        if (!location) throw new Error("Không tìm thấy kho/địa điểm nhập hàng.");

        const inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            locationId: body.locationId,
            item: existing.itemCategory.name,
            unit: existing.unit,
          },
        });

        if (inventoryItem) {
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: { increment: existing.quantity } },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              locationId: body.locationId,
              item: existing.itemCategory.name,
              quantity: existing.quantity,
              unit: existing.unit,
            },
          });
        }
      }

      return tx.donorGoods.update({
        where: { donorId_itemCategoryId: { donorId, itemCategoryId } },
        data: { status: nextStatus },
        include: { donor: true, itemCategory: true },
      });
    });

    if (nextStatus === "HOAN_THANH" && existing.status !== "HOAN_THANH") {
      await sendAutomaticEmail(fastify, {
        trigger: "SPONSORSHIP_APPROVED",
        to: updated.donor?.email,
        recipientName: updated.donor?.name,
        donorId: updated.donorId,
        idempotencyKey: `sponsorship-approved:${updated.donorId}:${updated.itemCategoryId}:${Date.now()}`,
        variables: {
          itemName: updated.itemCategory?.name ?? "Hàng hóa tài trợ",
          quantity: updated.quantity,
          unit: updated.unit,
          donorName: updated.donor?.name ?? "",
          donorPhone: updated.donor?.phone ?? "",
          donorEmail: updated.donor?.email ?? "",
        },
        metadata: { itemCategoryId: updated.itemCategoryId, locationId: body.locationId ?? null },
      });
    }

    return { data: sponsorshipDto(updated) };
  });

  fastify.get("/admin/inventory/mission-assignments", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request) => {
    const { status, statusScope, q } = request.query as { status?: string; statusScope?: "request" | "mission"; q?: string };
    const where: Record<string, unknown> = {
      missions: { some: {} },
    };
    if (status && status !== "ALL") {
      if (statusScope === "mission") {
        where.missions = { some: { status } };
      } else {
        where.status = status;
      }
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { requesterName: { contains: q, mode: "insensitive" } },
        { requesterPhone: { contains: q, mode: "insensitive" } },
        { location: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.rescueRequest.findMany({
        where: where as any,
        include: {
          location: { select: { id: true, name: true, description: true } },
          requestItems: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
          missions: {
            include: {
              itemAssignments: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
              transportations: true,
            },
            orderBy: [{ startedAt: "asc" }, { name: "asc" }] as any,
          },
        },
        orderBy: [{ priority: "desc" }, { submittedAt: "desc" }],
      }),
      prisma.rescueRequest.count({ where: where as any }),
    ]);

    const itemCategoryIds = (await prisma.itemCategory.findMany({ select: { id: true } })).map((item: any) => item.id);
    return { data, total, stockByCategory: await stockByCategory(itemCategoryIds) };
  });

  fastify.patch("/admin/missions/:id/item-assignments", { preHandler: [fastify.requireAdminRole(["ADMIN_KHO"])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = assignmentSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: "Dữ liệu phân bổ hàng không hợp lệ.", errors: body.error.flatten() });

    const inputItems = mergeAssignmentItems(body.data.items);
    try {
      const data = await prisma.$transaction(async (tx: any) => {
        const mission = await tx.mission.findUnique({
          where: { id },
          include: {
            request: true,
            itemAssignments: true,
            rescueTeams: { include: { members: { select: { userId: true } } } },
          },
        });
        if (!mission) throw new Error("Không tìm thấy nhiệm vụ.");
        if (!mission.request) throw new Error("Nhiệm vụ chưa liên kết với yêu cầu cứu trợ.");

        const categories = await tx.itemCategory.findMany({ where: { id: { in: inputItems.map((item) => item.itemCategoryId) } } });
        if (categories.length !== inputItems.length) throw new Error("Danh mục hàng hóa không hợp lệ.");
        const categoryById = new Map<string, { name: string; unit: string }>(categories.map((category: any) => [category.id, category]));
        const existingById = new Map<string, number>(mission.itemAssignments.map((item: any) => [item.itemCategoryId, item.quantity]));
        const nextById = new Map<string, number>(inputItems.map((item) => [item.itemCategoryId, item.quantity]));

        for (const item of inputItems) {
          const category = categoryById.get(item.itemCategoryId);
          if (!category) throw new Error("Danh mục hàng hóa không hợp lệ.");
          const previous = existingById.get(item.itemCategoryId) ?? 0;
          const delta = item.quantity - previous;
          if (delta > 0) await consumeInventory(tx, category, delta);
          if (delta < 0) await returnInventory(tx, mission, category, Math.abs(delta));
          await tx.missionItemAssignment.upsert({
            where: { missionId_itemCategoryId: { missionId: id, itemCategoryId: item.itemCategoryId } },
            update: { quantity: item.quantity },
            create: { missionId: id, itemCategoryId: item.itemCategoryId, quantity: item.quantity },
          });
        }

        for (const existing of mission.itemAssignments) {
          if (!nextById.has(existing.itemCategoryId)) {
            const category = await tx.itemCategory.findUnique({ where: { id: existing.itemCategoryId } });
            if (category) await returnInventory(tx, mission, category, existing.quantity);
            await tx.missionItemAssignment.delete({
              where: { missionId_itemCategoryId: { missionId: id, itemCategoryId: existing.itemCategoryId } },
            });
          }
        }

        const hasGoods = inputItems.reduce((sum, item) => sum + item.quantity, 0) > 0;
        const hasTeam = mission.rescueTeams.some((team: any) => team.members.length > 0);
        await tx.mission.update({
          where: { id },
          data: {
            itemAssignmentsInitialized: true,
            status: missionStatusAfterGoodsReady(mission.status, hasGoods, hasTeam),
          },
        });
        return tx.mission.findUnique({
          where: { id },
          include: {
            itemAssignments: { include: { itemCategory: true }, orderBy: { itemCategory: { name: "asc" } } },
            transportations: true,
          },
        });
      });

      return { data };
    } catch (error) {
      if (error instanceof Error) return reply.status(409).send({ message: error.message });
      throw error;
    }
  });

  // GET /inventory/:id
  fastify.get("/inventory/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { location: { select: { id: true, name: true } } },
    });
    if (!item) {
      return reply.status(404).send({ message: "Inventory item not found" });
    }
    return { data: item };
  });

  // POST /inventory — add an inventory item
  fastify.post("/inventory", async (request, reply) => {
    const body = request.body as {
      locationId: string;
      item: string;
      quantity: number;
      unit: string;
    };

    const item = await prisma.inventoryItem.create({
      data: {
        locationId: body.locationId,
        item: body.item,
        quantity: body.quantity,
        unit: body.unit,
      },
    });

    return reply.status(201).send({ data: item });
  });

  // PATCH /inventory/:id — update quantity etc.
  fastify.patch("/inventory/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Inventory item not found" });
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: body as any,
    });

    return { data: item };
  });

  // DELETE /inventory/:id
  fastify.delete("/inventory/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "Inventory item not found" });
    }

    await prisma.inventoryItem.delete({ where: { id } });
    return { message: "Inventory item deleted" };
  });
}
