import { createGoogleGenerativeAI, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, tool, stepCountIs, convertToModelMessages, UIMessage } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

const MAPS_GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode";
const PLACES_V1_BASE = "https://places.googleapis.com/v1";
const MAPS_ROUTES_BASE = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FLIGHT_BASE = "https://api.flightapi.io";
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_API_KEY,
});

type GoogleErrorPayload = {
  status?: string;
  error_message?: string;
  error?: { message?: string };
};

type GeocodeResult = {
  formatted_address: string;
  place_id?: string;
  geometry: { location: { lat: number; lng: number } };
};

type GeocodeResponse = GoogleErrorPayload & {
  results?: GeocodeResult[];
};

async function readGoogleJson<T>(res: Response, serviceName: string): Promise<T> {
  const data = (await res.json().catch(() => null)) as (T & GoogleErrorPayload) | null;

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

async function geocodeLocation(query: string): Promise<{
  coords: { lat: number; lng: number };
  name: string;
  placeId: string | null;
} | null> {
  const url = new URL(`${MAPS_GEOCODE_BASE}/json`);
  url.searchParams.set("address", query);
  url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY);

  const res = await fetch(url);
  const data = await readGoogleJson<GeocodeResponse>(res, "Google Geocoding");
  const result = data.results?.[0];

  if (!result) return null;

  return {
    coords: result.geometry.location,
    name: result.formatted_address,
    placeId: result.place_id || null,
  };
}

function formatGoogleDuration(duration = "0s") {
  const seconds = Number.parseInt(duration.replace("s", ""), 10) || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const getSystemPrompt = (userProfile?: { name?: string; location?: { displayName?: string; lat?: number; lng?: number } } | null) => {
  const now = new Date();
  const dateStr = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "longOffset",
  });

  const userContext = userProfile
    ? `\n\n## User Profile\n- **Name**: ${userProfile.name || "Unknown"}\n- **Home Location**: ${userProfile.location?.displayName || "Not specified"}${userProfile.location?.lat != null ? ` (${userProfile.location.lat.toFixed(4)}, ${userProfile.location.lng?.toFixed(4)})` : ""}\n\nAlways address the user by their name. When suggesting origin airports or routes, default to their home location unless they specify otherwise.`
    : "";

  return `You are an expert travel experience agent — enthusiastic, knowledgeable, and deeply passionate about helping people explore the world.

## ABSOLUTE RULE — Question Asking
**You MUST call the \`askFollowUpQuestions\` tool every single time you need information from the user. This is non-negotiable.**
- NEVER ask questions as plain conversational text.
- NEVER write "Could you tell me…", "What is your…", or any question sentence in your response.
- If ANY required detail is missing, your ONLY option is to immediately call \`askFollowUpQuestions\` with a structured list of exactly what you need.
- Before calling the tool, you may write one short friendly sentence (e.g. "Let me get a few details to find the perfect trip for you!"), then call the tool — do not ask anything in that sentence.

## Your Flow
1. **Understand the request** — extract source city/airport, destination, travel date, number of passengers, cabin preference, and experience type from the user's message.
2. **Gather missing info via tool** — if source, destination, date, or passenger count is unclear, call \`askFollowUpQuestions\` immediately. Only ask for fields that are genuinely missing. Use \`type: "select"\` with sensible \`options\` whenever choices are finite (cabin class, trip type, number of passengers, etc.). Use \`type: "text"\` for open fields like city names. Use \`type: "date"\` for travel dates.

### Writing user-facing text (CRITICAL)
Everything in \`question\`, \`placeholder\`, and \`options\` is shown verbatim to the user. Write it like a human, not like a JSON schema:
- **Questions**: full, friendly sentences ending in a question mark. ✅ "Which cabin class do you prefer?" ❌ "cabin_class"
- **Options**: display labels with proper spacing and capitalization. ✅ \`["Economy", "Premium Economy", "Business", "First Class"]\` ❌ \`["Economy", "Premium_Economy", "Business", "First"]\`. Never expose enum values, snake_case, ALL_CAPS, or internal codes.
- **Placeholders**: realistic examples in natural form. ✅ "e.g. Bengaluru" ❌ "BLR_AIRPORT"
- When the user later answers with a friendly label (e.g. "Premium Economy"), translate it back to the API's required form when you call downstream tools (e.g. \`cabinClass: "Premium_Economy"\` for \`searchFlights\`). The translation is your job — never push internal formats onto the user.
3. **Calculate the route** — call \`calculateRoute\` with origin and destination to get real distance, duration, and map data.
4. **Search flights** — call \`searchFlights\` with the IATA airport codes, date, and passenger info.
5. **Discover places** — call \`findPlaces\` with the destination and a category like "top attractions", "best restaurants", or "boutique hotels" to surface ratings, photos, opening hours, and price levels for the user.
6. **Build an optimized day plan** — once you have 3+ interesting places, call \`optimizeItinerary\` with their place IDs to compute the best visit order with travel times between stops. Use \`DRIVE\` for city-to-city, \`WALK\` for compact neighborhoods. (Transit is not supported for multi-stop optimization.)
7. **Describe the experience** — after tools complete, write a vivid, streaming narrative tying together the photos, ratings, and itinerary you just surfaced. Make it feel personal and inspiring.

## Tone
- Warm, conversational, and genuinely excited about travel
- Paint vivid sensory pictures ("the smell of fresh croissants", "the golden hour light on ancient ruins")
- Always keep the user engaged — even while tools are running, add interesting facts

## Important
- Source and destination are REQUIRED before calling route/flight tools — use \`askFollowUpQuestions\` if missing
- Travel date is REQUIRED for flight search — use \`askFollowUpQuestions\` if missing
- If the user provides partial info, extract what you can and only ask about what's genuinely missing
- Use IATA codes for airports (e.g. JFK, CDG, BOM, LHR)
- Always present flights and routes AFTER they load — do not make up data
- The current date and time is **${dateStr}**${userContext}`;
};

