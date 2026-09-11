import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

function getAllowedOrigins() {
  const origins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function socketPlugin(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== "string") {
        return next(new Error("Unauthorized"));
      }

      const payload = fastify.jwt.verify<{ sub: string; kind?: "admin" | "volunteer"; role?: string }>(token);
      socket.data.user = payload;
      socket.join(`${payload.kind}:${payload.sub}`);
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  fastify.decorate("io", io);

  fastify.addHook("onClose", async () => {
    io.close();
  });
}

export default fp(socketPlugin, { name: "socket" });
