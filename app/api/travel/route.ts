import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool, stepCountIs, convertToModelMessages, UIMessage } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

const MAPS_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const MAPS_ROUTES_BASE = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FLIGHT_BASE = "https://api.flightapi.io";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_API_KEY,
})

const getSystemPrompt = () => {
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
  return `You are an expert travel experience agent — enthusiastic, knowledgeable, and deeply passionate about helping people explore the world.

## Your Flow
1. **Understand the request** — extract source city/airport, destination, travel date, number of passengers, cabin preference, and experience type from the user's message.
2. **Ask clarifying questions** — if any critical detail is missing (especially source, destination, or date), call the \`askFollowUpQuestions\` tool with a structured JSON object containing the questions. While doing so, also stream a friendly, warm intro message explaining what you need.
3. **Calculate the route** — call \`calculateRoute\` with origin and destination to get real distance, duration, and map data.
4. **Search flights** — call \`searchFlights\` with the IATA airport codes, date, and passenger info.
5. **Describe the experience** — after tools complete, write a vivid, streaming narrative about what the user can expect: local culture, must-see places, food scene, best time of year, hidden gems, practical travel tips. Make it feel personal and inspiring.

## Tone
- Warm, conversational, and genuinely excited about travel
- Paint vivid sensory pictures ("the smell of fresh croissants", "the golden hour light on ancient ruins")
- Always keep the user engaged — even while tools are running, add interesting facts

## Important
- Source and destination are REQUIRED before calling route/flight tools
- Travel date is REQUIRED for flight search
- If the user provides partial info, extract what you can and only ask about what's missing
- Use IATA codes for airports (e.g. JFK, CDG, BOM, LHR)
- Always present flights and routes AFTER they load — do not make up data
- The current date and time is **${dateStr}**`;};

// --- Tool: Ask Follow-Up Questions ---
const askFollowUpQuestions = tool({
  description:
    "Ask the user clarifying questions when travel details are missing. Returns structured JSON with interactive question prompts. Call this when source, destination, date, or key preferences are unclear.",
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
      // --- Step 1: Geocode both locations via Places Text Search ---
      const geocode = async (query: string) => {
        const res = await fetch(
          `${MAPS_PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${env.GOOGLE_MAPS_API_KEY}`
        ).then((r) => r.json());
        const place = res.results?.[0];
        return place
          ? { coords: place.geometry.location as { lat: number; lng: number }, name: place.name as string }
          : null;
      };

      const [originPlace, destPlace] = await Promise.all([
        geocode(originIata ? `${originIata} Airport` : origin),
        geocode(destinationIata ? `${destinationIata} Airport` : destination),
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
          const routesRes = await fetch(MAPS_ROUTES_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
              "X-Goog-FieldMask":
                "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
            },
            body: JSON.stringify({
              origin: { address: originPlace.name },
              destination: { address: destPlace.name },
              travelMode: "DRIVE",
            }),
          }).then((r) => r.json());

          const route = routesRes.routes?.[0];
          if (route) {
            encodedPolyline = route.polyline?.encodedPolyline || null;
            const dMeters = route.distanceMeters || distKm * 1000;
            const dKm = Math.round(dMeters / 1000);
            const dMi = Math.round(dKm * 0.621371);
            distance = `${dKm.toLocaleString()} km (${dMi.toLocaleString()} mi)`;
            const dSecs = parseInt((route.duration || "0s").replace("s", ""), 10);
            const dHours = Math.floor(dSecs / 3600);
            const dMins = Math.round((dSecs % 3600) / 60);
            duration = dHours > 0 ? `${dHours}h ${dMins}m drive` : `${dMins}m drive`;
            isFlightRoute = false;
          } else {
            duration = `~${Math.round(distKm / 60)} min drive`;
          }
        } catch {
          duration = `~${Math.round(distKm / 60)} min drive`;
        }
      }

      const centerLat = (originCoords.lat + destCoords.lat) / 2;
      const centerLng = (originCoords.lng + destCoords.lng) / 2;

      return {
        origin: originPlace.name,
        destination: destPlace.name,
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
      const url = `${FLIGHT_BASE}/onewaytrip/${env.FLIGHTS_API_KEY}/${departureIata.toUpperCase()}/${arrivalIata.toUpperCase()}/${departureDate}/${adults}/${children}/${infants}/${cabinClass}/${currency}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 410) {
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
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: getSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: {
      askFollowUpQuestions,
      calculateRoute,
      searchFlights,
    },
    stopWhen: stepCountIs(10),
    maxOutputTokens: 4096,
  });

  return result.toUIMessageStreamResponse();
}
