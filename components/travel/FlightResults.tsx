"use client";

import { motion } from "motion/react";
import { useState } from "react";

interface FlightSegment {
  flightNumber: string;
  departure: string;
  arrival: string;
  origin: string;
  destination: string;
}

interface Flight {
  id: string;
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  carrier: {
    name: string;
    iata: string;
    imageUrl: string | null;
  };
  departure: {
    time: string;
    airport: string;
    iata: string;
  };
  arrival: {
    time: string;
    airport: string;
    iata: string;
  };
  duration: string;
  stops: number;
  segments: FlightSegment[];
  cabinClass: string;
}

interface FlightSearchParams {
  from: string;
  to: string;
  date: string;
  passengers: { adults: number; children: number; infants: number };
  cabinClass: string;
  currency: string;
}

interface FlightResultsData {
  success?: boolean;
  error?: string;
  message?: string;
  searchParams?: FlightSearchParams;
  totalResults?: number;
  flights?: Flight[];
  departureIata?: string;
  arrivalIata?: string;
  departureDate?: string;
}

function formatTime(isoString: string): string {
  if (!isoString) return "--:--";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Airline logo with Google Flights CDN fallback to Kiwi, then to IATA badge
function AirlineLogo({ iata, name }: { iata: string; name: string }) {
  const [src, setSrc] = useState(
    iata ? `https://www.gstatic.com/flights/airline_logos/70px/${iata}.png` : null
  );
  const [fallback1Used, setFallback1Used] = useState(false);

  if (!src || !iata) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-400/20">
        <span className="text-xs font-bold text-indigo-300 tabular-nums">
          {(iata || name).slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="w-9 h-9 object-contain rounded-lg bg-white p-1"
      onError={() => {
        if (!fallback1Used && iata) {
          setFallback1Used(true);
          setSrc(`https://images.kiwi.com/airlines/64/${iata}.png`);
        } else {
          setSrc(null);
        }
      }}
    />
  );
}

function StopsIndicator({ stops }: { stops: number }) {
  if (stops === 0) {
    return (
      <div className="flex flex-col items-center gap-1 flex-1 px-3">
        <div className="flex items-center gap-1 w-full">
          <div className="h-px flex-1 bg-emerald-400/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <div className="h-px flex-1 bg-emerald-400/40" />
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold tracking-wide">Nonstop</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 flex-1 px-3">
      <div className="flex items-center gap-1 w-full">
        <div className="h-px flex-1 bg-orange-400/40" />
        {Array.from({ length: stops }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            {i < stops - 1 && <div className="h-px w-4 bg-orange-400/40" />}
          </div>
        ))}
        <div className="h-px flex-1 bg-orange-400/40" />
      </div>
      <span className="text-[10px] text-orange-400 font-semibold tracking-wide">
        {stops} stop{stops > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function FlightCard({ flight, index }: { flight: Flight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-indigo-400/25 transition-colors duration-200 overflow-hidden cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Ambient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-purple-600/0 group-hover:from-indigo-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none rounded-2xl" />

      {/* Dashed ticket perforation line */}
      <div className="absolute left-[4.5rem] top-0 bottom-0 border-l border-dashed border-white/8 pointer-events-none" />

      <div className="relative px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Airline logo column */}
          <div className="flex flex-col items-center gap-1.5 w-14 shrink-0">
            <AirlineLogo iata={flight.carrier.iata} name={flight.carrier.name} />
            <span className="text-[9px] text-white/40 text-center leading-tight line-clamp-2 w-full">
              {flight.carrier.iata || flight.carrier.name.slice(0, 6)}
            </span>
          </div>

          {/* Route */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Departure */}
            <div className="text-center shrink-0 min-w-[52px]">
              <div className="text-2xl font-bold text-white tabular-nums leading-none tracking-tight">
                {formatTime(flight.departure.time)}
              </div>
              <div className="text-[11px] text-indigo-300 font-bold mt-1 tracking-widest">
                {flight.departure.iata}
              </div>
              <div className="text-[9px] text-white/35 mt-0.5 leading-tight line-clamp-1 max-w-[56px]">
                {flight.departure.airport}
              </div>
            </div>

            {/* Path */}
            <div className="flex flex-col items-center flex-1 px-1">
              <span className="text-[10px] text-white/35 mb-1 font-medium">{flight.duration}</span>
              <StopsIndicator stops={flight.stops} />
            </div>

            {/* Arrival */}
            <div className="text-center shrink-0 min-w-[52px]">
              <div className="text-2xl font-bold text-white tabular-nums leading-none tracking-tight">
                {formatTime(flight.arrival.time)}
              </div>
              <div className="text-[11px] text-amber-300 font-bold mt-1 tracking-widest">
                {flight.arrival.iata}
              </div>
              <div className="text-[9px] text-white/35 mt-0.5 leading-tight line-clamp-1 max-w-[56px]">
                {flight.arrival.airport}
              </div>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex flex-col items-end gap-2 shrink-0 pl-2 border-l border-white/8">
            <div className="text-right">
              <div className="text-lg font-bold text-white leading-none">
                {flight.price.formatted}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">{flight.cabinClass}</div>
            </div>
            <button
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 active:scale-95 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold transition-all duration-150 whitespace-nowrap"
            >
              Select
            </button>
          </div>
        </div>

        {/* Expanded segment details */}
        {expanded && flight.segments && flight.segments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 pt-3 border-t border-white/8 space-y-1.5 overflow-hidden"
          >
            {flight.segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="font-mono text-white/40 bg-white/8 px-1.5 py-0.5 rounded text-[10px]">
                  {seg.flightNumber}
                </span>
                <span>{seg.origin}</span>
                <span className="text-white/25">→</span>
                <span>{seg.destination}</span>
                <span className="text-white/30 ml-auto">
                  {formatTime(seg.departure)} → {formatTime(seg.arrival)}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Expand hint */}
        {flight.segments && flight.segments.length > 0 && (
          <div className="mt-2 flex justify-center">
            <span className="text-[9px] text-white/20 group-hover:text-white/35 transition-colors">
              {expanded ? "▲ hide segments" : "▼ show segments"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Skeleton card for loading state ─────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-white/8 animate-pulse ${className ?? ""}`}
    />
  );
}

function FlightCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="relative rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmerSweep_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      <div className="absolute left-[4.5rem] top-0 bottom-0 border-l border-dashed border-white/6 pointer-events-none" />

      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Logo */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-1.5">
          <SkeletonPulse className="w-9 h-9 rounded-xl" />
          <SkeletonPulse className="w-10 h-2" />
        </div>

        {/* Route */}
        <div className="flex items-center flex-1 gap-2">
          <div className="space-y-1.5 min-w-[52px]">
            <SkeletonPulse className="w-12 h-6" />
            <SkeletonPulse className="w-8 h-3" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
            <SkeletonPulse className="w-12 h-2" />
            <SkeletonPulse className="w-full h-1" />
            <SkeletonPulse className="w-10 h-2" />
          </div>
          <div className="space-y-1.5 min-w-[52px]">
            <SkeletonPulse className="w-12 h-6" />
            <SkeletonPulse className="w-8 h-3" />
          </div>
        </div>

        {/* Price */}
        <div className="shrink-0 pl-2 border-l border-white/6 space-y-2">
          <SkeletonPulse className="w-16 h-5" />
          <SkeletonPulse className="w-14 h-6 rounded-xl" />
        </div>
      </div>
    </motion.div>
  );
}

export function FlightLoadingSkeleton({ from, to }: { from?: string; to?: string }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">✈</span>
            <SkeletonPulse className="w-32 h-4" />
          </div>
          <SkeletonPulse className="w-48 h-3" />
        </div>
        {from && to && (
          <div className="text-right text-xs text-white/30">
            Searching {from} → {to}…
          </div>
        )}
      </div>
      {/* 5 skeleton cards */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <FlightCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FlightResults({ data }: { data: FlightResultsData }) {
  if (data.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <span className="text-orange-400 text-lg">⚠</span>
          <div>
            <p className="text-orange-300 text-sm font-semibold">Flight Search Notice</p>
            <p className="text-white/55 text-sm mt-1">{data.message}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data.flights || data.flights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/3 p-5 text-center"
      >
        <p className="text-white/40 text-sm">No flights found for this route.</p>
      </motion.div>
    );
  }

  const params = data.searchParams!;

  return (
    <div className="space-y-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
            <span className="text-base">✈</span>
            <span className="tracking-wide">{params.from}</span>
            <span className="text-white/30 text-xs">→</span>
            <span className="tracking-wide">{params.to}</span>
          </h3>
          <p className="text-white/35 text-xs mt-0.5">
            {formatDate(params.date)} ·{" "}
            {params.passengers.adults + params.passengers.children} pax ·{" "}
            {params.cabinClass}
          </p>
        </div>
        <div className="text-right">
          <span className="text-white/35 text-xs">
            {data.totalResults} result{(data.totalResults || 0) > 1 ? "s" : ""}
          </span>
          {data.flights.length < (data.totalResults || 0) && (
            <p className="text-white/25 text-[10px]">showing top {data.flights.length}</p>
          )}
        </div>
      </motion.div>

      {/* Flight cards */}
      <div className="space-y-2">
        {data.flights.map((flight, i) => (
          <FlightCard key={flight.id || i} flight={flight} index={i} />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: data.flights.length * 0.07 + 0.2 }}
        className="text-center text-[10px] text-white/20"
      >
        Click a flight to expand segments · Prices may vary
      </motion.p>
    </div>
  );
}
