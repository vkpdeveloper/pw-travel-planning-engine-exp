"use client";

import { useRef, useState } from "react";

export interface AerialVideoData {
  success?: boolean;
  address?: string;
  state?: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  error?: string;
  message?: string;
}

export function AerialVideo({ data }: { data: AerialVideoData }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (data.error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          {data.message || "Aerial view unavailable for this location."}
        </p>
      </div>
    );
  }

  // Render-pending state
  if (!data.videoUrl) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <div>
          <p className="text-sm font-medium text-slate-700">
            Rendering cinematic aerial view...
          </p>
          <p className="text-xs text-slate-500">
            {data.address} · this can take a minute the first time
          </p>
        </div>
      </div>
    );
  }

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={data.videoUrl}
          poster={data.thumbnailUrl || undefined}
          loop
          muted
          playsInline
          controls={isPlaying}
          className="w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {!isPlaying && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center group bg-black/20 hover:bg-black/30 transition-colors"
            aria-label="Play aerial view"
          >
            <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-slate-900 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3l12 7-12 7V3z" />
              </svg>
            </span>
          </button>
        )}

        {/* Top label */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
            3D Aerial
          </span>
        </div>

        {/* Bottom label */}
        {data.address && (
          <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-1 -mx-3 -mb-3 px-3 pointer-events-none">
            <p className="text-sm font-medium text-white truncate">
              {data.address}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
