"use client";

import { cn } from "@/lib/utils";

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
    label: (input?: unknown) => string;
    resultLabel: (output?: unknown) => string;
  }
> = {
  askFollowUpQuestions: {
    label: () => "Preparing questions",
    resultLabel: () => "Questions ready",
  },
  calculateRoute: {
    label: (input) => {
      const i = input as { origin?: string; destination?: string } | undefined;
      if (i?.origin && i?.destination) {
        return `Mapping ${i.origin.split(",")[0]} → ${i.destination.split(",")[0]}`;
      }
      return "Calculating route";
    },
    resultLabel: (output) => {
      const o = output as { distance?: string; duration?: string; error?: string } | undefined;
      if (o?.error) return "Route calculation failed";
      if (o?.distance) return `Route · ${o.distance} · ${o.duration}`;
      return "Route calculated";
    },
  },
  findPlaces: {
    label: (input) => {
      const i = input as { destination?: string; category?: string } | undefined;
      if (i?.destination && i?.category) {
        return `Finding ${i.category} in ${i.destination.split(",")[0]}`;
      }
      return "Discovering places";
    },
    resultLabel: (output) => {
      const o = output as { count?: number; error?: string; message?: string } | undefined;
      if (o?.error) return o.message || "No places found";
      if (o?.count) return `Found ${o.count} place${o.count > 1 ? "s" : ""}`;
      return "Places loaded";
    },
  },
  optimizeItinerary: {
    label: (input) => {
      const i = input as { stops?: Array<{ name: string }> } | undefined;
      if (i?.stops?.length) return `Optimizing ${i.stops.length} stops`;
      return "Optimizing itinerary";
    },
    resultLabel: (output) => {
      const o = output as
        | { totalDuration?: string; wasReordered?: boolean; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "Could not optimize";
      if (o?.totalDuration)
        return `${o.wasReordered ? "Reordered · " : ""}${o.totalDuration} total`;
      return "Itinerary ready";
    },
  },
  aerialView: {
    label: (input) => {
      const i = input as { address?: string } | undefined;
      if (i?.address) return `Loading aerial view: ${i.address.split(",")[0]}`;
      return "Loading aerial view";
    },
    resultLabel: (output) => {
      const o = output as
        | { videoUrl?: string | null; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "Aerial view unavailable";
      if (o?.videoUrl) return "Aerial view ready";
      return "Rendering aerial view";
    },
  },
  searchFlights: {
    label: (input) => {
      const i = input as
        | { departureIata?: string; arrivalIata?: string }
        | undefined;
      if (i?.departureIata && i?.arrivalIata) {
        return `Searching flights: ${i.departureIata} → ${i.arrivalIata}`;
      }
      return "Searching flights";
    },
    resultLabel: (output) => {
      const o = output as
        | { totalResults?: number; error?: string; message?: string }
        | undefined;
      if (o?.error) return o.message || "No flights found";
      if (o?.totalResults) return `Found ${o.totalResults} flight${o.totalResults > 1 ? "s" : ""}`;
      return "Flights loaded";
    },
  },
};

export function ToolCallStatus({ toolName, state, input, output }: ToolStatusProps) {
  const meta = TOOL_META[toolName] || {
    label: () => toolName.replace(/([A-Z])/g, " $1").trim(),
    resultLabel: () => "Done",
  };

  const isLoading = state === "partial-call" || state === "call";
  const isDone = state === "result";
  const isError =
    isDone && (output as Record<string, unknown> | undefined)?.error !== undefined;

  const label = isDone ? meta.resultLabel(output) : meta.label(input);

  return (
    <div
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-2 text-xs text-slate-500"
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="w-3 h-3 rounded-full border-[1.5px] border-slate-300 border-t-indigo-500 animate-spin"
        />
      ) : isError ? (
        <span aria-hidden="true" className="w-3 h-3 rounded-full bg-red-400" />
      ) : (
        <svg
          aria-hidden="true"
          className="w-3 h-3 text-emerald-500"
          fill="none"
          viewBox="0 0 12 12"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className={cn("font-medium", isError ? "text-red-600" : "text-slate-600")}>
        {label}
      </span>
    </div>
  );
}
