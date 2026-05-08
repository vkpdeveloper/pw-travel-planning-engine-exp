import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

const MAPS_BASE = "https://maps.googleapis.com/maps/api";
const FLIGHT_BASE = "https://api.flightapi.io";

const systemPrompt = `You are an expert travel experience agent — enthusiastic, knowledgeable, and deeply passionate about helping people explore the world.

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
- Always present flights and routes AFTER they load — do not make up data`;

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
      // Geocode both locations to get coordinates
      const [originGeo, destGeo] = await Promise.all([
        fetch(
          `${MAPS_BASE}/geocode/json?address=${encodeURIComponent(origin)}&key=${env.GOOGLE_MAPS_API_KEY}`
        ).then((r) => r.json()),
        fetch(
          `${MAPS_BASE}/geocode/json?address=${encodeURIComponent(destination)}&key=${env.GOOGLE_MAPS_API_KEY}`
        ).then((r) => r.json()),
      ]);

      const originCoords = originGeo.results?.[0]?.geometry?.location;
      const destCoords = destGeo.results?.[0]?.geometry?.location;
      const originName = originGeo.results?.[0]?.formatted_address || origin;
      const destName = destGeo.results?.[0]?.formatted_address || destination;

      if (!originCoords || !destCoords) {
        return {
          error: "Could not geocode one or both locations",
          origin,
          destination,
          distance: "Unknown",
          duration: "Unknown",
        };
      }

      // Get driving/transit directions for route polyline
      const directionsRes = await fetch(
        `${MAPS_BASE}/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=transit&key=${env.GOOGLE_MAPS_API_KEY}`
      ).then((r) => r.json());

      // Fall back to straight-line distance if no route (e.g., ocean crossings)
      let encodedPolyline: string | null = null;
      let distance = "N/A";
      let duration = "N/A";

      if (directionsRes.routes?.[0]) {
        const route = directionsRes.routes[0];
        encodedPolyline = route.overview_polyline?.points || null;
        distance = route.legs?.[0]?.distance?.text || "N/A";
        duration = route.legs?.[0]?.duration?.text || "N/A";
      } else {
        // Calculate straight-line distance using Haversine formula
        const R = 6371; // km
        const dLat = ((destCoords.lat - originCoords.lat) * Math.PI) / 180;
        const dLon = ((destCoords.lng - originCoords.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((originCoords.lat * Math.PI) / 180) *
            Math.cos((destCoords.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distKm = Math.round(R * c);
        const distMi = Math.round(distKm * 0.621371);
        distance = `${distKm.toLocaleString()} km (${distMi.toLocaleString()} mi)`;
        // Approximate flight time at 900 km/h
        const hours = Math.floor(distKm / 900);
        const mins = Math.round(((distKm / 900) % 1) * 60);
        duration = hours > 0 ? `~${hours}h ${mins}m flight` : `~${mins}m flight`;
      }

      // Calculate map center and zoom
      const centerLat = (originCoords.lat + destCoords.lat) / 2;
      const centerLng = (originCoords.lng + destCoords.lng) / 2;

      return {
        origin: originName,
        destination: destName,
        originIata: originIata || null,
        destinationIata: destinationIata || null,
        originCoords,
        destCoords,
        centerCoords: { lat: centerLat, lng: centerLng },
        encodedPolyline,
        distance,
        duration,
        isFlightRoute: !directionsRes.routes?.[0],
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
      const url = `${FLIGHT_BASE}/onewaytrip/${env.FLIGHT_API_KEY}/${departureIata.toUpperCase()}/${arrivalIata.toUpperCase()}/${departureDate}/${adults}/${children}/${infants}/${cabinClass}/${currency}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 410) {
          return {
            error: "no_flights",
            message: `No flights found from ${departureIata} to ${arrivalIata} on ${departureDate}. The route may not be available or the date may be in the past.`,
            departureIata,
            arrivalIata,
            departureDate,
          };
        }
        return {
          error: "api_error",
          message: `Flight search failed (status ${response.status}). Please verify the airport codes and date.`,
          departureIata,
          arrivalIata,
          departureDate,
        };
      }

      const data = await response.json();

      // Parse and structure the flight data
      const itineraries = data.itineraries || [];
      const legs = data.legs || [];
      const carriers = data.carriers || [];
      const places = data.places || [];

      // Map itineraries to a cleaner structure
      const flights = itineraries.slice(0, 6).map((itin: Record<string, unknown>) => {
        const legIds = (itin.legIds as string[]) || [];
        const leg = legs.find((l: Record<string, unknown>) => l.id === legIds[0]) || {};
        const segmentIds = (leg.segmentIds as string[]) || [];
        const segments = data.segments?.filter((s: Record<string, unknown>) =>
          segmentIds.includes(s.id as string)
        ) || [];

        const carrierId = segments[0]?.operatingCarrierId;
        const carrier = carriers.find((c: Record<string, unknown>) => c.id === carrierId);

        const originPlace = places.find(
          (p: Record<string, unknown>) => p.id === leg.originPlaceId
        );
        const destPlace = places.find(
          (p: Record<string, unknown>) => p.id === leg.destinationPlaceId
        );

        const pricing = (itin.pricingOptions as Record<string, unknown>[])?.[0] || {};
        const price = (pricing.price as Record<string, unknown>) || {};

        return {
          id: itin.id,
          price: {
            amount: price.amount || 0,
            currency: (price.unit as string)?.toUpperCase() || currency,
            formatted: price.amount
              ? `${(price.unit as string)?.toUpperCase() || currency} ${Number(price.amount).toFixed(2)}`
              : "Price unavailable",
          },
          carrier: {
            name: carrier?.name || "Unknown Airline",
            iata: carrier?.iata || "",
            imageUrl: carrier?.imageUrl || null,
          },
          departure: {
            time: leg.departure || "",
            airport: originPlace?.name || departureIata,
            iata: originPlace?.iata || departureIata,
          },
          arrival: {
            time: leg.arrival || "",
            airport: destPlace?.name || arrivalIata,
            iata: destPlace?.iata || arrivalIata,
          },
          duration: leg.durationInMinutes
            ? `${Math.floor((leg.durationInMinutes as number) / 60)}h ${(leg.durationInMinutes as number) % 60}m`
            : "N/A",
          stops: (leg.stopCount as number) || 0,
          segments: segments.map((s: Record<string, unknown>) => ({
            flightNumber: `${(s.marketingCarrierId as string) || ""}${(s.flightNumber as string) || ""}`,
            departure: s.departure,
            arrival: s.arrival,
            origin: s.originPlaceId,
            destination: s.destinationPlaceId,
          })),
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
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages,
    tools: {
      askFollowUpQuestions,
      calculateRoute,
      searchFlights,
    },
    stopWhen: stepCountIs(10),
    maxTokens: 4096,
  });

  return result.toUIMessageStreamResponse();
}
