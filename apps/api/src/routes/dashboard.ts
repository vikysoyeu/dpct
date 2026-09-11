import { FastifyInstance } from "fastify";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  // GET /dashboard/stats — aggregated stats for admin dashboard
  fastify.get("/dashboard/stats", async () => {
    const [
      activeLocations,
      unmetNeeds,
      availableVolunteers,
      totalVolunteers,
      pendingLocations,
      totalVolunteerTeams,
    ] = await Promise.all([
      prisma.location.count({ where: { status: "ACTIVE" } }),
      prisma.need.count({ where: { status: "UNMET" } }),
      (prisma as any).volunteer.count({ where: { status: "AVAILABLE" } }),
      (prisma as any).volunteer.count(),
      prisma.location.count({ where: { status: "PENDING" } }),
      prisma.volunteerTeam.count(),
    ]);

    return {
      data: {
        activeLocations,
        pendingLocations,
        unmetNeeds,
        availableVolunteers,
        totalVolunteers,
        totalVolunteerTeams,
      },
    };
  });
}
