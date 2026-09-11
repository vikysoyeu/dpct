export type GeocodeSuggestion = {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
  provider: string;
  sourceType?: string;
  confidence?: string;
};

type GeocodeOptions = {
  q: string;
  province?: string;
  ward?: string;
  lat?: number;
  lng?: number;
  limit: number;
};

type CacheEntry = {
  expiresAt: number;
  data: GeocodeSuggestion[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function providerName(): "google" | "mapbox" | "vietmap" | "goong" | "nominatim" {
  const configured = (process.env.GEOCODING_PROVIDER ?? "nominatim").toLowerCase();
  if (
    configured === "google" ||
    configured === "mapbox" ||
    configured === "vietmap" ||
    configured === "goong" ||
    configured === "nominatim"
  ) return configured;
  return "nominatim";
}

function encodeProviderId(provider: string, rawId: string): string {
  return `${provider}:${Buffer.from(rawId, "utf8").toString("base64url")}`;
}

function decodeProviderId(id: string): { provider: string; rawId: string } {
  const [provider, encoded] = id.split(":", 2);
  if (!provider || !encoded) throw new Error("Invalid geocode id");
  return { provider, rawId: Buffer.from(encoded, "base64url").toString("utf8") };
}

function finiteNumber(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 6;
  return Math.max(1, Math.min(Math.floor(limit), 10));
}

function cacheKey(provider: string, options: GeocodeOptions): string {
  return [
    provider,
    options.q.trim().toLowerCase(),
    options.province?.trim().toLowerCase() ?? "",
    options.ward?.trim().toLowerCase() ?? "",
    options.lat?.toFixed(4) ?? "",
    options.lng?.toFixed(4) ?? "",
    options.limit,
  ].join("|");
}

function scopedQuery(options: GeocodeOptions): string {
  return [options.q, options.ward, options.province, "Việt Nam"]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

async function withCache(provider: string, options: GeocodeOptions, fetcher: () => Promise<GeocodeSuggestion[]>) {
  const key = cacheKey(provider, options);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  class?: string;
  type?: string;
};

type NominatimBounds = [number, number, number, number];
const nominatimBoundsCache = new Map<string, NominatimBounds | null>();

async function findNominatimBounds(options: GeocodeOptions): Promise<NominatimBounds | null> {
  if (!options.province || !options.ward) return null;

  const key = `${options.ward.trim().toLowerCase()}|${options.province.trim().toLowerCase()}`;
  if (nominatimBoundsCache.has(key)) return nominatimBoundsCache.get(key) ?? null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", [options.ward, options.province, "Việt Nam"].join(", "));
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "vi,en",
      "User-Agent": process.env.GEOCODING_USER_AGENT ?? "DPCT rescue coordination app",
    },
  });
  if (!response.ok) {
    nominatimBoundsCache.set(key, null);
    return null;
  }

  const data = (await response.json()) as NominatimResult[];
  const rawBounds = data[0]?.boundingbox;
  const bounds = rawBounds?.map((value) => Number(value)) as NominatimBounds | undefined;
  const validBounds = bounds?.every((value) => Number.isFinite(value)) ? bounds : null;
  nominatimBoundsCache.set(key, validBounds);
  return validBounds;
}

