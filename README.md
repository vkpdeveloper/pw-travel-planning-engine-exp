# TravelMind — AI Travel Experience Agent

An AI-powered travel assistant that takes a natural-language trip description and turns it into a full travel experience: interactive follow-up questions, an animated map, real-time flight search, and a vivid narrative description of the journey — all streamed live in the browser.

**Built using Google AI Gemini Models.**  
**Using Antigravity.**

---

## Powered by Google AI & Google Cloud

This platform is built from the ground up on Google's world-class AI and cloud infrastructure. Every intelligent interaction, every map visualization, and every deployment pipeline is made possible by Google's cutting-edge services:

### Google AI Gemini
The heart and soul of TravelMind is **Google's Gemini AI** (`gemini-3.1-flash-lite`). Gemini powers our multi-step travel agent with extraordinary natural language understanding — it doesn't just parse queries, it *comprehends intent*. From deciphering vague travel wishes like "I want to go somewhere warm next month" to generating structured, context-aware follow-up questions, Gemini operates with remarkable speed and intelligence. It crafts vivid, sensory-rich travel narratives that stream live to users, making every trip feel real before a single ticket is booked. Google's Gemini represents the gold standard in accessible, high-performance AI, enabling us to deliver a conversational experience that feels genuinely human.

### Google Maps Platform
Our entire geospatial layer is powered by the comprehensive **Google Maps Platform**, delivering unparalleled location intelligence:

- **Google Maps JavaScript API** — Renders our stunning, dark-themed interactive maps with Advanced Markers and cloud-based styling. The smooth animations, rotating plane icons, and progressive route drawing create a cinematic travel planning experience directly in the browser.
- **Google Geocoding API** — Instantly resolves free-text city names into precise geographic coordinates with Google's unmatched global place database. Whether it's a major metropolis or a hidden gem, Geocoding delivers accurate location data every time.
- **Google Places API v1** — Unlocks Google's vast repository of place knowledge, enabling rich destination context and discovery capabilities.
- **Google Routes API v2** — Computes optimized, real-world road directions with stable place IDs and encoded polylines. For shorter journeys, it provides actual drivable routes rather than simple straight-line distances, giving users realistic travel expectations.

Together, these APIs form the most comprehensive mapping solution available, trusted by billions of users worldwide.

### Google Cloud Platform
Our entire infrastructure runs on **Google Cloud**, leveraging enterprise-grade reliability and performance:

- **Google Cloud Run** — Provides our serverless, auto-scaling container deployment. Cloud Run handles traffic spikes effortlessly, scales to zero when idle to optimize costs, and ensures our travel agent is always available with Google's global network backbone.
- **Google Cloud Build** — Powers our CI/CD pipeline with high-performance build machines (`E2_HIGHCPU_8`), enabling rapid, reliable container builds and deployments.
- **Google Maps Platform Map Management** — Cloud-managed map styling and configuration ensures consistent, beautiful map experiences across all user sessions.

By building on Google Cloud, we inherit the same infrastructure that powers Google's own products — world-class security, global availability, and infinite scalability. Google's ecosystem doesn't just support our platform; it elevates every aspect of the user experience.

---

## What It Does

1. **Understands natural language** — Type something like "I want to fly from Mumbai to Paris next month" and the agent figures out what it knows and what it still needs.
2. **Asks targeted follow-up questions** — If origin, destination, date, passenger count, or cabin class is missing, the AI generates a structured interactive form rendered inline in the chat.
3. **Calculates the route** — Geocodes both cities, then either computes a great-circle flight arc (long haul) or queries the Google Routes API for an actual road path (short distances).
4. **Renders an animated map** — A dark-themed Google Map draws the route progressively with a moving plane icon (or road polyline) and an info bar showing distance and duration.
5. **Searches real-time flights** — Queries FlightAPI.io and renders up to 6 flight cards with airline, times, stops, and price.
6. **Streams a travel narrative** — Gemini AI writes a vivid, sensory description of the journey that streams word-by-word into the chat.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** | App Router, Server Components, standalone Docker output |
| Runtime | **Bun** | Faster installs and dev server than Node/npm |
| Language | **TypeScript 5** (strict) | Type safety across client and server |
| UI | **React 19** | Latest concurrent features |
| AI SDK | **Vercel AI SDK v6** | Streaming text, tool calls, multi-step agent loops |
| AI Model | **Google Gemini** (`gemini-3.1-flash-lite`) | Fast, cheap, multimodal-capable |
| Maps (client) | **Google Maps JS API** | Interactive animated route rendering |
| Maps (server) | Google Geocoding API + Places API v1 + Routes API v2 | Location lookup, place discovery, and optimized directions |
| Flight Data | **FlightAPI.io** | Real-time one-way flight search |
| Styling | **Tailwind CSS v4** | Utility-first, no config file needed in v4 |
| Components | **shadcn/ui** (radix-maia style) | Accessible, composable, unstyled primitives |
| Schema Validation | **Zod v4** | Env var validation + AI tool input schemas |
| Markdown | **streamdown** | Animated markdown rendering during streaming |
| Deployment | **Docker → Google Cloud Run** | Containerised, auto-scaling, serverless |

