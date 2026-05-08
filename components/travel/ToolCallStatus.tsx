"use client";

import { motion } from "motion/react";

type ToolState = "partial-call" | "call" | "result";

interface ToolStatusProps {
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
}

const TOOL_META: Record<
  string,
  {
    icon: string;
    label: (input?: unknown) => string;
    loadingLabel: string;
    resultLabel: (output?: unknown) => string;
    color: string;
  }
> = {
  askFollowUpQuestions: {
    icon: "💬",
    label: () => "Preparing questions",
    loadingLabel: "Thinking about what to ask…",
    resultLabel: () => "Questions ready",
    color: "blue",
  },
  calculateRoute: {
    icon: "🗺️",
    label: (input) => {
      const i = input as { origin?: string; destination?: string } | undefined;
      if (i?.origin && i?.destination) {
        return `Mapping route: ${i.origin.split(",")[0]} → ${i.destination.split(",")[0]}`;
      }
      return "Calculating route";
    },
    loadingLabel: "Fetching route from Google Maps…",
    resultLabel: (output) => {
      const o = output as { distance?: string; duration?: string; error?: string } | undefined;
      if (o?.error) return "Route calculation failed";
      if (o?.distance) return `Route found · ${o.distance} · ${o.duration}`;
      return "Route calculated";
    },
    color: "indigo",
  },
  findPlaces: {
    icon: "📍",
    label: (input) => {
      const i = input as { destination?: string; category?: string } | undefined;
      if (i?.destination && i?.category) {
        return `Finding ${i.category} in ${i.destination.split(",")[0]}`;
      }
      return "Discovering places";
    },
    loadingLabel: "Searching Google Places for ratings, photos, hours…",
    resultLabel: (output) => {
      const o = output as { count?: number; error?: string; message?: string } | undefined;
      if (o?.error) return o.message || "No places found";
      if (o?.count) return `Found ${o.count} place${o.count > 1 ? "s" : ""}`;
      return "Places loaded";
    },
    color: "emerald",
  },
  optimizeItinerary: {
    icon: "🧭",
    label: (input) => {
      const i = input as { stops?: Array<{ name: string }> } | undefined;
      if (i?.stops?.length) return `Optimizing route through ${i.stops.length} stops`;
      return "Optimizing itinerary";
    },
    loadingLabel: "Computing best visit order with Google Routes…",
    resultLabel: (output) => {
      const o = output as
        | { totalDuration?: string; wasReordered?: boolean; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "Could not optimize";
      if (o?.totalDuration)
        return `${o.wasReordered ? "Reordered · " : ""}${o.totalDuration} total`;
      return "Itinerary ready";
    },
    color: "amber",
  },
  aerialView: {
    icon: "🎥",
    label: (input) => {
      const i = input as { address?: string } | undefined;
      if (i?.address) return `Loading aerial view: ${i.address.split(",")[0]}`;
      return "Loading aerial view";
    },
    loadingLabel: "Fetching cinematic 3D fly-through…",
    resultLabel: (output) => {
      const o = output as
        | { videoUrl?: string | null; state?: string; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "Aerial view unavailable";
      if (o?.videoUrl) return "Aerial view ready";
      return "Rendering aerial view…";
    },
    color: "rose",
  },
  searchFlights: {
    icon: "✈️",
    label: (input) => {
      const i = input as
        | { departureIata?: string; arrivalIata?: string; departureDate?: string }
        | undefined;
      if (i?.departureIata && i?.arrivalIata) {
        return `Searching flights: ${i.departureIata} → ${i.arrivalIata}`;
      }
      return "Searching flights";
    },
    loadingLabel: "Scanning real-time flight availability…",
    resultLabel: (output) => {
      const o = output as
        | { success?: boolean; totalResults?: number; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "No flights found";
      if (o?.totalResults) return `Found ${o.totalResults} flight${o.totalResults > 1 ? "s" : ""}`;
      return "Flights loaded";
    },
    color: "purple",
  },
};

type ColorTheme = {
  iconGradient: string;
  iconShadow: string;
  iconRing: string;
  accent: string;
  accentSoft: string;
  shimmer: string;
  glow: string;
  spinTrack: string;
  spinHead: string;
  detailBg: string;
  detailBorder: string;
  detailText: string;
  badgeBg: string;
  badgeText: string;
};

const COLOR_CLASSES: Record<string, ColorTheme> = {
  blue: {
    iconGradient: "from-sky-400 to-blue-500",
    iconShadow: "shadow-blue-500/25",
    iconRing: "ring-blue-200/60",
    accent: "text-blue-600",
    accentSoft: "text-blue-500/80",
    shimmer: "via-blue-400/40",
    glow: "bg-blue-300/30",
    spinTrack: "border-blue-100",
    spinHead: "border-t-blue-500",
    detailBg: "bg-blue-50/60",
    detailBorder: "border-blue-100/80",
    detailText: "text-blue-700",
    badgeBg: "bg-blue-100/70",
    badgeText: "text-blue-600",
  },
  indigo: {
    iconGradient: "from-indigo-500 to-blue-600",
    iconShadow: "shadow-indigo-500/30",
    iconRing: "ring-indigo-200/60",
    accent: "text-indigo-600",
    accentSoft: "text-indigo-500/80",
    shimmer: "via-indigo-400/40",
    glow: "bg-indigo-300/30",
    spinTrack: "border-indigo-100",
    spinHead: "border-t-indigo-500",
    detailBg: "bg-indigo-50/60",
    detailBorder: "border-indigo-100/80",
    detailText: "text-indigo-700",
    badgeBg: "bg-indigo-100/70",
    badgeText: "text-indigo-600",
  },
  purple: {
    iconGradient: "from-violet-500 to-purple-600",
    iconShadow: "shadow-purple-500/25",
    iconRing: "ring-purple-200/60",
    accent: "text-purple-600",
    accentSoft: "text-purple-500/80",
    shimmer: "via-purple-400/40",
    glow: "bg-purple-300/30",
    spinTrack: "border-purple-100",
    spinHead: "border-t-purple-500",
    detailBg: "bg-purple-50/60",
    detailBorder: "border-purple-100/80",
    detailText: "text-purple-700",
    badgeBg: "bg-purple-100/70",
    badgeText: "text-purple-600",
  },
  emerald: {
    iconGradient: "from-emerald-400 to-teal-500",
    iconShadow: "shadow-emerald-500/25",
    iconRing: "ring-emerald-200/60",
    accent: "text-emerald-600",
    accentSoft: "text-emerald-500/80",
    shimmer: "via-emerald-400/40",
    glow: "bg-emerald-300/30",
    spinTrack: "border-emerald-100",
    spinHead: "border-t-emerald-500",
    detailBg: "bg-emerald-50/60",
    detailBorder: "border-emerald-100/80",
    detailText: "text-emerald-700",
    badgeBg: "bg-emerald-100/70",
    badgeText: "text-emerald-600",
  },
  amber: {
    iconGradient: "from-amber-400 to-orange-500",
    iconShadow: "shadow-amber-500/25",
    iconRing: "ring-amber-200/60",
    accent: "text-amber-600",
    accentSoft: "text-amber-500/80",
    shimmer: "via-amber-400/40",
    glow: "bg-amber-300/30",
    spinTrack: "border-amber-100",
    spinHead: "border-t-amber-500",
    detailBg: "bg-amber-50/60",
    detailBorder: "border-amber-100/80",
    detailText: "text-amber-700",
    badgeBg: "bg-amber-100/70",
    badgeText: "text-amber-600",
  },
  rose: {
    iconGradient: "from-rose-400 to-pink-500",
    iconShadow: "shadow-rose-500/25",
    iconRing: "ring-rose-200/60",
    accent: "text-rose-600",
    accentSoft: "text-rose-500/80",
    shimmer: "via-rose-400/40",
    glow: "bg-rose-300/30",
    spinTrack: "border-rose-100",
    spinHead: "border-t-rose-500",
    detailBg: "bg-rose-50/60",
    detailBorder: "border-rose-100/80",
    detailText: "text-rose-700",
    badgeBg: "bg-rose-100/70",
    badgeText: "text-rose-600",
  },
};

// ─── Streaming input detail sections ─────────────────────────────────────────

function QuestionStreamDetails({
  input,
  colors,
}: {
  input: unknown;
  colors: ColorTheme;
}) {
  const i = input as Record<string, unknown> | null | undefined;
  if (!i) return null;

  const context = i.context as string | undefined;
  const questions = i.questions as
    | Array<{ id?: string; question?: string; type?: string }>
    | undefined;

  if (!context && (!questions || questions.length === 0)) return null;

  return (
    <div
      className={`mt-3 pt-3 border-t ${colors.detailBorder} space-y-2.5`}
    >
      {context && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-500 italic leading-relaxed line-clamp-2"
        >
          &ldquo;{context}&rdquo;
        </motion.p>
      )}
      {questions && questions.length > 0 && (
        <div className="space-y-1.5">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id ?? idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <span
                className={`w-4 h-4 rounded-full ${colors.badgeBg} flex items-center justify-center text-[9px] font-bold ${colors.badgeText} shrink-0`}
              >
                {idx + 1}
              </span>
              <span className="text-xs text-slate-600 flex-1 truncate">
                {q.question}
              </span>
              {q.type && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-400 font-medium shrink-0 capitalize">
                  {q.type}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParamStreamDetails({
  toolName,
  input,
  colors,
}: {
  toolName: string;
  input: unknown;
  colors: ColorTheme;
}) {
  const i = input as Record<string, unknown> | null | undefined;
  if (!i || Object.keys(i).length === 0) return null;

  const chips: Array<{ label: string; value: string }> = [];

  if (toolName === "calculateRoute" || toolName === "searchFlights") {
    const from = (i.origin || i.departureIata) as string | undefined;
    const to = (i.destination || i.arrivalIata) as string | undefined;
    if (from) chips.push({ label: "from", value: from.split(",")[0] });
    if (to) chips.push({ label: "to", value: to.split(",")[0] });
    if (i.departureDate) chips.push({ label: "date", value: String(i.departureDate) });
    const pax = (i.passengers || i.adults) as number | undefined;
    if (pax) chips.push({ label: "pax", value: String(pax) });
    if (i.cabinClass) chips.push({ label: "class", value: String(i.cabinClass) });
  } else if (toolName === "findPlaces") {
    if (i.destination) chips.push({ label: "in", value: String(i.destination).split(",")[0] });
    if (i.category) chips.push({ label: "category", value: String(i.category) });
  } else if (toolName === "aerialView") {
    if (i.address)
      chips.push({ label: "location", value: String(i.address).split(",").slice(0, 2).join(",") });
  } else if (toolName === "optimizeItinerary") {
    const stops = i.stops as unknown[] | undefined;
    if (stops?.length) chips.push({ label: "stops", value: String(stops.length) });
    if (i.startLocation)
      chips.push({ label: "from", value: String(i.startLocation).split(",")[0] });
  }

  if (chips.length === 0) return null;

  return (
    <div className={`mt-2.5 pt-2.5 border-t ${colors.detailBorder}`}>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.04, duration: 0.18 }}
            className="flex items-center gap-1"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              {chip.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${colors.badgeBg} ${colors.badgeText}`}
            >
              {chip.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ToolCallStatus({ toolName, state, input, output }: ToolStatusProps) {
  const meta = TOOL_META[toolName] || {
    icon: "⚙️",
    label: () => toolName.replace(/([A-Z])/g, " $1").trim(),
    loadingLabel: "Processing…",
    resultLabel: () => "Done",
    color: "indigo",
  };

  const colors = COLOR_CLASSES[meta.color] || COLOR_CLASSES.indigo;
  const isLoading = state === "partial-call" || state === "call";
  const isDone = state === "result";

  const label = isDone ? meta.resultLabel(output) : meta.label(input);

  const isError =
    isDone && (output as Record<string, unknown> | undefined)?.error !== undefined;

  // Decide which streaming detail to render
  const hasStreamingDetails =
    isLoading &&
    input != null &&
    Object.keys(input as object).length > 0;

  return (
    <div className="group relative" role="status" aria-label={label}>
      {/* Ambient colored glow while loading */}
      {isLoading && (
        <div
          className={`absolute -inset-1 rounded-2xl ${colors.glow} blur-2xl opacity-60 animate-pulse pointer-events-none`}
          style={{ animationDuration: "2.5s" }}
        />
      )}

      <div
        className={`relative rounded-2xl px-4 py-3.5 backdrop-blur-xl border overflow-hidden transition-all duration-500 ${
          isError
            ? "border-rose-200 bg-gradient-to-br from-rose-50/90 to-white/90"
            : isDone
            ? "border-slate-200/70 bg-gradient-to-br from-white/95 to-slate-50/80 shadow-sm shadow-slate-200/40"
            : "border-slate-200/80 bg-gradient-to-br from-white/95 to-white/70 shadow-md shadow-slate-200/50"
        }`}
      >
        {/* Top shimmer line while loading */}
        {isLoading && (
          <div className="absolute top-0 inset-x-0 h-px overflow-hidden">
            <div
              className={`h-full w-1/3 bg-gradient-to-r from-transparent ${colors.shimmer} to-transparent`}
              style={{ animation: "tcs-shimmer 1.6s linear infinite" }}
            />
          </div>
        )}

        {/* ── Main row: icon + content + status indicator ─────────────────── */}
        <div className="flex items-center gap-4">
          {/* Icon block */}
          <div className="relative shrink-0">
            {isLoading && (
              <div
                className={`absolute -inset-1 rounded-2xl ring-2 ${colors.iconRing} animate-ping opacity-70`}
                style={{ animationDuration: "2s" }}
              />
            )}
            <div
              className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${
                isError ? "from-rose-400 to-rose-500" : colors.iconGradient
              } flex items-center justify-center shadow-lg ${
                isError ? "shadow-rose-500/25" : colors.iconShadow
              } ring-1 ring-white/40`}
            >
              <span className="text-lg drop-shadow-sm leading-none" aria-hidden="true">{meta.icon}</span>
              <div className="absolute inset-x-1 top-1 h-1/3 rounded-t-lg bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-[13.5px] font-semibold tracking-tight truncate ${
                isError ? "text-rose-700" : "text-slate-800"
              }`}
            >
              {label}
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-xs font-medium truncate ${colors.accentSoft}`}>
                  {meta.loadingLabel}
                </p>
                <span className="flex items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full bg-current ${colors.accent}`}
                      style={{
                        animation: "tcs-bounce 1s ease-in-out infinite",
                        animationDelay: `${i * 140}ms`,
                      }}
                    />
                  ))}
                </span>
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                {isError ? "Failed" : "Completed"}
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {isLoading ? (
              <div className="relative w-7 h-7">
                <div className={`absolute inset-0 rounded-full border-2 ${colors.spinTrack}`} />
                <div
                  className={`absolute inset-0 rounded-full border-2 border-transparent ${colors.spinHead} animate-spin`}
                  style={{ animationDuration: "0.9s" }}
                />
              </div>
            ) : isDone && !isError ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/30 ring-2 ring-white" aria-label="Completed">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : isError ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/30 ring-2 ring-white" aria-label="Failed">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 9L9 3M3 3l6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Streaming detail section ────────────────────────────────────── */}
        {hasStreamingDetails &&
          (toolName === "askFollowUpQuestions" ? (
            <QuestionStreamDetails input={input} colors={colors} />
          ) : (
            <ParamStreamDetails toolName={toolName} input={input} colors={colors} />
          ))}

        {/* Bottom progress bar while loading */}
        {isLoading && (
          <div className="absolute bottom-0 inset-x-0 h-[2px] overflow-hidden rounded-b-2xl">
            <div
              className={`h-full bg-gradient-to-r from-transparent via-current to-transparent ${colors.accent} opacity-70`}
              style={{
                width: "40%",
                animation: "tcs-progress 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes tcs-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes tcs-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes tcs-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
