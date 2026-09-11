// Route optimization with Valhalla as routing engine.
// Fetches active blocked roads from DB and uses Valhalla avoid_locations.
import { FastifyInstance } from "fastify";

const MAX_ROUTES = 2;

/**
 * Decode a polyline6 encoded string (precision 6, Valhalla default)
 * into an array of [lat, lng] pairs.
 */
function decodePolyline6(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

function buildAvoidPolygon(lat: number, lng: number, radiusMeters = 120): [number, number][] {
  const earthRadius = 6378137;
  const points: [number, number][] = [];
  const segments = 16;

  for (let index = 0; index < segments; index += 1) {
    const bearing = (2 * Math.PI * index) / segments;
    const latOffset = (radiusMeters * Math.cos(bearing)) / earthRadius;
    const lngOffset = (radiusMeters * Math.sin(bearing)) / (earthRadius * Math.cos((lat * Math.PI) / 180));
    points.push([
      lng + (lngOffset * 180) / Math.PI,
      lat + (latOffset * 180) / Math.PI,
    ]);
  }

  points.push(points[0]);
  return points;
}

type RouteLeg = {
  shape?: string;
  summary?: {
    length?: number;
    time?: number;
  };
};

type ValhallaTrip = {
  legs?: RouteLeg[];
};

type NormalizedRoute = {
  coords: [number, number][];
  distance: number;
  duration: number;
};

type ValhallaBody = {
  locations: Array<{ lat: number; lon: number }>;
  costing: string;
  alternates: number;
  format: "osrm";
  shape_format: "polyline6";
  directions_options: {
    units: "kilometers";
    language: string;
  };
  costing_options?: Record<string, unknown>;
  avoid_locations?: Array<{ lat: number; lon: number; radius: number }>;
  exclude_polygons?: unknown;
};

function normalizeTripCandidates(payload: any): ValhallaTrip[] {
  const candidates: ValhallaTrip[] = [];

  if (payload?.trip) {
    candidates.push(payload.trip as ValhallaTrip);
  }

  if (Array.isArray(payload?.alternates)) {
    for (const alt of payload.alternates) {
      if (alt?.trip) {
        candidates.push(alt.trip as ValhallaTrip);
      } else if (alt?.legs) {
        candidates.push(alt as ValhallaTrip);
      }
    }
  }

  return candidates;
}

function decodeRoutesFromOsrm(payload: any): NormalizedRoute[] {
  if (!Array.isArray(payload?.routes)) return [];

  return payload.routes
    .map((route: any) => {
      const geometry = typeof route?.geometry === "string" ? route.geometry : "";
      const coords = geometry ? decodePolyline6(geometry) : [];
      const distance = typeof route?.distance === "number" ? Math.round(route.distance) : 0;
      const duration = typeof route?.duration === "number" ? Math.round(route.duration) : 0;
      return { coords, distance, duration };
    })
    .filter((route: NormalizedRoute) => route.coords.length >= 2);
}

function routeSignature(route: NormalizedRoute): string {
  if (route.coords.length === 0) return `${route.distance}|${route.duration}|empty`;
  const first = route.coords[0];
  const mid = route.coords[Math.floor(route.coords.length / 2)];
  const last = route.coords[route.coords.length - 1];
  return [
    route.distance,
    route.duration,
    `${first[0].toFixed(5)},${first[1].toFixed(5)}`,
    `${mid[0].toFixed(5)},${mid[1].toFixed(5)}`,
    `${last[0].toFixed(5)},${last[1].toFixed(5)}`,
  ].join("|");
}

async function fetchValhallaRoutes(
  fastify: FastifyInstance,
  valhallaUrl: string,
  body: ValhallaBody
): Promise<NormalizedRoute[]> {
  const res = await fetch(`${valhallaUrl}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Valhalla returned ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  let routes: NormalizedRoute[] = decodeRoutesFromOsrm(data);
  if (routes.length === 0) {
    const trips = normalizeTripCandidates(data);
    routes = trips
      .map((trip) => {
        const legs = Array.isArray(trip.legs) ? trip.legs : [];
        const allCoords: [number, number][] = [];
        let totalDistance = 0;
        let totalDuration = 0;

        for (const leg of legs) {
          if (typeof leg.shape === "string" && leg.shape.length > 0) {
            const legCoords = decodePolyline6(leg.shape);
            allCoords.push(...legCoords);
          }
          totalDistance += leg.summary?.length ?? 0;
          totalDuration += leg.summary?.time ?? 0;
        }

        return {
          coords: allCoords,
          distance: Math.round(totalDistance * 1000),
          duration: Math.round(totalDuration),
        };
      })
      .filter((route) => route.coords.length >= 2);
  }

  fastify.log.info(
    { routeCount: routes.length, signatures: routes.map(routeSignature) },
    "Parsed Valhalla route candidates"
  );
  return routes;
}

export default async function routeRoutes(fastify: FastifyInstance) {
  const isFiniteNumber = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);

  const isValidCosting = (v: unknown): v is string =>
    typeof v === "string" && ["auto", "truck", "motorcycle", "pedestrian", "bicycle"].includes(v);

  const routeHandler = async (
    request: {
      body: {
        from: { lat: number; lng: number };
        to: { lat: number; lng: number };
        vehicleType?: string;
      };
    },
    reply: any
  ) => {
    const { from, to, vehicleType = "auto" } = request.body;
    if (
      !isFiniteNumber(from?.lat) ||
      !isFiniteNumber(from?.lng) ||
      !isFiniteNumber(to?.lat) ||
      !isFiniteNumber(to?.lng)
    ) {
      return reply.status(400).send({ message: "from and to with lat/lng are required" });
    }

    if (!isValidCosting(vehicleType)) {
      return reply.status(400).send({ message: "Invalid vehicle type" });
    }

    try {
      const valhallaUrl = process.env.VALHALLA_URL;

      // 1. Fetch active blocked roads to avoid
      const blockedRoads = await fastify.prisma.location.findMany({
        where: {
          type: "BLOCKED_ROAD",
          status: "ACTIVE",
        },
        select: { lat: true, lng: true },
      });

      // 2. Build Valhalla request body
      if (!valhallaUrl) {
        fastify.log.error("VALHALLA_URL is not configured");
        return reply.status(500).send({ message: "VALHALLA_URL is not configured" });
      }

      const valhallaBody: ValhallaBody = {
        locations: [
          { lat: from.lat, lon: from.lng },
          { lat: to.lat, lon: to.lng },
        ],
        costing: vehicleType,
        alternates: 2,
        format: "osrm",
        shape_format: "polyline6",
        directions_options: {
          units: "kilometers",
          language: "vi-VN",
        },
      };

      // Set costing options based on vehicle type
      if (vehicleType === "auto") {
        valhallaBody.costing_options = {
          auto: { use_highways: 0.5, use_tolls: 0.5 },
        };
      } else if (vehicleType === "truck") {
        valhallaBody.costing_options = {
          truck: { use_highways: 0.5, use_tolls: 0.5 },
        };
      } else if (vehicleType === "motorcycle") {
        valhallaBody.costing_options = {
          motorcycle: { use_highways: 0.5 },
        };
      } else if (vehicleType === "pedestrian") {
        valhallaBody.costing_options = {
          pedestrian: { walking_speed: 5.1 },
        };
      }

      // Add avoid locations from active blocked roads
      if (blockedRoads.length > 0) {
        valhallaBody.avoid_locations = blockedRoads.map((br) => ({
          lat: Number(br.lat),
          lon: Number(br.lng),
          radius: 120,
        }));

        valhallaBody.exclude_polygons = {
          type: "FeatureCollection",
          features: blockedRoads.map((br) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [buildAvoidPolygon(Number(br.lat), Number(br.lng), 120)],
            },
          })),
        };
      }

      // 3. Call Valhalla API (primary request with alternates)
      fastify.log.info({ valhallaUrl, mode: "primary" }, "Routing request to Valhalla");
      let routes = await fetchValhallaRoutes(fastify, valhallaUrl, valhallaBody);

      // 4. If Valhalla returns only 1 route, ask for a deliberately different variant.
      if (routes.length < MAX_ROUTES) {
        const secondaryBody: ValhallaBody = {
          ...valhallaBody,
          alternates: 0,
          costing_options: undefined,
        };

        if (vehicleType === "auto") {
          secondaryBody.costing_options = {
            auto: { use_highways: 0.0, use_tolls: 0.0, use_living_streets: 1.0 },
          };
        } else if (vehicleType === "truck") {
          secondaryBody.costing_options = {
            truck: { use_highways: 0.0, use_tolls: 0.0 },
          };
        } else if (vehicleType === "motorcycle") {
          secondaryBody.costing_options = {
            motorcycle: { use_highways: 0.0 },
          };
        } else if (vehicleType === "bicycle") {
          secondaryBody.costing_options = {
            bicycle: { use_roads: 0.1, use_hills: 0.9 },
          };
        } else if (vehicleType === "pedestrian") {
          secondaryBody.costing_options = {
            pedestrian: { walking_speed: 4.2, use_living_streets: 1.0 },
          };
        }

        fastify.log.info({ valhallaUrl, mode: "secondary" }, "Routing fallback variant request");
        const secondaryRoutes = await fetchValhallaRoutes(fastify, valhallaUrl, secondaryBody);
        routes = [...routes, ...secondaryRoutes];
      }

      const seen = new Set<string>();
      routes = routes
        .filter((route) => {
          const signature = routeSignature(route);
          if (seen.has(signature)) return false;
          seen.add(signature);
          return true;
        })
        .slice(0, MAX_ROUTES);

      if (routes.length === 0) {
        return reply.status(502).send({
          message: "Valhalla returned invalid route geometry",
        });
      }

      return reply
        .header("x-route-handler-version", "alternatives-v2")
        .send({
          routes,
          blockedAvoided: blockedRoads.length,
          routeCount: routes.length,
          routeHandlerVersion: "alternatives-v2",
        });
    } catch (error) {
      fastify.log.error(error, "Route calculation failed");
      return reply.status(500).send({
        message: "Route calculation failed",
      });
    }
  };

  fastify.post<{
    Body: {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      vehicleType?: string;
    };
  }>("/route", routeHandler);

}
