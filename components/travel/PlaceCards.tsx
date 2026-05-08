"use client";

import { useState } from "react";

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
    <div className="flex items-center gap-1">
      <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1.5l2.6 5.27 5.81.84-4.2 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.2-4.1 5.81-.84L10 1.5z" />
      </svg>
      <span className="text-xs font-semibold text-slate-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-slate-400">({count.toLocaleString()})</span>
    </div>
  );
}

function PlaceCard({ place }: { place: PlaceItem }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const hasPhotos = place.photos.length > 0;

  return (
    <div className="group rounded-2xl overflow-hidden bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {hasPhotos ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={place.photos[photoIdx]}
              alt={place.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {place.photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {place.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === photoIdx ? "bg-white w-4" : "bg-white/60"
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7l3-4h12l3 4M3 7v13a1 1 0 001 1h16a1 1 0 001-1V7M3 7h18" />
            </svg>
          </div>
        )}

        {place.openNow !== null && (
          <div
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur ${
              place.openNow
                ? "bg-emerald-500/90 text-white"
                : "bg-slate-700/80 text-white"
            }`}
          >
            {place.openNow ? "Open now" : "Closed"}
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">
            {place.name}
          </h4>
          {place.price && (
            <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {place.price.symbol}
            </span>
          )}
        </div>

        {place.primaryType && (
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
            {place.primaryType}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {place.rating !== null && (
            <StarRating rating={place.rating} count={place.userRatingCount} />
          )}
        </div>

        {place.summary && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {place.summary}
          </p>
        )}

        {place.hours.length > 0 && (
          <div>
            <button
              onClick={() => setShowHours(!showHours)}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showHours ? "Hide hours" : "Opening hours"}
            </button>
            {showHours && (
              <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                {place.hours.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1.5 border-t border-slate-100">
          {place.mapsUrl && (
            <a
              href={place.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-600 hover:text-indigo-600 font-medium"
            >
              View on Maps →
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-600 hover:text-indigo-600 font-medium"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlaceCards({ data }: { data: PlaceCardsData }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">{data.message || "Could not load places."}</p>
      </div>
    );
  }
  if (!data.places || data.places.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">
          {CATEGORY_LABEL[data.category] || "Places"} in {data.destination}
        </h3>
        <span className="text-[11px] text-slate-400">{data.places.length} found</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.places.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
    </div>
  );
}
