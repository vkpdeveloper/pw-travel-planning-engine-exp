import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/location/route";

const okResponse = (body: unknown): Response =>
  ({
    ok: true,
    json: async () => body,
  }) as unknown as Response;

const errorResponse = (status: number, body: unknown): Response =>
  ({
    ok: false,
    status,
    json: async () => body,
  }) as unknown as Response;

const makeReq = (body: unknown) =>
  new Request("http://test/api/location", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/location", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("reverse geocode", () => {
    it("returns the localized display name for a successful response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({
          status: "OK",
          results: [
            {
              formatted_address: "Mumbai, Maharashtra, India",
              geometry: { location: { lat: 19.0, lng: 72.8 } },
              address_components: [
                { long_name: "Mumbai", short_name: "Mumbai", types: ["locality"] },
                {
                  long_name: "Maharashtra",
                  short_name: "MH",
                  types: ["administrative_area_level_1"],
                },
                { long_name: "India", short_name: "IN", types: ["country"] },
              ],
            },
          ],
        }),
      );

      const res = await POST(makeReq({ type: "reverse", lat: 19, lng: 72.8 }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ displayName: "Mumbai, India", lat: 19, lng: 72.8 });
    });

    it("falls back to admin area when locality is missing", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({
          status: "OK",
          results: [
            {
              formatted_address: "Maharashtra, India",
              geometry: { location: { lat: 19, lng: 72 } },
              address_components: [
                {
                  long_name: "Maharashtra",
                  short_name: "MH",
                  types: ["administrative_area_level_1"],
                },
                { long_name: "India", short_name: "IN", types: ["country"] },
              ],
            },
          ],
        }),
      );
      const res = await POST(makeReq({ type: "reverse", lat: 19, lng: 72 }));
      const data = await res.json();
      expect(data.displayName).toBe("Maharashtra, India");
    });

    it("falls back to formatted_address when no components match", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({
          status: "OK",
          results: [
            {
              formatted_address: "Some Place",
              geometry: { location: { lat: 0, lng: 0 } },
              address_components: [],
            },
          ],
        }),
      );
      const res = await POST(makeReq({ type: "reverse", lat: 0, lng: 0 }));
      const data = await res.json();
      expect(data.displayName).toBe("Some Place");
    });

    it("returns 404 when results are empty", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ status: "ZERO_RESULTS", results: [] }),
      );
      const res = await POST(makeReq({ type: "reverse", lat: 0, lng: 0 }));
      expect(res.status).toBe(404);
    });

    it("returns 500 when fetch throws", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
      const res = await POST(makeReq({ type: "reverse", lat: 0, lng: 0 }));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: "Geocoding failed" });
    });
  });

  describe("places search", () => {
    it("returns up to 5 mapped results", async () => {
      const places = Array.from({ length: 5 }, (_, i) => ({
        id: `place-${i}`,
        displayName: { text: `Place ${i}` },
        formattedAddress: `${i} Main St`,
        location: { latitude: i, longitude: i },
      }));
      vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse({ places }));

      const res = await POST(makeReq({ type: "search", query: "coffee" }));
      const data = await res.json();
      expect(data.results).toHaveLength(5);
      expect(data.results[0]).toEqual({
        placeId: "place-0",
        displayName: "Place 0",
        fullAddress: "0 Main St",
        lat: 0,
        lng: 0,
      });
    });

    it("returns an empty list for blank queries without calling fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const res = await POST(makeReq({ type: "search", query: "   " }));
      const data = await res.json();
      expect(data).toEqual({ results: [] });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("handles missing results array as empty", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse({}));
      const res = await POST(makeReq({ type: "search", query: "x" }));
      const data = await res.json();
      expect(data).toEqual({ results: [] });
    });

    it("returns 500 when Google Places returns an API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        errorResponse(403, { error: { message: "API key not authorized" } }),
      );

      const res = await POST(makeReq({ type: "search", query: "x" }));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: "Search failed" });
    });

    it("returns 500 when fetch throws", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
      const res = await POST(makeReq({ type: "search", query: "x" }));
      expect(res.status).toBe(500);
    });
  });

  it("returns 400 for unknown request type", async () => {
    const res = await POST(makeReq({ type: "unknown" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Invalid request type" });
  });
});