async function searchNominatim(options: GeocodeOptions): Promise<GeocodeSuggestion[]> {
  return withCache("nominatim", options, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", scopedQuery(options));
    url.searchParams.set("limit", String(options.limit));
    url.searchParams.set("countrycodes", "vn");
    url.searchParams.set("addressdetails", "1");

    const bounds = await findNominatimBounds(options);
    if (bounds) {
      const [south, north, west, east] = bounds;
      url.searchParams.set("viewbox", `${west},${north},${east},${south}`);
      url.searchParams.set("bounded", "1");
    } else if (options.lat != null && options.lng != null) {
      const delta = 0.8;
      url.searchParams.set(
        "viewbox",
        `${options.lng - delta},${options.lat + delta},${options.lng + delta},${options.lat - delta}`,
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "vi,en",
        "User-Agent": process.env.GEOCODING_USER_AGENT ?? "DPCT rescue coordination app",
      },
    });
    if (!response.ok) throw new Error(`Nominatim geocoding failed: HTTP ${response.status}`);

    const data = (await response.json()) as NominatimResult[];
    return data
      .map((item) => ({
        id: `nominatim:${item.place_id}`,
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        provider: "nominatim",
        sourceType: [item.class, item.type].filter(Boolean).join(":") || undefined,
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  });
}

type VietMapAutocompleteItem = {
  ref_id?: string;
  display?: string;
  name?: string;
  address?: string;
  distance?: number;
  categories?: Array<string | number>;
};

type VietMapPlaceResponse = {
  display?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

async function resolveVietMapPlace(refId: string): Promise<GeocodeSuggestion | null> {
  const apiKey = process.env.VIETMAP_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://maps.vietmap.vn/api/place/v4");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("refid", refId);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`VietMap Place failed: HTTP ${response.status}`);

  const data = (await response.json()) as VietMapPlaceResponse;
  const lat = finiteNumber(data.lat);
  const lng = finiteNumber(data.lng);
  if (lat == null || lng == null) return null;

  return {
    id: encodeProviderId("vietmap", refId),
    label: data.display ?? [data.name, data.address].filter(Boolean).join(", ") ?? refId,
    lat,
    lng,
    provider: "vietmap",
  };
}

async function searchVietMap(options: GeocodeOptions): Promise<GeocodeSuggestion[]> {
  const apiKey = process.env.VIETMAP_API_KEY;
  if (!apiKey) return searchNominatim(options);

  const url = new URL("https://maps.vietmap.vn/api/autocomplete/v4");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("text", scopedQuery(options));
  url.searchParams.set("display_type", "5");
  if (options.lat != null && options.lng != null) {
    url.searchParams.set("focus", `${options.lat},${options.lng}`);
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`VietMap Autocomplete failed: HTTP ${response.status}`);

  const data = (await response.json()) as VietMapAutocompleteItem[];
  return data
    .filter((item) => item.ref_id)
    .slice(0, options.limit)
    .map((item) => ({
      id: encodeProviderId("vietmap", item.ref_id!),
      label: item.display ?? [item.name, item.address].filter(Boolean).join(" ") ?? item.ref_id!,
      provider: "vietmap",
      sourceType: item.categories?.length ? "poi" : undefined,
      confidence: typeof item.distance === "number" ? `${item.distance.toFixed(2)}km` : undefined,
    }));
}

type GoongPrediction = {
  description?: string;
  place_id?: string;
  display_type?: string;
  score?: number;
};

type GoongPlaceDetailResponse = {
  result?: {
    place_id?: string;
    formatted_address?: string;
    name?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  };
  status?: string;
};

async function resolveGoongPlace(placeId: string): Promise<GeocodeSuggestion | null> {
  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://rsapi.goong.io/Place/Detail");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("place_id", placeId);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Goong Place Detail failed: HTTP ${response.status}`);

  const data = (await response.json()) as GoongPlaceDetailResponse;
  const result = data.result;
  const lat = finiteNumber(result?.geometry?.location?.lat);
  const lng = finiteNumber(result?.geometry?.location?.lng);
  if (!result || lat == null || lng == null) return null;

  return {
    id: encodeProviderId("goong", placeId),
    label: result.formatted_address ?? result.name ?? placeId,
    lat,
    lng,
    provider: "goong",
  };
}

async function searchGoong(options: GeocodeOptions): Promise<GeocodeSuggestion[]> {
  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) return searchNominatim(options);

  const url = new URL("https://rsapi.goong.io/Place/AutoComplete");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("input", scopedQuery(options));
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("more_compound", "true");
  if (options.lat != null && options.lng != null) {
    url.searchParams.set("location", `${options.lat},${options.lng}`);
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Goong Place Autocomplete failed: HTTP ${response.status}`);

  const data = (await response.json()) as { predictions?: GoongPrediction[] };
  return (data.predictions ?? [])
    .filter((item) => item.place_id)
    .slice(0, options.limit)
    .map((item) => ({
      id: encodeProviderId("goong", item.place_id!),
      label: item.description ?? item.place_id!,
      provider: "goong",
      sourceType: item.display_type,
      confidence: typeof item.score === "number" ? String(Math.round(item.score)) : undefined,
    }));
}

type MapboxFeature = {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    full_address?: string;
    name?: string;
    place_formatted?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
      accuracy?: string;
    };
    match_code?: { confidence?: string };
  };
  place_name?: string;
  text?: string;
};

async function searchMapbox(options: GeocodeOptions): Promise<GeocodeSuggestion[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return searchNominatim(options);

  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", scopedQuery(options));
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "VN");
  url.searchParams.set("language", "vi");
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("types", "address,street,poi,place,city,locality,neighborhood,district");
  url.searchParams.set("auto_complete", "true");
  if (options.lat != null && options.lng != null) {
    url.searchParams.set("proximity", `${options.lng},${options.lat}`);
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Mapbox Search Box failed: HTTP ${response.status}`);

  const data = (await response.json()) as { features?: MapboxFeature[] };
  return (data.features ?? [])
    .map((feature, index) => {
      const coordinates = feature.geometry?.coordinates;
      const lng = finiteNumber(coordinates?.[0] ?? feature.properties?.coordinates?.longitude);
      const lat = finiteNumber(coordinates?.[1] ?? feature.properties?.coordinates?.latitude);
      const props = feature.properties ?? {};
      const label =
        props.full_address ??
        [props.name, props.place_formatted].filter(Boolean).join(", ") ??
        feature.place_name ??
        feature.text ??
        options.q;

      return {
        id: `mapbox:${props.mapbox_id ?? feature.id ?? index}`,
        label,
        lat: lat ?? Number.NaN,
        lng: lng ?? Number.NaN,
        provider: "mapbox",
        sourceType: props.feature_type,
        confidence: props.coordinates?.accuracy ?? props.match_code?.confidence,
      };
    })
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      types?: string[];
    };
  }>;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