---

## Project Structure

```
warm-up/
├── app/
│   ├── api/travel/route.ts     # POST endpoint — AI agent with travel and Google service tools
│   ├── globals.css             # Tailwind v4 + shadcn CSS vars (OKLCH, dark mode)
│   ├── layout.tsx              # Root layout: Inter, Public Sans, Geist fonts
│   └── page.tsx                # Single-page app: entire chat UI
├── components/
│   ├── travel/
│   │   ├── AnimatedMap.tsx     # Dark Google Map with animated flight/road arc
│   │   ├── FlightResults.tsx   # Flight card grid with stop indicators
│   │   ├── QuestionFlow.tsx    # Interactive follow-up question form
│   │   └── ToolCallStatus.tsx  # Loading/success/error pill for each AI tool
│   └── ui/
│       ├── button.tsx          # CVA-based shadcn button
│       └── input.tsx           # Textarea-backed pill input (Enter to submit)
├── lib/
│   ├── env.ts                  # Zod env validation — app refuses to start if keys missing
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
├── next.config.ts              # standalone output, exposes Maps key as NEXT_PUBLIC_
├── Dockerfile                  # 3-stage Bun build → slim runner image
├── cloudbuild.yaml             # GCP Cloud Build config
└── deploy.sh                   # One-command build + Cloud Run deploy
```

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) installed
- A `.env` file at the project root with all required keys

### Environment Variables

```env
GOOGLE_GENERATIVE_API_KEY=   # Gemini API key (Google AI Studio)
GOOGLE_MAPS_API_KEY=         # Maps JS API + Geocoding API + Places API v1 + Routes API enabled
GOOGLE_MAPS_MAP_ID=          # JavaScript Map ID from Google Maps Platform Map Management
FLIGHTS_API_KEY=             # FlightAPI.io key
```

All required variables are validated at startup by `lib/env.ts`. The app will throw and refuse to start if any are missing or empty.

### Run

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Google Cloud Run)

The project includes a full Cloud Run deployment pipeline.

```bash
# One-command deploy (requires gcloud CLI authenticated)
./deploy.sh
```

- **Project:** `medzimi`
- **Region:** `asia-south1`
- **Service:** `pw-travel-planning-engine-exp`
- **Build machine:** `E2_HIGHCPU_8` (Cloud Build)
- **Image output:** `output: "standalone"` in `next.config.ts`

The Dockerfile is a 3-stage build: install deps → build → slim runner image with a non-root `nextjs` user.

---

## Architecture & Design Decisions

### Single-Page App, No Routing

The entire experience fits in one page (`app/page.tsx`). There is no need for multiple routes — the chat interface is a progressive disclosure pattern where each step (questions → map → flights → narrative) flows naturally in the same conversation thread.

### AI Agent with Tools (Multi-Step)

The backend (`app/api/travel/route.ts`) runs a **Vercel AI SDK v6 agent loop** with `streamText` and three tools:

| Tool | Purpose |
|---|---|
| `askFollowUpQuestions` | AI generates structured questions; client renders them as an interactive form |
| `calculateRoute` | Geocodes cities, computes distance/duration, returns coords + polyline |
| `searchFlights` | Calls FlightAPI.io, normalises up to 6 itineraries |