// --- Tool: Ask Follow-Up Questions ---
const askFollowUpQuestions = tool({
  description:
    "REQUIRED tool for asking the user any question. Call this whenever source city, destination, travel date, passenger count, cabin class, or any other needed detail is missing or ambiguous. This is the ONLY permitted way to ask the user a question — never ask in plain text. Provide a helpful context string and a precise list of questions with appropriate types and options.",
  inputSchema: z.object({
    context: z
      .string()
      .describe("A brief, friendly sentence explaining why these questions are needed"),
    questions: z.array(
      z.object({
        id: z.string().describe("Unique identifier for this question (e.g. 'source_city')"),
        question: z.string().describe("The question to ask the user"),
        type: z
          .enum(["text", "date", "number", "select"])
          .describe("The input type for this question"),
        placeholder: z.string().optional().describe("Placeholder text for the input"),
        options: z
          .array(z.string())
          .optional()
          .describe("Options for select-type questions"),
        required: z.boolean().default(true),
      })
    ),
  }),
  execute: async ({ context, questions }) => {
    return { context, questions, status: "awaiting_answers" as const };
  },
});

// --- Tool: Calculate Route ---
const calculateRoute = tool({
  description:
    "Calculate the route between origin and destination using Google Maps. Returns distance, duration, map coordinates, and encoded polyline for map rendering.",
  inputSchema: z.object({
    origin: z.string().describe("Origin city or airport name (e.g. 'New York' or 'JFK Airport')"),
    destination: z
      .string()
      .describe("Destination city or airport name (e.g. 'Paris' or 'CDG Airport')"),
    originIata: z.string().optional().describe("IATA airport code for origin, if known"),
    destinationIata: z.string().optional().describe("IATA airport code for destination, if known"),
  }),
  execute: async ({ origin, destination, originIata, destinationIata }) => {
    try {
      const [originPlace, destPlace] = await Promise.all([
        geocodeLocation(originIata ? `${originIata} Airport` : origin),
        geocodeLocation(destinationIata ? `${destinationIata} Airport` : destination),
      ]);

      if (!originPlace || !destPlace) {
        return {
          error: "Could not geocode one or both locations",
          origin,
          destination,
          distance: "Unknown",
          duration: "Unknown",
        };
      }

      const originCoords = originPlace.coords;
      const destCoords = destPlace.coords;

      // --- Step 2: Haversine great-circle distance (always used for flights) ---
      const haversine = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
        const R = 6371;
        const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
        const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((c1.lat * Math.PI) / 180) *
          Math.cos((c2.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };

      const distKm = haversine(originCoords, destCoords);
      const distMi = Math.round(distKm * 0.621371);
      const isLongHaul = distKm > 500; // treat as flight route if > 500 km

      let encodedPolyline: string | null = null;
      let distance = `${distKm.toLocaleString()} km (${distMi.toLocaleString()} mi)`;
      let duration: string;
      let isFlightRoute = isLongHaul;

      if (isLongHaul) {
        // For flights, estimate duration at ~900 km/h cruise speed
        const hours = Math.floor(distKm / 900);
        const mins = Math.round(((distKm / 900) % 1) * 60);
        duration = hours > 0 ? `~${hours}h ${mins}m flight` : `~${mins}m flight`;
      } else {
        // --- Step 3: Try Routes API for ground routes ---
        try {
          const routesResponse = await fetch(MAPS_ROUTES_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
              "X-Goog-FieldMask":
                "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
            },
            body: JSON.stringify({
              origin: originPlace.placeId
                ? { placeId: originPlace.placeId }
                : { location: { latLng: { latitude: originCoords.lat, longitude: originCoords.lng } } },
              destination: destPlace.placeId
                ? { placeId: destPlace.placeId }
                : { location: { latLng: { latitude: destCoords.lat, longitude: destCoords.lng } } },
              travelMode: "DRIVE",
            }),
          });

          const routesRes = await readGoogleJson<{
            routes?: Array<{
              duration?: string;
              distanceMeters?: number;
              polyline?: { encodedPolyline?: string };
            }>;
          }>(routesResponse, "Google Routes");

          const route = routesRes.routes?.[0];
          if (route) {
            encodedPolyline = route.polyline?.encodedPolyline || null;
            const dMeters = route.distanceMeters || distKm * 1000;
            const dKm = Math.round(dMeters / 1000);
            const dMi = Math.round(dKm * 0.621371);
            distance = `${dKm.toLocaleString()} km (${dMi.toLocaleString()} mi)`;
            duration = `${formatGoogleDuration(route.duration)} drive`;
            isFlightRoute = false;
          } else {
            duration = `~${Math.round(distKm / 60)} min drive`;
          }
        } catch (error) {
          console.error("calculateRoute routes API error:", error);
          duration = `~${Math.round(distKm / 60)} min drive`;
        }
      }

      const centerLat = (originCoords.lat + destCoords.lat) / 2;
      const centerLng = (originCoords.lng + destCoords.lng) / 2;

      return {
        origin: originPlace.name,
        destination: destPlace.name,
        originPlaceId: originPlace.placeId,
        destinationPlaceId: destPlace.placeId,
        originIata: originIata || null,
        destinationIata: destinationIata || null,
        originCoords,
        destCoords,
        centerCoords: { lat: centerLat, lng: centerLng },
        encodedPolyline,
        distance,
        duration,
        isFlightRoute,
      };
    } catch (error) {
      console.error("calculateRoute error:", error);
      return {
        error: "Failed to calculate route",
        origin,
        destination,
        distance: "Unknown",
        duration: "Unknown",
      };
    }
  },
});

