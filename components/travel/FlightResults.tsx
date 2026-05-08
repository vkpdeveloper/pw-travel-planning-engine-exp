"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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

function AirlineLogo({ iata, name }: { iata: string; name: string }) {
  const [src, setSrc] = useState(
    iata ? `https://www.gstatic.com/flights/airline_logos/70px/${iata}.png` : null
  );
  const [fallback1Used, setFallback1Used] = useState(false);

  if (!src || !iata) {
    return (
      <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
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
      className="w-8 h-8 object-contain rounded-md bg-white border border-slate-200 p-0.5"
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

function FlightCard({ flight }: { flight: Flight }) {
  const [expanded, setExpanded] = useState(false);
  const hasSegments = flight.segments && flight.segments.length > 0;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => hasSegments && setExpanded((v) => !v)}
      role={hasSegments ? "button" : undefined}
      tabIndex={hasSegments ? 0 : undefined}
      aria-expanded={hasSegments ? expanded : undefined}
      aria-label={`${flight.carrier.name} flight from ${flight.departure.iata} to ${flight.arrival.iata}, ${flight.price.formatted}, ${flight.stops === 0 ? "nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}`}
      onKeyDown={(e) => {
        if (hasSegments && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <AirlineLogo iata={flight.carrier.iata} name={flight.carrier.name} />

        <div className="flex items-center flex-1 min-w-0 gap-2">
          <div className="text-center shrink-0 min-w-[48px]">
            <div className="text-base font-semibold text-slate-800 tabular-nums leading-none">
              {formatTime(flight.departure.time)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">
              {flight.departure.iata}
            </div>
          </div>

          <div className="flex flex-col items-center flex-1 px-1">
            <span className="text-[10px] text-slate-400">{flight.duration}</span>
            <div className="w-full h-px bg-slate-200 my-1" />
            <span className="text-[10px] text-slate-500">
              {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="text-center shrink-0 min-w-[48px]">
            <div className="text-base font-semibold text-slate-800 tabular-nums leading-none">
              {formatTime(flight.arrival.time)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">
              {flight.arrival.iata}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-sm font-semibold text-slate-800">
            {flight.price.formatted}
          </div>
          <div className="text-[10px] text-slate-400">{flight.cabinClass}</div>
        </div>
      </div>

      {expanded && hasSegments && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          {flight.segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                {seg.flightNumber}
              </span>
              <span>{seg.origin}</span>
              <span className="text-slate-300">→</span>
              <span>{seg.destination}</span>
              <span className="text-slate-400 ml-auto">
                {formatTime(seg.departure)} → {formatTime(seg.arrival)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("rounded bg-slate-100 animate-pulse", className)} />;
}

function FlightCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <SkeletonBar className="w-8 h-8 rounded-md" />
        <div className="flex items-center flex-1 gap-2">
          <div className="space-y-1 min-w-[48px]">
            <SkeletonBar className="h-4 w-12" />
            <SkeletonBar className="h-2.5 w-8" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 px-2">
            <SkeletonBar className="h-2 w-12" />
            <SkeletonBar className="h-px w-full" />
            <SkeletonBar className="h-2 w-10" />
          </div>
          <div className="space-y-1 min-w-[48px]">
            <SkeletonBar className="h-4 w-12" />
            <SkeletonBar className="h-2.5 w-8" />
          </div>
        </div>
        <div className="space-y-1">
          <SkeletonBar className="h-4 w-14" />
          <SkeletonBar className="h-2 w-10" />
        </div>
      </div>
    </div>
  );
}

export function FlightLoadingSkeleton({ from, to }: { from?: string; to?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-3.5 w-32" />
        {from && to && (
          <span className="text-[11px] text-slate-400">
            Searching {from} → {to}…
          </span>
        )}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <FlightCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FlightResults({ data }: { data: FlightResultsData }) {
  if (data.error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Flight search notice</p>
        <p className="text-sm text-amber-700 mt-1">{data.message}</p>
      </div>
    );
  }

  if (!data.flights || data.flights.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-500">No flights found for this route.</p>
      </div>
    );
  }

  const params = data.searchParams!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">
            <span>{params.from}</span>
            <span className="text-slate-400 mx-1.5">→</span>
            <span>{params.to}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(params.date)} ·{" "}
            {params.passengers.adults + params.passengers.children} pax ·{" "}
            {params.cabinClass}
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {data.totalResults} result{(data.totalResults || 0) > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {data.flights.map((flight, i) => (
          <FlightCard key={flight.id || i} flight={flight} />
        ))}
      </div>
    </div>
  );
}
