import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance) {
  const prisma = new PrismaClient({
    log: fastify.log.level === "debug" ? ["query", "info", "warn", "error"] : ["warn", "error"],
  });

  await prisma.$connect();
  fastify.log.info("Prisma connected to database");

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
    fastify.log.info("Prisma disconnected");
  });
}

export default fp(prismaPlugin, { name: "prisma" });
