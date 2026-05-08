"use client";

import { cn } from "@/lib/utils";

export interface ItineraryLeg {
  from: string;
  to: string;
  duration: string;
  distanceKm: number;
}

export interface ItineraryData {
  success?: boolean;
  travelMode?: "DRIVE" | "WALK" | "BICYCLE";
  wasReordered?: boolean;
  totalDuration?: string;
  totalDistanceKm?: number;
  encodedPolyline?: string | null;
  orderedStops?: string[];
  legs?: ItineraryLeg[];
  error?: string;
  message?: string;
}

const MODE_LABEL: Record<string, string> = {
  DRIVE: "Driving",
  WALK: "Walking",
  BICYCLE: "Cycling",
};

export function ItineraryRoute({ data }: { data: ItineraryData }) {
  if (data.error) return null;
  if (!data.orderedStops || !data.legs) return null;

  const modeLabel = MODE_LABEL[data.travelMode || "DRIVE"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">
            Optimized day plan
          </h3>
          <span className="text-xs text-slate-400">· {modeLabel}</span>
          {data.wasReordered && (
            <span className="text-[10px] uppercase tracking-wide font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
              reordered
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">{data.totalDuration}</span>
          <span className="text-slate-300 mx-1.5">·</span>
          <span>{data.totalDistanceKm} km</span>
        </div>
      </div>

      <ol className="relative pt-3">
        {data.orderedStops.map((stop, i) => {
          const isLast = i === data.orderedStops!.length - 1;
          const leg = i < data.legs!.length ? data.legs![i] : null;
          return (
            <li key={i} className="relative pl-8 pb-4 last:pb-0">
              {!isLast && (
                <span className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200" />
              )}
              <span
                className={cn(
                  "absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border",
                  i === 0
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : isLast
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-white border-slate-200 text-slate-600"
                )}
              >
                {i === 0 ? "A" : isLast ? "B" : i}
              </span>

              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800 leading-tight">
                  {stop}
                </p>
                {leg && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                    <span className="font-medium text-slate-600">{leg.duration}</span>
                    <span className="text-slate-300">·</span>
                    <span>{leg.distanceKm} km</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
