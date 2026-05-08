"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Minimal SpeechRecognition types for browsers
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
declare const SpeechRecognition: new () => SpeechRecognitionInstance;
declare const webkitSpeechRecognition: new () => SpeechRecognitionInstance;

const LABELS: Record<VoiceState, string> = {
  idle: "Hold to speak",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Speaking…",
  error: "Error — try again",
};

export function VoiceButton({ onTranscript, disabled, className }: VoiceButtonProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      recognitionRef.current?.stop();
      currentSourceRef.current?.stop();
    };
  }, []);

  // Get or create AudioContext
  function getAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  // Play WAV buffer (base64)
  async function playAudio(base64Wav: string) {
    const binary = atob(base64Wav);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSourceRef.current = source;

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start(0);
    });
  }

  // Stop any playing audio
  function stopAudio() {
    try {
      currentSourceRef.current?.stop();
    } catch {
      // already stopped
    }
    currentSourceRef.current = null;
  }

  // Build and return a SpeechRecognition instance
  function buildRecognition(): SpeechRecognitionInstance | null {
    const SR =
      typeof SpeechRecognition !== "undefined"
        ? SpeechRecognition
        : typeof webkitSpeechRecognition !== "undefined"
        ? webkitSpeechRecognition
        : null;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    return rec;
  }

  const handleVoiceClick = useCallback(async () => {
    if (state === "speaking") {
      // Interrupt playback
      stopAudio();
      setState("idle");
      return;
    }

    if (state !== "idle" && state !== "error") return;

    const rec = buildRecognition();
    if (!rec) {
      setState("error");
      return;
    }

    recognitionRef.current = rec;
    setState("listening");
    setTranscript("");

    let finalText = "";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      finalText = e.results[e.results.length - 1][0].transcript.trim();
      setTranscript(finalText);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error("[voice] SpeechRecognition error:", e.error);
      if (isMounted.current) setState("error");
    };

    rec.onend = async () => {
      if (!isMounted.current) return;

      if (!finalText) {
        setState("idle");
        return;
      }

      // Surface transcript to parent so it shows in chat
      onTranscript?.(finalText);

      setState("processing");

      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: finalText }),
        });

        const data = (await res.json()) as {
          audio?: string;
          mimeType?: string;
          transcript?: string;
          error?: string;
        };

        if (!isMounted.current) return;

        if (data.error || !data.audio) {
          console.error("[voice] API error:", data.error);
          setState("error");
          return;
        }

        setState("speaking");
        await playAudio(data.audio);
        if (isMounted.current) setState("idle");
      } catch (err) {
        console.error("[voice] fetch error:", err);
        if (isMounted.current) setState("error");
      }
    };

    rec.start();
  }, [state, onTranscript]);

  const isActive = state !== "idle" && state !== "error";

  const ringColor =
    state === "listening"
      ? "ring-red-400"
      : state === "speaking"
      ? "ring-emerald-400"
      : state === "processing"
      ? "ring-amber-400"
      : "ring-transparent";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleVoiceClick}
        disabled={disabled || state === "processing"}
        title={LABELS[state]}
        aria-label={LABELS[state]}
        className={cn(
          "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
          "ring-2 ring-offset-2 ring-offset-white",
          ringColor,
          state === "listening" && "bg-red-50 hover:bg-red-100 shadow-lg shadow-red-200",
          state === "speaking" && "bg-emerald-50 hover:bg-emerald-100 shadow-lg shadow-emerald-200 cursor-pointer",
          state === "processing" && "bg-amber-50 cursor-wait opacity-80",
          (state === "idle" || state === "error") &&
            "bg-white hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow active:scale-95",
          state === "error" && "ring-rose-300 bg-rose-50"
        )}
      >
        {/* Pulsing ring for listening */}
        {state === "listening" && (
          <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
        )}

        {/* Icon */}
        {state === "idle" || state === "error" ? (
          <MicIcon className="w-5 h-5 text-slate-600" />
        ) : state === "listening" ? (
          <MicIcon className="w-5 h-5 text-red-500" />
        ) : state === "processing" ? (
          <SpinnerIcon className="w-5 h-5 text-amber-500 animate-spin" />
        ) : state === "speaking" ? (
          <SpeakerIcon className="w-5 h-5 text-emerald-500" />
        ) : null}
      </button>

      {/* State label */}
      {(isActive || state === "error") && (
        <span
          className={cn(
            "text-xs font-medium whitespace-nowrap",
            state === "listening" && "text-red-500",
            state === "processing" && "text-amber-500",
            state === "speaking" && "text-emerald-600",
            state === "error" && "text-rose-500"
          )}
        >
          {LABELS[state]}
        </span>
      )}

      {/* Live transcript preview */}
      {state === "listening" && transcript && (
        <span className="text-xs text-slate-500 max-w-[160px] text-center truncate">
          {transcript}
        </span>
      )}
    </div>
  );
}

// ─── Small inline SVG icons ──────────────────────────────────────────────────

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10a7 7 0 01-14 0M12 19v4M8 23h8" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.07 4.93a10 10 0 010 14.14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}