The agent is capped at 10 steps (`stopWhen: stepCountIs(10)`) and 4096 output tokens to prevent runaway loops.

`askFollowUpQuestions` is a **passthrough tool** — its `execute` function just returns the AI's structured input unchanged. The heavy lifting is entirely on the client side (`QuestionFlow.tsx`), keeping the server stateless.

### State Management: No External Store

All state lives in React `useState` hooks inside `page.tsx`. Chat state is managed by `useChat` from `@ai-sdk/react`. There is no Redux, Zustand, or Jotai — the app is simple enough that prop-passing and local state suffice. A `submittedQuestions` Set (keyed by `toolCallId`) is the only cross-render coordination needed, to prevent re-submitting a question form after navigation or re-render.

### Vercel AI SDK v6 Message Model

v6 uses a `parts` array on each message instead of flat tool invocations. Tool calls are `dynamic-tool` typed parts with states `input-streaming | input-available | output-available`. A local `mapToolState()` adapter translates these to the display labels used by `ToolCallStatus.tsx`. `convertToModelMessages()` transforms UI messages into the format Gemini expects before each request.

### Map: Flight Arc vs. Road Polyline

Route type is determined by distance:
- **> 500 km** → treat as a flight. Distance is computed with the **Haversine formula** (great-circle), duration estimated at 900 km/h cruise speed. The map draws a smooth bezier arc with a plane emoji that rotates to match the bearing.
- **≤ 500 km** → treat as driveable. Locations are resolved with the **Google Geocoding API**, then the **Google Routes API v2** is queried with stable place IDs when available. The returned encoded polyline is decoded and drawn on the map.

The map uses a configured Google Maps **Map ID** for Advanced Markers and cloud styling, and is dynamically imported (`next/dynamic`, `ssr: false`) because it depends on the `window` object and the Google Maps global.

Animation is a `requestAnimationFrame` loop that progressively draws the polyline/arc over ~2800ms at 30fps, giving the feeling of a live route being traced.

### Styling: Tailwind CSS v4 + OKLCH Color Space

Tailwind v4 requires no `tailwind.config.ts` — it is configured inline via `@theme` blocks in `globals.css`. CSS custom properties use the **OKLCH color space** (as generated by shadcn), which gives perceptually uniform color scales that look better across monitors.

The light theme (`#fafbfc` background) uses a mesh-gradient background of three pulsing blurred circles (purple, blue, pink with `mix-blend-multiply`) for visual warmth without hard-coded images. The input bar uses **glassmorphism** (`bg-white/80 backdrop-blur-2xl`) for a modern floating feel.

Color semantics are consistent across components:
- **Indigo/blue** — AI/system elements (tool calls, user avatar, flight search)
- **Amber** — destination labels on the map
- **Emerald** — success states
- **Red** — error states
- **Purple** — flight/route tool

### `input.tsx` Is Actually a Textarea

The chat input is a `<textarea>` styled as a pill input. This allows multi-line messages. The Enter key submits; Shift+Enter inserts a newline — a UX convention borrowed from messaging apps. Auto-resize is handled by setting `height: auto` then `height: scrollHeight` on every keystroke, capped at 240px.

### Environment Validation at Build Time

`lib/env.ts` exports a Zod-parsed env object. `next.config.ts` imports it at the top level, meaning validation runs **at build time** (not just runtime). A missing API key will fail the build, not just the first request — catching configuration errors early in CI.

### Fonts

Three font families are loaded via Next.js `next/font/google`:
- **Inter** — body text, general UI
- **Public Sans** — headings, the app title
- **Geist Sans + Geist Mono** — code-like UI elements, monospaced outputs

These are exposed as CSS variables (`--font-inter`, `--font-public-sans`, `--font-geist-sans`, `--font-geist-mono`) and applied via Tailwind's `fontFamily` theme.

---

## Future Ideas

- **Destination photo cards** — Use the Google Maps Places API to fetch photos and ratings for top attractions at the destination, displayed inline in the chat for richer context before booking.

---

## Notes for AI Coding Assistants

This project runs **Next.js 16**, which has breaking changes compared to Next.js 13–15. Before writing any Next.js-specific code, read the docs in `node_modules/next/dist/docs/`. The `AGENTS.md` file at the project root is a standing reminder of this.
