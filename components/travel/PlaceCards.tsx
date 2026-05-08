"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PlaceItem {
  id: string;
  name: string;
  address: string;
  location?: { latitude: number; longitude: number };
  rating: number | null;
  userRatingCount: number;
  price: { symbol: string; label: string } | null;
  openNow: boolean | null;
  hours: string[];
  website: string | null;
  mapsUrl: string | null;
  summary: string | null;
  primaryType: string | null;
  photos: string[];
}

export interface PlaceCardsData {
  success?: boolean;
  destination: string;
  category: string;
  query?: string;
  count?: number;
  places: PlaceItem[];
  error?: string;
  message?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  attractions: "Top attractions",
  restaurants: "Best restaurants",
  hotels: "Stay options",
  cafes: "Cafés worth a stop",
  nightlife: "Nightlife",
  experiences: "Experiences",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Rating: ${rating.toFixed(1)} out of 5, ${count.toLocaleString()} reviews`}
    >
      <svg
        className="w-3.5 h-3.5 text-amber-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 1.5l2.6 5.27 5.81.84-4.2 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.2-4.1 5.81-.84L10 1.5z" />
      </svg>
      <span className="text-xs font-medium text-slate-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-slate-400">({count.toLocaleString()})</span>
    </div>
  );
}

function ProgressiveImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {!loaded && !error && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}

function PlaceCard({ place }: { place: PlaceItem }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const hasPhotos = place.photos.length > 0;

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
      <div className="relative aspect-[4/3]">
        {hasPhotos ? (
          <>
            <ProgressiveImage
              key={place.photos[photoIdx]}
              src={place.photos[photoIdx]}
              alt={place.name}
              className="w-full h-full"
            />
            {place.photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {place.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === photoIdx ? "bg-white w-4" : "bg-white/60 w-1.5 hover:bg-white/80"
                    )}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7l3-4h12l3 4M3 7v13a1 1 0 001 1h16a1 1 0 001-1V7M3 7h18"
              />
            </svg>
          </div>
        )}

        {place.openNow !== null && (
          <div
            className={cn(
              "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium border",
              place.openNow
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-100 border-slate-200 text-slate-600"
            )}
          >
            {place.openNow ? "Open now" : "Closed"}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-slate-800 leading-tight line-clamp-2">
            {place.name}
          </h4>
          {place.price && (
            <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
              {place.price.symbol}
            </span>
          )}
        </div>

        {place.primaryType && (
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            {place.primaryType}
          </p>
        )}

        {place.rating !== null && (
          <StarRating rating={place.rating} count={place.userRatingCount} />
        )}

        {place.summary && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {place.summary}
          </p>
        )}

        {place.hours.length > 0 && (
          <div>
            <button
              onClick={() => setShowHours(!showHours)}
              aria-expanded={showHours}
              aria-controls={`hours-${place.id}`}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showHours ? "Hide hours" : "Opening hours"}
            </button>
            {showHours && (
              <ul
                id={`hours-${place.id}`}
                className="mt-1.5 space-y-0.5 text-xs text-slate-500"
              >
                {place.hours.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          {place.mapsUrl && (
            <a
              href={place.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${place.name} on Google Maps (opens in new tab)`}
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              View on Maps →
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${place.name} website (opens in new tab)`}
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("rounded bg-slate-100 animate-pulse", className)} />;
}

function PlaceCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
      <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <SkeletonBar className="h-4 w-3/4" />
        <SkeletonBar className="h-3 w-1/3" />
        <SkeletonBar className="h-3 w-1/2" />
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-4/5" />
        <div className="pt-2 border-t border-slate-100 flex gap-3">
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function PlaceCardsLoadingSkeleton({ destination }: { destination?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <SkeletonBar className="h-3.5 w-48" />
        {destination && (
          <span className="text-xs text-slate-400">Loading {destination}…</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PlaceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function PlaceCards({ data }: { data: PlaceCardsData }) {
  if (data.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">{data.message || "Could not load places."}</p>
      </div>
    );
  }
  if (!data.places || data.places.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-700">
          {CATEGORY_LABEL[data.category] || "Places"} in {data.destination}
        </h3>
        <span className="text-xs text-slate-400">{data.places.length} found</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.places.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
    </div>
  );
}