// --- Tool: Find Places (Places API v1) ---
const PRICE_LEVEL_MAP: Record<string, { symbol: string; label: string }> = {
  PRICE_LEVEL_FREE: { symbol: "Free", label: "Free" },
  PRICE_LEVEL_INEXPENSIVE: { symbol: "$", label: "Inexpensive" },
  PRICE_LEVEL_MODERATE: { symbol: "$$", label: "Moderate" },
  PRICE_LEVEL_EXPENSIVE: { symbol: "$$$", label: "Expensive" },
  PRICE_LEVEL_VERY_EXPENSIVE: { symbol: "$$$$", label: "Very expensive" },
};

const findPlaces = tool({
  description:
    "Search for top points of interest near a destination using the Google Places API (v1). Returns rich data: ratings, opening hours, price levels, websites, and high-quality photos. Use this to surface attractions, restaurants, hotels, or themed lists for the user.",
  inputSchema: z.object({
    destination: z
      .string()
      .describe("City, neighborhood, or area to search around (e.g. 'Kyoto, Japan')"),
    category: z
      .enum(["attractions", "restaurants", "hotels", "cafes", "nightlife", "experiences"])
      .describe("Category of place to surface"),
    query: z
      .string()
      .optional()
      .describe(
        "Optional refinement, e.g. 'historic temples' or 'rooftop bars'. If omitted, a sensible category default is used."
      ),
    maxResults: z.number().min(1).max(8).default(6),
  }),
  execute: async ({ destination, category, query, maxResults }) => {
    try {
      const categoryPhrase: Record<string, string> = {
        attractions: "top tourist attractions",
        restaurants: "best restaurants",
        hotels: "highly rated hotels",
        cafes: "popular cafes",
        nightlife: "best nightlife and bars",
        experiences: "unique experiences and tours",
      };
      const textQuery = `${query || categoryPhrase[category]} in ${destination}`;

      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.types",
        "places.photos",
        "places.regularOpeningHours.openNow",
        "places.regularOpeningHours.weekdayDescriptions",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.editorialSummary",
        "places.primaryTypeDisplayName",
      ].join(",");

      const res = await fetch(`${PLACES_V1_BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery,
          pageSize: maxResults,
          languageCode: "en",
        }),
      });

      const data = await readGoogleJson<{ places?: Array<Record<string, unknown>> }>(
        res,
        "Google Places"
      );
      const places = (data.places || []).slice(0, maxResults).map((p) => {
        const photos = (p.photos as Array<{ name: string; widthPx?: number; heightPx?: number }> | undefined) || [];
        const photoUrls = photos.slice(0, 3).map(
          (ph) =>
            `${PLACES_V1_BASE}/${ph.name}/media?maxHeightPx=600&maxWidthPx=900&key=${env.GOOGLE_MAPS_API_KEY}`
        );
        const priceRaw = p.priceLevel as string | undefined;
        const price = priceRaw ? PRICE_LEVEL_MAP[priceRaw] || null : null;
        const hours = p.regularOpeningHours as
          | { openNow?: boolean; weekdayDescriptions?: string[] }
          | undefined;
        const summary = (p.editorialSummary as { text?: string } | undefined)?.text || null;

        return {
          id: p.id as string,
          name: (p.displayName as { text?: string } | undefined)?.text || "Unknown",
          address: (p.formattedAddress as string) || "",
          location: p.location as { latitude: number; longitude: number } | undefined,
          rating: (p.rating as number) || null,
          userRatingCount: (p.userRatingCount as number) || 0,
          price,
          openNow: hours?.openNow ?? null,
          hours: hours?.weekdayDescriptions || [],
          website: (p.websiteUri as string) || null,
          mapsUrl: (p.googleMapsUri as string) || null,
          summary,
          primaryType:
            (p.primaryTypeDisplayName as { text?: string } | undefined)?.text || null,
          photos: photoUrls,
        };
      });

      return {
        success: true,
        destination,
        category,
        query: textQuery,
        count: places.length,
        places,
      };
    } catch (error) {
      console.error("findPlaces error:", error);
      return {
        error: "fetch_failed",
        message: "Unable to fetch places at this time.",
        destination,
        category,
      };
    }
  },
});

// --- Tool: Optimize Itinerary (Routes API with waypoint optimization) ---
const optimizeItinerary = tool({
  description:
    "Compute an optimized day-trip route through multiple stops using Google Routes API. Pass place IDs (preferred) from findPlaces, or place names. Returns the best visit order, total time/distance, and per-leg travel times.",
  inputSchema: z.object({
    stops: z
      .array(
        z.object({
          placeId: z.string().optional().describe("Place ID from findPlaces (preferred)"),
          name: z.string().describe("Display name of the stop"),
        })
      )
      .min(2)
      .max(10)
      .describe("Ordered list of stops; first is start, last is end. Intermediates are reordered."),
    travelMode: z
      .enum(["DRIVE", "WALK", "BICYCLE"])
      .default("DRIVE")
      .describe("Mode of travel between stops. Transit is not supported because the Routes API does not allow intermediate waypoints in transit mode."),
  }),
  execute: async ({ stops, travelMode }) => {
    try {
      const resolvedStops = await Promise.all(
        stops.map(async (stop) => {
          if (stop.placeId) return stop;

          try {
            const geocoded = await geocodeLocation(stop.name);
            return { ...stop, placeId: geocoded?.placeId || undefined };
          } catch (error) {
            console.error("optimizeItinerary geocode fallback error:", error);
            return stop;
          }
        })
      );

      const toWaypoint = (s: { placeId?: string; name: string }) =>
        s.placeId ? { placeId: s.placeId } : { address: s.name };

      const origin = toWaypoint(resolvedStops[0]);
      const destination = toWaypoint(resolvedStops[resolvedStops.length - 1]);
      const intermediates = resolvedStops.slice(1, -1).map(toWaypoint);
      const canOptimize = intermediates.length >= 2;

      const body: Record<string, unknown> = {
        origin,
        destination,
        travelMode,
        ...(intermediates.length > 0 && { intermediates }),
        ...(canOptimize && { optimizeWaypointOrder: true }),
      };
      // Routing preference is only valid for DRIVE/TWO_WHEELER
      if (travelMode === "DRIVE") {
        body.routingPreference = "TRAFFIC_AWARE";
      }

      const res = await fetch(MAPS_ROUTES_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": [
            "routes.duration",
            "routes.distanceMeters",
            "routes.polyline.encodedPolyline",
            "routes.legs.duration",
            "routes.legs.distanceMeters",
            "routes.legs.startLocation",
            "routes.legs.endLocation",
            "routes.optimizedIntermediateWaypointIndex",
          ].join(","),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("optimizeItinerary routes API error:", res.status, errText);
        return {
          error: "routes_api_error",
          message: "We couldn't build an optimized route between these stops. Try a different travel mode or fewer stops.",
        };
      }

      const data = await readGoogleJson<{
        routes?: Array<{
          duration?: string;
          distanceMeters?: number;
          polyline?: { encodedPolyline?: string };
          legs?: Array<{
            duration?: string;
            distanceMeters?: number;
            startLocation?: { latLng?: { latitude: number; longitude: number } };
            endLocation?: { latLng?: { latitude: number; longitude: number } };
          }>;
          optimizedIntermediateWaypointIndex?: number[];
        }>;
      }>(res, "Google Routes");

      const route = data.routes?.[0];
      if (!route) {
        return { error: "no_route", message: "No route could be computed for these stops." };
      }

      // Build the optimized stop order
      const optimizedIndex = route.optimizedIntermediateWaypointIndex || [];
      const orderedStops: typeof resolvedStops = [resolvedStops[0]];
      if (optimizedIndex.length > 0) {
        // Indices are 0-based into the original intermediates array
        for (const idx of optimizedIndex) {
          orderedStops.push(resolvedStops[idx + 1]);
        }
      } else {
        for (let i = 1; i < resolvedStops.length - 1; i++) orderedStops.push(resolvedStops[i]);
      }
      orderedStops.push(resolvedStops[resolvedStops.length - 1]);
      const totalMeters = route.distanceMeters || 0;

      const legs = (route.legs || []).map((leg, i) => {
        const meters = leg.distanceMeters || 0;
        return {
          from: orderedStops[i].name,
          to: orderedStops[i + 1].name,
          duration: formatGoogleDuration(leg.duration),
          distanceKm: Math.round(meters / 100) / 10,
          startLocation: leg.startLocation?.latLng,
          endLocation: leg.endLocation?.latLng,
        };
      });

      return {
        success: true,
        travelMode,
        wasReordered: optimizedIndex.length > 0,
        totalDuration: formatGoogleDuration(route.duration),
        totalDistanceKm: Math.round(totalMeters / 100) / 10,
        encodedPolyline: route.polyline?.encodedPolyline || null,
        orderedStops: orderedStops.map((s) => s.name),
        stopPlaceIds: orderedStops.map((s) => s.placeId || null),
        legs,
      };
    } catch (error) {
      console.error("optimizeItinerary error:", error);
      return {
        error: "fetch_failed",
        message: "Unable to optimize itinerary at this time.",
      };
    }
  },
});

// --- Tool: Search Flights ---
const searchFlights = tool({
  description:
    "Search for real-time one-way flights using the FlightAPI. Requires IATA airport codes and travel date.",
  inputSchema: z.object({
    departureIata: z.string().describe("Departure airport IATA code (e.g. 'JFK', 'LHR', 'BOM')"),
    arrivalIata: z.string().describe("Arrival airport IATA code (e.g. 'CDG', 'DXB', 'SIN')"),
    departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
    adults: z.number().min(1).max(9).default(1).describe("Number of adult passengers"),
    children: z.number().min(0).max(8).default(0).describe("Number of child passengers"),
    infants: z.number().min(0).max(4).default(0).describe("Number of infant passengers"),
    cabinClass: z
      .enum(["Economy", "Business", "First", "Premium_Economy"])
      .default("Economy")
      .describe("Cabin class preference"),
    currency: z.string().default("USD").describe("Currency code (e.g. USD, EUR, GBP)"),
    region: z.string().default("US").describe("ISO country code for local pricing (e.g. US, GB, IN)"),
  }),
  execute: async ({
    departureIata,
    arrivalIata,
    departureDate,
    adults,
    children,
    infants,
    cabinClass,
    currency,
  }) => {
    try {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(departureDate)) {
        return {
          error: "invalid_date",
          message: `Invalid departure date format: "${departureDate}". Expected YYYY-MM-DD.`,
          departureIata,
          arrivalIata,
          departureDate,
        };
      }

      // Validate date is not in the past
      const parsedDate = new Date(departureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        return {
          error: "past_date",
          message: `Departure date ${departureDate} is in the past. Please choose a future date.`,
          departureIata,
          arrivalIata,
          departureDate,
        };
      }

      // FlightAPI docs list "region" as required in the params table, but every
      // official example (curl, Node, Python) omits it entirely. Appending it as
      // a query parameter causes the API to return 400 Bad Request.
      const url = `${FLIGHT_BASE}/onewaytrip/${env.FLIGHTS_API_KEY}/${departureIata.toUpperCase()}/${arrivalIata.toUpperCase()}/${departureDate}/${adults}/${children}/${infants}/${cabinClass}/${currency}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          return {
            error: "no_flights",
            message: `No flights found from ${departureIata} to ${arrivalIata} on ${departureDate}.`,
            departureIata,
            arrivalIata,
            departureDate,
          };
        }
        return {
          error: "api_error",
          message: `Flight search failed (status ${response.status}).`,
          departureIata,
          arrivalIata,
          departureDate,
        };
      }

      const data = await response.json();
      const itineraries = data.itineraries || [];
      const legs = data.legs || [];
      const carriers = data.carriers || [];
      const places = data.places || [];

      const flights = itineraries.slice(0, 6).map((itin: Record<string, unknown>) => {
        const legIds = (itin.leg_ids as string[]) || [];
        const leg = legs.find((l: Record<string, unknown>) => l.id === legIds[0]) || {} as Record<string, unknown>;
        const segmentIds = (leg.segment_ids as string[]) || [];
        const segments =
          data.segments?.filter((s: Record<string, unknown>) =>
            segmentIds.includes(s.id as string)
          ) || [];

        const carrierId = segments[0]?.operating_carrier_id;
        const carrier = carriers.find((c: Record<string, unknown>) => c.id === carrierId);
        const originPlace = places.find(
          (p: Record<string, unknown>) => p.id === leg.origin_place_id
        );
        const destPlace = places.find(
          (p: Record<string, unknown>) => p.id === leg.destination_place_id
        );

        const pricing = (itin.pricing_options as Record<string, unknown>[])?.[0] || {};
        const price = (pricing.price as Record<string, unknown>) || {};

        const durationMins = leg.duration as number | undefined;

        return {
          id: itin.id,
          price: {
            amount: (price.amount as number) || 0,
            currency: currency,
            formatted: price.amount
              ? `${currency} ${Number(price.amount).toFixed(2)}`
              : "Price unavailable",
          },
          carrier: {
            name: (carrier?.name as string) || "Unknown Airline",
            iata: (carrier?.display_code as string) || (carrier?.alt_id as string) || "",
            imageUrl: null,
          },
          departure: {
            time: (leg.departure as string) || "",
            airport: (originPlace?.name as string) || departureIata,
            iata: (originPlace?.display_code as string) || (originPlace?.alt_id as string) || departureIata,
          },
          arrival: {
            time: (leg.arrival as string) || "",
            airport: (destPlace?.name as string) || arrivalIata,
            iata: (destPlace?.display_code as string) || (destPlace?.alt_id as string) || arrivalIata,
          },
          duration: durationMins
            ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
            : "N/A",
          stops: (leg.stop_count as number) || 0,
          cabinClass,
        };
      });

      return {
        success: true,
        searchParams: {
          from: departureIata,
          to: arrivalIata,
          date: departureDate,
          passengers: { adults, children, infants },
          cabinClass,
          currency,
        },
        totalResults: itineraries.length,
        flights,
      };
    } catch (error) {
      console.error("searchFlights error:", error);
      return {
        error: "fetch_failed",
        message: "Unable to fetch flight data at this time. Please try again.",
        departureIata,
        arrivalIata,
        departureDate,
      };
    }
  },
});

export async function POST(req: Request) {
  const { messages, userProfile }: {
    messages: UIMessage[];
    userProfile?: { name?: string; location?: { displayName?: string; lat?: number; lng?: number } } | null;
  } = await req.json();

  const result = streamText({
    model: google(GEMINI_MODEL),
    system: getSystemPrompt(userProfile),
    messages: await convertToModelMessages(messages),
    tools: {
      askFollowUpQuestions,
      calculateRoute,
      searchFlights,
      findPlaces,
      optimizeItinerary,
    },
    stopWhen: stepCountIs(10),
    maxOutputTokens: 4096,
    maxRetries: 3,
    providerOptions: {
      google: {
        serviceTier: 'priority'
      } satisfies GoogleGenerativeAIProviderOptions
    }
  });

  return result.toUIMessageStreamResponse();
}
