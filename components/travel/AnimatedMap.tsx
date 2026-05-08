"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// setOptions must only be called once per page load; guard against StrictMode
// double-invocation and prop-change re-runs.
let _mapsOptionsSet = false;
function ensureMapsOptions() {
  if (_mapsOptionsSet) return;
  _mapsOptionsSet = true;
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    v: "weekly",
  });
}

interface Coords {
  lat: number;
  lng: number;
}

export interface AnimatedMapProps {
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

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError("Google Maps API key not configured");
      return;
    }

    let animationFrame: number;
    let isMounted = true;

    async function initMap() {
      try {
        ensureMapsOptions();

        const [mapsLib, markerLib] = await Promise.all([
          importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        const { Map, Polyline } = mapsLib;
        const { AdvancedMarkerElement } = markerLib;

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

        const mapId =
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

        const map = new Map(mapRef.current!, {
          center: centerCoords,
          zoom,
          mapId,
          // styles cannot be used alongside mapId — dark styling must be
          // configured in Google Cloud Console for the given mapId instead.
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
        });

        // Helper: create an SVG circle element for AdvancedMarkerElement content
        function makeCircleEl(
          fillColor: string,
          strokeColor: string,
          opacity = 1
        ): SVGSVGElement {
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.setAttribute("width", "24");
          svg.setAttribute("height", "24");
          svg.setAttribute("viewBox", "-12 -12 24 24");
          const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          circle.setAttribute("r", "10");
          circle.setAttribute("fill", fillColor);
          circle.setAttribute("fill-opacity", String(opacity));
          circle.setAttribute("stroke", strokeColor);
          circle.setAttribute("stroke-width", "2");
          svg.appendChild(circle);
          return svg;
        }

        // Origin marker
        new AdvancedMarkerElement({
          position: originCoords,
          map,
          title: origin,
          content: makeCircleEl("#6366f1", "#a5b4fc"),
          zIndex: 10,
        });

        // Destination marker — starts transparent, fills in when route completes
        const destEl = makeCircleEl("#f59e0b", "#fbbf24", 0);
        const destMarker = new AdvancedMarkerElement({
          position: destCoords,
          map,
          title: destination,
          content: destEl,
          zIndex: 10,
        });

        // Moving plane/dot
        function makePlaneEl(bearing = 0): SVGSVGElement {
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.setAttribute("width", "22");
          svg.setAttribute("height", "22");
          svg.setAttribute("viewBox", "-11 -11 22 22");
          svg.style.transformOrigin = "center";
          svg.style.transform = `rotate(${bearing}deg)`;
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          path.setAttribute(
            "d",
            "M 0,-4 C -1,-4 -3,-2 -3,0 L -3,2 0,1 3,2 3,0 C 3,-2 1,-4 0,-4 Z"
          );
          path.setAttribute("fill", "#e0e7ff");
          path.setAttribute("stroke", "#6366f1");
          path.setAttribute("stroke-width", "0.5");
          svg.appendChild(path);
          return svg;
        }

        function makeDotEl(): SVGSVGElement {
          return makeCircleEl("#e0e7ff", "#6366f1");
        }

        const initialBearing = isFlightRoute
          ? calculateBearing(
              pathPoints[0],
              pathPoints[Math.min(5, pathPoints.length - 1)]
            )
          : 0;
        const movingEl = isFlightRoute
          ? makePlaneEl(initialBearing)
          : makeDotEl();

        const movingMarker = new AdvancedMarkerElement({
          position: originCoords,
          map,
          content: movingEl,
          zIndex: 20,
        });

        // Animate the route
        let step = 0;
        const totalSteps = pathPoints.length;
        const totalDurationMs = 2800;
        const fps = 30;
        const msPerFrame = 1000 / fps;
        const stepsPerFrame = Math.max(
          1,
          Math.round(totalSteps / (totalDurationMs / msPerFrame))
        );
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
            movingMarker.position = pos;

            if (isFlightRoute && step < totalSteps) {
              const nextPos = pathPoints[Math.min(step, totalSteps - 1)];
              (movingEl as SVGSVGElement).style.transform = `rotate(${calculateBearing(pos, nextPos)}deg)`;
            }
          }

          if (step < totalSteps) {
            animationFrame = requestAnimationFrame(animate);
          } else {
            // Reveal destination marker
            const circle = destEl.querySelector("circle");
            if (circle) circle.setAttribute("fill-opacity", "1");
            void destMarker; // keep reference alive
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
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <div className="relative">
        <div ref={mapRef} className="w-full h-72 md:h-96" />

        <div className="absolute top-3 inset-x-0 flex justify-between px-3 pointer-events-none">
          <div className="bg-white border border-slate-200 rounded-full px-2.5 py-1">
            <span className="text-xs font-medium text-slate-700">
              {origin.split(",")[0]}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-full px-2.5 py-1">
            <span className="text-xs font-medium text-slate-700">
              {destination.split(",")[0]}
            </span>
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-[1.5px] border-slate-300 border-t-indigo-500 animate-spin" />
              <span className="text-slate-500 text-sm">Loading map…</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-600">
        <span className="font-medium text-slate-700">
          {isFlightRoute ? "Flight" : "Transit"}
        </span>
        <span className="text-slate-300">·</span>
        <span>{distance}</span>
        <span className="text-slate-300">·</span>
        <span>{duration}</span>
      </div>
    </div>
  );
}
