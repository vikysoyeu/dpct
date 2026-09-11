import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import socketPlugin from "./plugins/socket.js";
import locationRoutes from "./routes/locations.js";
import needRoutes from "./routes/needs.js";
import volunteerRoutes from "./routes/volunteers.js";
import volunteerTeamRoutes from "./routes/volunteer-teams.js";
import inventoryRoutes from "./routes/inventory.js";
import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/auth.js";
import routeRoutes from "./routes/route.js";
import geocodeRoutes from "./routes/geocode.js";
import uploadRoutes from "./routes/upload.js";
import volunteerPortalRoutes from "./routes/volunteer-portal.js";
import fundRoutes from "./routes/fund.js";
import adminRescueRoutes from "./routes/admin-rescue.js";
import publicRescueRoutes from "./routes/public-rescue.js";
import notificationRoutes from "./routes/notifications.js";
import adminEmailRoutes from "./routes/admin-email.js";
import { startNotificationWatchers } from "./services/notificationService.js";

const app = Fastify({ logger: true });

function getAllowedOrigins() {
  const origins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function start() {
  try {
    // CORS — allow frontend to call API
    await app.register(cors, {
      origin: getAllowedOrigins(),
      credentials: true,
    });

    // Database
    await app.register(prismaPlugin);
    await app.register(jwtPlugin);
    await app.register(socketPlugin);

    // Routes
    await app.register(locationRoutes);
    await app.register(needRoutes);
    await app.register(volunteerRoutes);
    await app.register(volunteerTeamRoutes);
    await app.register(inventoryRoutes);
    await app.register(dashboardRoutes);
    await app.register(authRoutes);
    await app.register(routeRoutes);
    await app.register(geocodeRoutes);
    await app.register(uploadRoutes);
    await app.register(volunteerPortalRoutes);
    await app.register(fundRoutes);
    await app.register(publicRescueRoutes);
    await app.register(adminRescueRoutes);
    await app.register(adminEmailRoutes);
    await app.register(notificationRoutes);
    startNotificationWatchers(app);

    // Health check
    app.get("/health", async () => ({
      status: "ok",
      phase: "basic-backend",
      message: "API with database integration is running.",
    }));

    const port = Number(process.env.PORT ?? 3001);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`API listening on :${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
