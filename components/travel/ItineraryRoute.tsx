"use client";

export interface ItineraryLeg {
  from: string;
  to: string;
  duration: string;
  distanceKm: number;
}

export interface ItineraryData {
  success?: boolean;
  travelMode?: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
  wasReordered?: boolean;
  totalDuration?: string;
  totalDistanceKm?: number;
  encodedPolyline?: string | null;
  orderedStops?: string[];
  legs?: ItineraryLeg[];
  error?: string;
  message?: string;
}

const MODE_META: Record<string, { icon: string; label: string }> = {
  DRIVE: { icon: "🚗", label: "Driving" },
  WALK: { icon: "🚶", label: "Walking" },
  BICYCLE: { icon: "🚴", label: "Cycling" },
  TRANSIT: { icon: "🚇", label: "Transit" },
};

export function ItineraryRoute({ data }: { data: ItineraryData }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">{data.message || "Could not optimize itinerary."}</p>
      </div>
    );
  }
  if (!data.orderedStops || !data.legs) return null;

  const mode = MODE_META[data.travelMode || "DRIVE"];

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{mode.icon}</span>
            <h3 className="text-sm font-semibold text-slate-800">
              Optimized day plan
            </h3>
            {data.wasReordered && (
              <span className="text-[10px] uppercase tracking-wide font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                reordered
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-medium">{data.totalDuration} total</span>
            <span className="text-slate-300">·</span>
            <span>{data.totalDistanceKm} km</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <ol className="relative">
          {data.orderedStops.map((stop, i) => {
            const isLast = i === data.orderedStops!.length - 1;
            const leg = i < data.legs!.length ? data.legs![i] : null;
            return (
              <li key={i} className="relative pl-8 pb-4 last:pb-0">
                {/* Vertical line */}
                {!isLast && (
                  <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-indigo-300 to-indigo-200" />
                )}
                {/* Dot */}
                <span
                  className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    i === 0
                      ? "bg-indigo-500 text-white"
                      : isLast
                      ? "bg-amber-500 text-white"
                      : "bg-white border-2 border-indigo-400 text-indigo-600"
                  }`}
                >
                  {i === 0 ? "A" : isLast ? "B" : i}
                </span>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800 leading-tight">
                    {stop}
                  </p>
                  {leg && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                      <span className="font-medium text-slate-600">
                        {leg.duration}
                      </span>
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
    </div>
  );
}
