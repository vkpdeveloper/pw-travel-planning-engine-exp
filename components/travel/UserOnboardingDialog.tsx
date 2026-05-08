"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const USER_PROFILE_KEY = "travelmind_user_profile";

export interface UserProfile {
  name: string;
  location: {
    displayName: string;
    lat?: number;
    lng?: number;
  };
}

interface LocationResult {
  displayName: string;
  fullAddress?: string;
  lat: number;
  lng: number;
}

type LocationMethod = "none" | "auto" | "manual";

interface UserOnboardingDialogProps {
  onComplete: (profile: UserProfile) => void;
}

export function UserOnboardingDialog({ onComplete }: UserOnboardingDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"name" | "location">("name");

  // Name step
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  // Location step
  const [locationMethod, setLocationMethod] = useState<LocationMethod>("none");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [geoError, setGeoError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);

  // Manual search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // On mount, check localStorage
  useEffect(() => {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (stored) {
      try {
        const profile = JSON.parse(stored) as UserProfile;
        onComplete(profile);
      } catch {
        localStorage.removeItem(USER_PROFILE_KEY);
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, [onComplete]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Geolocation ---
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    setGeoError("");
    setSelectedLocation(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const res = await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "reverse", lat, lng }),
          });
          if (!res.ok) throw new Error("Geocoding failed");
          const data = (await res.json()) as { displayName: string; lat: number; lng: number };
          setSelectedLocation({ displayName: data.displayName, lat: data.lat, lng: data.lng });
          setGeoStatus("success");
        } catch {
          setGeoError("Could not determine your location name. Please search manually.");
          setGeoStatus("error");
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location access was denied. Please search manually.",
          2: "Location could not be determined. Please search manually.",
          3: "Location request timed out. Please search manually.",
        };
        setGeoError(messages[err.code] || "Location detection failed. Please search manually.");
        setGeoStatus("error");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // --- Places search ---
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedLocation(null);
    setShowResults(false);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "search", query }),
        });
        const data = (await res.json()) as { results: LocationResult[] };
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const handleSelectLocation = useCallback((result: LocationResult) => {
    setSelectedLocation(result);
    setSearchQuery(result.displayName);
    setShowResults(false);
    setSearchResults([]);
  }, []);

  // --- Form submission ---
  const handleNameNext = () => {
    if (!name.trim()) {
      setNameError("Please enter your name.");
      return;
    }
    setNameError("");
    setStep("location");
  };

  const handleFinish = () => {
    if (!selectedLocation) return;

    const profile: UserProfile = {
      name: name.trim(),
      location: {
        displayName: selectedLocation.displayName,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      },
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    setOpen(false);
    onComplete(profile);
  };

  const handleSkipLocation = () => {
    const profile: UserProfile = {
      name: name.trim(),
      location: { displayName: "Not specified" },
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    setOpen(false);
    onComplete(profile);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-[440px]">
        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-1">
          <div className="h-1 flex-1 rounded-full bg-indigo-500" />
          <div
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              step === "location" ? "bg-indigo-500" : "bg-slate-200"
            )}
          />
        </div>

        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-800">
            {step === "name" ? "Welcome to TravelMind ✈️" : "Where are you based?"}
          </DialogTitle>
          <DialogDescription>
            {step === "name"
              ? "Tell us a bit about yourself so we can personalize your experience."
              : "This helps the AI suggest flights from your nearest airports."}
          </DialogDescription>
        </DialogHeader>

        {/* --- Step 1: Name --- */}
        {step === "name" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Your name</Label>
              <input
                id="user-name"
                type="text"
                autoFocus
                autoComplete="given-name"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                className={cn(
                  "w-full rounded-2xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition-all",
                  "bg-white placeholder:text-slate-400",
                  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                  nameError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-slate-200"
                )}
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>
            <Button onClick={handleNameNext} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl h-10">
              Continue
            </Button>
          </div>
        )}

        {/* --- Step 2: Location --- */}
        {step === "location" && (
          <div className="space-y-4">
            {/* Auto-detect button */}
            <div className="space-y-2">
              <Label>Auto-detect location</Label>
              <button
                onClick={() => {
                  setLocationMethod("auto");
                  handleDetectLocation();
                }}
                disabled={geoStatus === "loading"}
                className={cn(
                  "w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
                  "hover:border-indigo-300 hover:bg-indigo-50/50",
                  geoStatus === "success" && selectedLocation
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white",
                  geoStatus === "loading" && "opacity-60 cursor-wait"
                )}
              >
                {geoStatus === "loading" ? (
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                ) : geoStatus === "success" && selectedLocation ? (
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <span className={cn(
                  "flex-1 text-left",
                  geoStatus === "success" && selectedLocation ? "text-emerald-700 font-medium" : "text-slate-600"
                )}>
                  {geoStatus === "loading"
                    ? "Detecting your location..."
                    : geoStatus === "success" && selectedLocation
                    ? selectedLocation.displayName
                    : "Use my current location"}
                </span>
                {geoStatus === "success" && selectedLocation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLocation(null);
                      setGeoStatus("idle");
                      setLocationMethod("none");
                    }}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                    aria-label="Clear location"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </button>
              {geoStatus === "error" && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {geoError}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">or search manually</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Manual search */}
            <div className="space-y-2" ref={searchContainerRef}>
              <Label htmlFor="location-search">Search for your city</Label>
              <div className="relative">
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="location-search"
                    type="text"
                    placeholder="e.g. Mumbai, New York, London..."
                    value={searchQuery}
                    onChange={(e) => {
                      setLocationMethod("manual");
                      handleSearchChange(e);
                    }}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-2.5 pl-10 text-sm text-slate-800 outline-none transition-all",
                      "bg-white placeholder:text-slate-400",
                      "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                      selectedLocation && locationMethod === "manual"
                        ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100"
                        : "border-slate-200"
                    )}
                  />
                  {searchLoading && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  )}
                </div>

                {/* Dropdown results */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 z-10 overflow-hidden">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSelectLocation(result);
                          setLocationMethod("manual");
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-indigo-50/60 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <svg className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-slate-800">{result.displayName}</p>
                          {result.fullAddress && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{result.fullAddress}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedLocation && locationMethod === "manual" && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {selectedLocation.displayName} selected
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleFinish}
                disabled={!selectedLocation}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl h-10 disabled:opacity-50"
              >
                Get started
              </Button>
              <button
                onClick={handleSkipLocation}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
