"use client";

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
    loadingLabel: "Thinking about what to ask...",
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
    loadingLabel: "Fetching route from Google Maps...",
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
    loadingLabel: "Searching Google Places for ratings, photos, hours...",
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
    loadingLabel: "Computing best visit order with Google Routes...",
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
    loadingLabel: "Fetching cinematic 3D fly-through...",
    resultLabel: (output) => {
      const o = output as
        | { videoUrl?: string | null; state?: string; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "Aerial view unavailable";
      if (o?.videoUrl) return "Aerial view ready";
      return "Rendering aerial view...";
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
    loadingLabel: "Scanning real-time flight availability...",
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
  },
};

export function ToolCallStatus({ toolName, state, input, output }: ToolStatusProps) {
  const meta = TOOL_META[toolName] || {
    icon: "⚙️",
    label: () => toolName.replace(/([A-Z])/g, " $1").trim(),
    loadingLabel: "Processing...",
    resultLabel: () => "Done",
    color: "indigo",
  };

  const colors = COLOR_CLASSES[meta.color] || COLOR_CLASSES.indigo;
  const isLoading = state === "partial-call" || state === "call";
  const isDone = state === "result";

  const label = isDone ? meta.resultLabel(output) : meta.label(input);

  const isError =
    isDone &&
    (output as Record<string, unknown> | undefined)?.error !== undefined;

  return (
    <div className="group relative">
      {/* Ambient colored glow behind card while loading */}
      {isLoading && (
        <div
          className={`absolute -inset-1 rounded-2xl ${colors.glow} blur-2xl opacity-60 animate-pulse pointer-events-none`}
          style={{ animationDuration: "2.5s" }}
        />
      )}

      <div
        className={`relative flex items-center gap-4 rounded-2xl px-4 py-3.5 backdrop-blur-xl border overflow-hidden transition-all duration-500 ${
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
              style={{
                animation: "tcs-shimmer 1.6s linear infinite",
              }}
            />
          </div>
        )}

        {/* Icon block */}
        <div className="relative shrink-0">
          {/* Soft outer ring while loading */}
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
            <span className="text-lg drop-shadow-sm leading-none">
              {meta.icon}
            </span>
            {/* Glossy highlight */}
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
              <div
                className={`absolute inset-0 rounded-full border-2 ${colors.spinTrack}`}
              />
              <div
                className={`absolute inset-0 rounded-full border-2 border-transparent ${colors.spinHead} animate-spin`}
                style={{ animationDuration: "0.9s" }}
              />
            </div>
          ) : isDone && !isError ? (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/30 ring-2 ring-white">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12">
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/30 ring-2 ring-white">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12">
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
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        @keyframes tcs-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
        @keyframes tcs-bounce {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
