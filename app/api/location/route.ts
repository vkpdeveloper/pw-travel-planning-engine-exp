import { env } from "@/lib/env";

const MAPS_GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode";
const MAPS_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

export async function POST(req: Request) {
  const body = await req.json();

  // --- Reverse geocode: { type: "reverse", lat, lng } ---
  if (body.type === "reverse") {
    const { lat, lng } = body as { type: string; lat: number; lng: number };
    try {
      const res = await fetch(
        `${MAPS_GEOCODE_BASE}/json?latlng=${lat},${lng}&result_type=locality|administrative_area_level_1|country&key=${env.GOOGLE_MAPS_API_KEY}`
      );
      const data = (await res.json()) as {
        results: Array<{
          formatted_address: string;
          address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
          geometry: { location: { lat: number; lng: number } };
        }>;
        status: string;
      };

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
      const res = await fetch(
        `${MAPS_PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${env.GOOGLE_MAPS_API_KEY}`
      );
      const data = (await res.json()) as {
        results: Array<{
          name: string;
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
        }>;
        status: string;
      };

      const results = (data.results || []).slice(0, 5).map((r) => ({
        displayName: r.name,
        fullAddress: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      }));

      return Response.json({ results });
    } catch (err) {
      console.error("Places search error:", err);
      return Response.json({ error: "Search failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Invalid request type" }, { status: 400 });
}
