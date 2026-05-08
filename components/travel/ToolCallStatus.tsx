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

const COLOR_CLASSES = {
  blue: {
    border: "border-blue-400/25",
    bg: "bg-blue-500/8",
    dot: "bg-blue-400",
    text: "text-blue-300",
    badge: "bg-blue-500/15 text-blue-200 border-blue-400/20",
    spinBorder: "border-blue-400 border-t-transparent",
  },
  indigo: {
    border: "border-indigo-400/25",
    bg: "bg-indigo-500/8",
    dot: "bg-indigo-400",
    text: "text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-200 border-indigo-400/20",
    spinBorder: "border-indigo-400 border-t-transparent",
  },
  purple: {
    border: "border-purple-400/25",
    bg: "bg-purple-500/8",
    dot: "bg-purple-400",
    text: "text-purple-300",
    badge: "bg-purple-500/15 text-purple-200 border-purple-400/20",
    spinBorder: "border-purple-400 border-t-transparent",
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

  const colors = COLOR_CLASSES[meta.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.indigo;
  const isLoading = state === "partial-call" || state === "call";
  const isDone = state === "result";

  const label = isDone ? meta.resultLabel(output) : isLoading ? meta.label(input) : meta.label(input);

  const isError =
    isDone &&
    (output as Record<string, unknown> | undefined)?.error !== undefined;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300 ${
        isError
          ? "border-red-400/20 bg-red-500/5"
          : `${colors.border} ${colors.bg}`
      }`}
    >
      {/* Icon */}
      <span className="text-base shrink-0">{meta.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isError ? "text-red-300" : colors.text
          }`}
        >
          {label}
        </p>
        {isLoading && (
          <p className="text-xs text-white/35 mt-0.5">{meta.loadingLabel}</p>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {isLoading ? (
          <div
            className={`w-4 h-4 rounded-full border-2 animate-spin ${colors.spinBorder}`}
          />
        ) : isDone && !isError ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 12 12">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : isError ? (
          <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 12 12">
              <path
                d="M3 9L9 3M3 3l6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
}
