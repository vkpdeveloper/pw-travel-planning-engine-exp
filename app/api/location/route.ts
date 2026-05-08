import { env } from "@/lib/env";

const MAPS_GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode";
const PLACES_V1_BASE = "https://places.googleapis.com/v1";

type GeocodeResult = {
  formatted_address: string;
  place_id?: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: { location: { lat: number; lng: number } };
};

type GeocodeResponse = {
  results?: GeocodeResult[];
  status: string;
  error_message?: string;
};

async function readGoogleJson<T>(res: Response, serviceName: string): Promise<T> {
  const data = (await res.json().catch(() => null)) as (T & {
    status?: string;
    error_message?: string;
    error?: { message?: string };
  }) | null;

  if (!res.ok) {
    throw new Error(`${serviceName} failed with HTTP ${res.status}: ${data?.error?.message || data?.error_message || "Unknown error"}`);
  }

  if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`${serviceName} failed with status ${data.status}: ${data.error_message || "Unknown error"}`);
  }

  if (!data) {
    throw new Error(`${serviceName} returned an invalid JSON response`);
  }

  return data as T;
}

export async function POST(req: Request) {
  const body = await req.json();

  // --- Reverse geocode: { type: "reverse", lat, lng } ---
  if (body.type === "reverse") {
    const { lat, lng } = body as { type: string; lat: number; lng: number };
    try {
      const res = await fetch(
        `${MAPS_GEOCODE_BASE}/json?latlng=${lat},${lng}&result_type=locality|administrative_area_level_1|country&key=${env.GOOGLE_MAPS_API_KEY}`
      );
      const data = await readGoogleJson<GeocodeResponse>(res, "Google Geocoding");

      if (data.status !== "OK" || !data.results?.length) {
        return Response.json({ error: "No results found" }, { status: 404 });
      }

      // Pick the most relevant result — prefer locality or admin area level 1
      const result =
        data.results.find((r) =>
          r.address_components.some(
            (c) => c.types.includes("locality") || c.types.includes("administrative_area_level_1")
          )
        ) || data.results[0];

      const locality = result.address_components.find((c) => c.types.includes("locality"))?.long_name;
      const adminArea = result.address_components.find((c) =>
        c.types.includes("administrative_area_level_1")
      )?.long_name;
      const country = result.address_components.find((c) => c.types.includes("country"))?.long_name;

      const displayName = [locality || adminArea, country].filter(Boolean).join(", ");

      return Response.json({
        displayName: displayName || result.formatted_address,
        lat,
        lng,
      });
    } catch (err) {
      console.error("Reverse geocode error:", err);
      return Response.json({ error: "Geocoding failed" }, { status: 500 });
    }
  }

  // --- Places text search: { type: "search", query } ---
  if (body.type === "search") {
    const { query } = body as { type: string; query: string };
    if (!query?.trim()) {
      return Response.json({ results: [] });
    }
    try {
      const res = await fetch(`${PLACES_V1_BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
          ].join(","),
        },
        body: JSON.stringify({
          textQuery: query.trim(),
          pageSize: 5,
          languageCode: "en",
        }),
      });
      const data = await readGoogleJson<{
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
        }>;
      }>(res, "Google Places");

      const results = (data.places || []).map((place) => ({
        placeId: place.id,
        displayName: place.displayName?.text || "Unknown place",
        fullAddress: place.formattedAddress || "",
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      }));

      return Response.json({ results });
    } catch (err) {
      console.error("Places search error:", err);
      return Response.json({ error: "Search failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Invalid request type" }, { status: 400 });
}
