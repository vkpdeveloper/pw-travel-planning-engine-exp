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
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          {data.message || "Aerial view unavailable for this location."}
        </p>
      </div>
    );
  }

  if (!data.videoUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="w-4 h-4 rounded-full border-[1.5px] border-slate-300 border-t-indigo-500 animate-spin shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-slate-700">
            Rendering aerial view…
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
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
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <div className="relative aspect-video bg-slate-100">
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
            className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
            aria-label="Play aerial view"
          >
            <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200">
              <svg className="w-5 h-5 text-slate-700 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3l12 7-12 7V3z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {data.address && (
        <div className="px-4 py-2 border-t border-slate-100">
          <p className="text-xs text-slate-600 truncate">{data.address}</p>
        </div>
      )}
    </div>
  );
}
