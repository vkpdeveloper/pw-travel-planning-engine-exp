"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface Coords {
  lat: number;
  lng: number;
}

interface AnimatedMapProps {
  originCoords: Coords;
  destCoords: Coords;
  centerCoords: Coords;
  encodedPolyline: string | null;
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  isFlightRoute: boolean;
}

// Decode Google Maps encoded polyline
function decodePolyline(encoded: string): Coords[] {
  const points: Coords[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Generate a great-circle path for flight routes
function greatCirclePath(from: Coords, to: Coords, steps = 80): Coords[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lng);
  const lat2 = toRad(to.lat);
  const lon2 = toRad(to.lng);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );

  if (d === 0) return [from, to];

  const points: Coords[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push({
      lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
      lng: toDeg(Math.atan2(y, x)),
    });
  }
  return points;
}

function calculateBearing(from: Coords, to: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(to.lng - from.lng);
  const y = Math.sin(dLon) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b9db5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e3a5f" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#243b6e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0c1929" }],
  },
];

export function AnimatedMap({
  originCoords,
  destCoords,
  centerCoords,
  encodedPolyline,
  origin,
  destination,
  distance,
  duration,
  isFlightRoute,
}: AnimatedMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    let animationFrame: number;
    let isMounted = true;

    async function initMap() {
      try {
        setOptions({ key: apiKey!, v: "weekly" });

        const { Map, Marker, Polyline, SymbolPath } = (await importLibrary(
          "maps"
        )) as google.maps.MapsLibrary & { Marker: typeof google.maps.Marker };

        if (!isMounted || !mapRef.current) return;

        const latDiff = Math.abs(destCoords.lat - originCoords.lat);
        const lngDiff = Math.abs(destCoords.lng - originCoords.lng);
        const maxDiff = Math.max(latDiff, lngDiff);
        let zoom = 10;
        if (maxDiff > 100) zoom = 2;
        else if (maxDiff > 50) zoom = 3;
        else if (maxDiff > 20) zoom = 4;
        else if (maxDiff > 10) zoom = 5;
        else if (maxDiff > 5) zoom = 6;
        else if (maxDiff > 2) zoom = 7;
        else zoom = 9;

        const map = new Map(mapRef.current!, {
          center: centerCoords,
          zoom,
          styles: DARK_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          gestureHandling: "cooperative",
        });

        const pathPoints =
          encodedPolyline && !isFlightRoute
            ? decodePolyline(encodedPolyline)
            : greatCirclePath(originCoords, destCoords);

        // Ghost line
        new Polyline({
          path: pathPoints,
          geodesic: !isFlightRoute,
          strokeColor: "#334155",
          strokeOpacity: 0.4,
          strokeWeight: 2,
          map,
        });

        // Animated route line
        const animatedLine = new Polyline({
          path: [],
          geodesic: !isFlightRoute,
          strokeColor: "#6366f1",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          map,
          icons: isFlightRoute
            ? [
                {
                  icon: {
                    path: SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: "#818cf8",
                    strokeWeight: 2,
                    fillColor: "#818cf8",
                    fillOpacity: 1,
                  },
                  offset: "100%",
                },
              ]
            : undefined,
        });

        // Origin marker
        new Marker({
          position: originCoords,
          map,
          title: origin,
          icon: {
            path: SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#6366f1",
            fillOpacity: 1,
            strokeColor: "#a5b4fc",
            strokeWeight: 2,
          },
          zIndex: 10,
        });

        // Destination marker
        const destMarkerIcon = {
          path: SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#f59e0b",
          fillOpacity: 0,
          strokeColor: "#fbbf24",
          strokeWeight: 2,
        };

        const destMarker = new Marker({
          position: destCoords,
          map,
          title: destination,
          icon: { ...destMarkerIcon },
          zIndex: 10,
        });

        // Moving plane/dot
        const movingMarker = new Marker({
          position: originCoords,
          map,
          icon: {
            path: isFlightRoute
              ? "M 0,-4 C -1,-4 -3,-2 -3,0 L -3,2 0,1 3,2 3,0 C 3,-2 1,-4 0,-4 Z"
              : SymbolPath.CIRCLE,
            scale: isFlightRoute ? 2.5 : 7,
            fillColor: "#e0e7ff",
            fillOpacity: 1,
            strokeColor: "#6366f1",
            strokeWeight: 2,
            rotation: isFlightRoute
              ? calculateBearing(
                  pathPoints[0],
                  pathPoints[Math.min(5, pathPoints.length - 1)]
                )
              : 0,
          },
          zIndex: 20,
        });

        // Animate the route
        let step = 0;
        const totalSteps = pathPoints.length;
        const totalDurationMs = 2800;
        const fps = 30;
        const msPerFrame = 1000 / fps;
        const stepsPerFrame = Math.max(1, Math.round(totalSteps / (totalDurationMs / msPerFrame)));
        let lastTime = 0;

        function animate(timestamp: number) {
          if (!isMounted) return;
          if (timestamp - lastTime < msPerFrame) {
            animationFrame = requestAnimationFrame(animate);
            return;
          }
          lastTime = timestamp;
          step = Math.min(step + stepsPerFrame, totalSteps);

          animatedLine.setPath(pathPoints.slice(0, step));

          if (step > 0) {
            const pos = pathPoints[step - 1];
            movingMarker.setPosition(pos);

            if (isFlightRoute && step < totalSteps) {
              const nextPos = pathPoints[Math.min(step, totalSteps - 1)];
              const icon = movingMarker.getIcon() as google.maps.Symbol;
              icon.rotation = calculateBearing(pos, nextPos);
              movingMarker.setIcon(icon);
            }
          }

          if (step < totalSteps) {
            animationFrame = requestAnimationFrame(animate);
          } else {
            destMarker.setIcon({
              ...destMarkerIcon,
              fillOpacity: 1,
            });
          }
        }

        setTimeout(() => {
          if (isMounted) {
            animationFrame = requestAnimationFrame(animate);
            setLoaded(true);
          }
        }, 400);
      } catch (err) {
        console.error("Maps load error:", err);
        if (isMounted) setError("Failed to load Google Maps");
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [originCoords, destCoords, centerCoords, encodedPolyline, isFlightRoute, origin, destination]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div ref={mapRef} className="w-full h-72 md:h-96" />

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-900/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />

      {/* Route info bar */}
      <div className="absolute bottom-0 inset-x-0 p-4 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-full px-3 py-1.5">
          <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wide">
            {isFlightRoute ? "✈ Flight" : "🚌 Transit"}
          </span>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
          <span className="text-white/80 text-xs font-medium">{distance}</span>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
          <span className="text-white/80 text-xs font-medium">{duration}</span>
        </div>
      </div>

      {/* Source / destination labels */}
      <div className="absolute top-3 inset-x-0 flex justify-between px-4 pointer-events-none">
        <div className="bg-indigo-500/25 backdrop-blur-sm border border-indigo-400/30 rounded-full px-3 py-1">
          <span className="text-indigo-200 text-xs font-medium">📍 {origin.split(",")[0]}</span>
        </div>
        <div className="bg-amber-500/25 backdrop-blur-sm border border-amber-400/30 rounded-full px-3 py-1">
          <span className="text-amber-200 text-xs font-medium">🏁 {destination.split(",")[0]}</span>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-2xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span className="text-white/60 text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