async function fetchGooglePlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetailsResponse | null> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "vi");
  url.searchParams.set("regionCode", "VN");

  const response = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types",
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as GooglePlaceDetailsResponse;
}

async function searchGoogle(options: GeocodeOptions): Promise<GeocodeSuggestion[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return searchNominatim(options);

  return withCache("google", options, async () => {
    const body: Record<string, unknown> = {
      input: scopedQuery(options),
      includedRegionCodes: ["vn"],
      languageCode: "vi",
      regionCode: "VN",
      includeQueryPredictions: false,
    };

    if (options.lat != null && options.lng != null) {
      body.locationBias = {
        circle: {
          center: { latitude: options.lat, longitude: options.lng },
          radius: 50000,
        },
      };
      body.origin = { latitude: options.lat, longitude: options.lng };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Google Places autocomplete failed: HTTP ${response.status}`);

    const data = (await response.json()) as GoogleAutocompleteResponse;
    const predictions = (data.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId))
      .slice(0, options.limit);

    const details = await Promise.all(
      predictions.map((prediction) => fetchGooglePlaceDetails(prediction.placeId!, apiKey)),
    );

    return details
      .map((detail, index) => {
        const prediction = predictions[index];
        const lat = finiteNumber(detail?.location?.latitude);
        const lng = finiteNumber(detail?.location?.longitude);
        const fallbackLabel = prediction.text?.text ??
          [prediction.structuredFormat?.mainText?.text, prediction.structuredFormat?.secondaryText?.text]
            .filter(Boolean)
            .join(", ");

        return {
          id: `google:${detail?.id ?? prediction.placeId}`,
          label: detail?.formattedAddress ?? detail?.displayName?.text ?? fallbackLabel ?? options.q,
          lat: lat ?? Number.NaN,
          lng: lng ?? Number.NaN,
          provider: "google",
          sourceType: detail?.types?.[0] ?? prediction.types?.[0],
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  });
}

export async function searchGeocode(options: Partial<GeocodeOptions>): Promise<{
  provider: string;
  data: GeocodeSuggestion[];
}> {
  const q = String(options.q ?? "").trim();
  if (q.length < 3) return { provider: providerName(), data: [] };

  const normalizedOptions: GeocodeOptions = {
    q,
    province: String(options.province ?? "").trim() || undefined,
    ward: String(options.ward ?? "").trim() || undefined,
    lat: finiteNumber(options.lat),
    lng: finiteNumber(options.lng),
    limit: normalizeLimit(options.limit ?? 6),
  };

  const provider = providerName();
  if (provider === "vietmap") {
    return { provider, data: await searchVietMap(normalizedOptions) };
  }
  if (provider === "goong") {
    return { provider, data: await searchGoong(normalizedOptions) };
  }
  if (provider === "google") {
    return { provider, data: await searchGoogle(normalizedOptions) };
  }
  if (provider === "mapbox") {
    return { provider, data: await searchMapbox(normalizedOptions) };
  }
  return { provider, data: await searchNominatim(normalizedOptions) };
}

export async function resolveGeocode(id: string): Promise<GeocodeSuggestion | null> {
  const { provider, rawId } = decodeProviderId(id);

  if (provider === "vietmap") return resolveVietMapPlace(rawId);
  if (provider === "goong") return resolveGoongPlace(rawId);

  return null;
}
