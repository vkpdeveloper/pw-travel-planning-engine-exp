"use client";

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

function StopsIndicator({ stops }: { stops: number }) {
  if (stops === 0) {
    return (
      <div className="flex flex-col items-center gap-1 flex-1 px-4">
        <div className="flex items-center gap-1 w-full">
          <div className="h-px flex-1 bg-indigo-400/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <div className="h-px flex-1 bg-indigo-400/40" />
        </div>
        <span className="text-[10px] text-green-400 font-medium">Nonstop</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 flex-1 px-4">
      <div className="flex items-center gap-1 w-full">
        <div className="h-px flex-1 bg-orange-400/40" />
        {Array.from({ length: stops }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <div className="h-px flex-1 bg-orange-400/40" />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-orange-400 font-medium">
        {stops} stop{stops > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function FlightCard({ flight, index }: { flight: Flight; index: number }) {
  return (
    <div
      className="group relative rounded-xl border border-white/8 bg-white/4 hover:bg-white/7 hover:border-indigo-400/30 transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />

      <div className="relative p-4">
        <div className="flex items-center gap-4">
          {/* Airline */}
          <div className="flex flex-col items-center gap-1 w-20 shrink-0">
            {flight.carrier.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flight.carrier.imageUrl}
                alt={flight.carrier.name}
                className="w-8 h-8 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-400/20">
                <span className="text-xs font-bold text-indigo-300">
                  {flight.carrier.iata || flight.carrier.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-[10px] text-white/50 text-center leading-tight line-clamp-2">
              {flight.carrier.name}
            </span>
          </div>

          {/* Route */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Departure */}
            <div className="text-center shrink-0">
              <div className="text-xl font-bold text-white tabular-nums">
                {formatTime(flight.departure.time)}
              </div>
              <div className="text-xs text-indigo-300 font-semibold mt-0.5">
                {flight.departure.iata}
              </div>
            </div>

            {/* Path + Duration */}
            <div className="flex flex-col items-center flex-1 px-2">
              <span className="text-[10px] text-white/40 mb-1">{flight.duration}</span>
              <StopsIndicator stops={flight.stops} />
            </div>

            {/* Arrival */}
            <div className="text-center shrink-0">
              <div className="text-xl font-bold text-white tabular-nums">
                {formatTime(flight.arrival.time)}
              </div>
              <div className="text-xs text-amber-300 font-semibold mt-0.5">
                {flight.arrival.iata}
              </div>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {flight.price.formatted}
              </div>
              <div className="text-[10px] text-white/40">{flight.cabinClass}</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-indigo-200 text-xs font-medium transition-all duration-150 whitespace-nowrap">
              Select →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlightResults({ data }: { data: FlightResultsData }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-orange-400 text-lg">⚠️</span>
          <div>
            <p className="text-orange-300 text-sm font-medium">Flight Search Notice</p>
            <p className="text-white/60 text-sm mt-1">{data.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data.flights || data.flights.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <p className="text-white/50 text-sm text-center">No flights found for this route.</p>
      </div>
    );
  }

  const params = data.searchParams!;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">
            ✈ {params.from} → {params.to}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            {formatDate(params.date)} ·{" "}
            {params.passengers.adults + params.passengers.children} passenger
            {params.passengers.adults + params.passengers.children > 1 ? "s" : ""} ·{" "}
            {params.cabinClass}
          </p>
        </div>
        <div className="text-right">
          <span className="text-white/40 text-xs">
            {data.totalResults} result{(data.totalResults || 0) > 1 ? "s" : ""}
          </span>
          {data.flights.length < (data.totalResults || 0) && (
            <p className="text-white/30 text-[10px]">showing top {data.flights.length}</p>
          )}
        </div>
      </div>

      {/* Flight cards */}
      <div className="space-y-2">
        {data.flights.map((flight, i) => (
          <FlightCard key={flight.id || i} flight={flight} index={i} />
        ))}
      </div>
    </div>
  );
}
