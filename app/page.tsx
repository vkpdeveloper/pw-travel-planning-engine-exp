"use client";

import React from "react";
import { Streamdown } from "streamdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ToolCallStatus } from "@/components/travel/ToolCallStatus";
import { FlightResults, FlightLoadingSkeleton } from "@/components/travel/FlightResults";
import { QuestionCard, QuestionCardSkeleton } from "@/components/travel/QuestionCard";
import { PlaceCards, PlaceCardsLoadingSkeleton } from "@/components/travel/PlaceCards";
import { ItineraryRoute } from "@/components/travel/ItineraryRoute";
import type { AnimatedMapProps } from "@/components/travel/AnimatedMap";
import { UserOnboardingDialog, type UserProfile } from "@/components/travel/UserOnboardingDialog";
import { VoiceButton } from "@/components/VoiceButton";
import { motion, useAnimation } from "motion/react";

// Dynamically import the map (no SSR - needs window/google)
const AnimatedMap = dynamic(
  () => import("@/components/travel/AnimatedMap").then((m) => m.AnimatedMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-72 md:h-96 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-[1.5px] border-slate-300 border-t-indigo-500 animate-spin" />
        <span className="text-slate-500 text-sm">Loading map…</span>
      </div>
    </div>
  );
}

// Suggestion chips shown on empty state
const SUGGESTIONS = [
  "I want to fly from New York to Tokyo in December",
  "Plan a business trip from London to Dubai next week",
  "Mumbai to Paris, 2 passengers, economy, early January",
  "Weekend getaway from San Francisco to Las Vegas",
];

// Shimmering "thinking" indicator
function TypingDots() {
  return (
    <div className="relative inline-block" role="status" aria-label="Thinking">
      <span aria-hidden="true" className="bg-[linear-gradient(90deg,#94a3b8_0%,#94a3b8_40%,#0f172a_50%,#94a3b8_60%,#94a3b8_100%)] bg-[length:200%_100%] bg-clip-text text-transparent text-sm font-medium animate-[shimmer_2s_linear_infinite]">
        Thinking
      </span>
    </div>
  );
}

// Map SDK v6 tool states to ToolCallStatus legacy states
function mapToolState(
  state: "input-streaming" | "input-available" | "output-available" | "output-error" | string
): "partial-call" | "call" | "result" {
  if (state === "input-streaming") return "partial-call";
  if (state === "input-available") return "call";
  return "result"; // output-available, output-error, etc.
}


function useTypewriter(texts: string[]) {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const text = texts[currentIndex];

    if (isDeleting) {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(text.substring(0, currentText.length - 1));
        }, 50); // fast delete
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }, 50);
      }
    } else {
      if (currentText.length < text.length) {
        timer = setTimeout(() => {
          setCurrentText(text.substring(0, currentText.length + 1));
        }, 100); // typing speed
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000); // pause before deleting
      }
    }
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentIndex, texts]);

  return currentText;
}

export default function TravelAgentPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleProfileComplete = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/travel",
        prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
          body: {
            id,
            messages,
            trigger,
            messageId,
            ...body,
            userProfile,
          },
        }),
      }),
    [userProfile]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (err: Error) => console.error("Chat error:", err),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  const animatedPlaceholder = useTypewriter(SUGGESTIONS);

  // Mesh gradient animation controls
  const blob1 = useAnimation();
  const blob2 = useAnimation();
  const blob3 = useAnimation();
  const blob4 = useAnimation();

  useEffect(() => {
    if (isLoading) {
      blob1.start({
        x: ["10%", "60%", "30%", "10%"],
        y: ["-10%", "20%", "50%", "-10%"],
        scale: [1, 1.18, 0.92, 1],
        opacity: [0.55, 0.85, 0.65, 0.55],
        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
      });
      blob2.start({
        x: ["10%", "-40%", "-20%", "10%"],
        y: ["10%", "-30%", "-60%", "10%"],
        scale: [1, 0.88, 1.14, 1],
        opacity: [0.5, 0.8, 0.6, 0.5],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
      });
      blob3.start({
        x: ["-50%", "-30%", "-70%", "-50%"],
        y: ["-50%", "-70%", "-30%", "-50%"],
        scale: [1, 1.12, 0.94, 1],
        opacity: [0.45, 0.75, 0.55, 0.45],
        transition: { duration: 9, repeat: Infinity, ease: "easeInOut" },
      });
      blob4.start({
        x: ["70%", "30%", "80%", "70%"],
        y: ["60%", "30%", "10%", "60%"],
        scale: [1, 1.2, 0.9, 1],
        opacity: [0.45, 0.72, 0.58, 0.45],
        transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      // Return all blobs to their initial resting positions, then resume idle loops
      Promise.all([
        blob1.start({ x: "10%", y: "-10%", scale: 1, opacity: 0.4, transition: { duration: 1.8, ease: "easeInOut" } }),
        blob2.start({ x: "10%", y: "10%", scale: 1, opacity: 0.4, transition: { duration: 1.8, ease: "easeInOut" } }),
        blob3.start({ x: "-50%", y: "-50%", scale: 1, opacity: 0.3, transition: { duration: 1.8, ease: "easeInOut" } }),
        blob4.start({ x: "70%", y: "60%", scale: 1, opacity: 0.3, transition: { duration: 1.8, ease: "easeInOut" } }),
      ]).then(() => {
        blob1.start({
          x: ["10%", "60%", "30%", "10%"],
          y: ["-10%", "20%", "50%", "-10%"],
          transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        });
        blob2.start({
          x: ["10%", "-40%", "-20%", "10%"],
          y: ["10%", "-30%", "-60%", "10%"],
          transition: { duration: 22, repeat: Infinity, ease: "easeInOut" },
        });
        blob3.start({
          x: ["-50%", "-30%", "-70%", "-50%"],
          y: ["-50%", "-70%", "-30%", "-50%"],
          transition: { duration: 25, repeat: Infinity, ease: "easeInOut" },
        });
        blob4.start({
          x: ["70%", "30%", "80%", "70%"],
          y: ["60%", "30%", "10%", "60%"],
          transition: { duration: 20, repeat: Infinity, ease: "easeInOut" },
        });
      });
    }
  }, [isLoading, blob1, blob2, blob3, blob4]);


  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [input]);

  const onSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input });
      setInput("");
    },
    [input, isLoading, sendMessage]
  );

  const handleQuestionSubmit = useCallback(
    (toolCallId: string, answers: Record<string, string>) => {
      setSubmittedQuestions((prev) => new Set([...prev, toolCallId]));
      const answerText = Object.entries(answers)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join(", ");
      sendMessage({ text: `Here are my answers: ${answerText}` });
    },
    [sendMessage]
  );

  // Called when voice STT produces a transcript — send it as a chat message
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      sendMessage({ text });
    },
    [sendMessage, isLoading]
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#fafbfc]">
      {/* Skip to main content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <UserOnboardingDialog onComplete={handleProfileComplete} />
      {/* Background gradient layers - Animated Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 pointer-events-none" />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-purple-300/40 blur-3xl mix-blend-multiply pointer-events-none"
        initial={{ x: "10%", y: "-10%", scale: 1, opacity: 0.4 }}
        animate={blob1}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full bg-blue-300/40 blur-3xl mix-blend-multiply pointer-events-none"
        initial={{ x: "10%", y: "10%", scale: 1, opacity: 0.4 }}
        animate={blob2}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full bg-pink-300/30 blur-3xl mix-blend-multiply pointer-events-none"
        initial={{ x: "-50%", y: "-50%", scale: 1, opacity: 0.3 }}
        animate={blob3}
      />
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full bg-amber-200/30 blur-3xl mix-blend-multiply pointer-events-none"
        initial={{ x: "70%", y: "60%", scale: 1, opacity: 0.3 }}
        animate={blob4}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-slate-800 font-semibold text-lg leading-tight tracking-tight">TravelMind</h1>
            <p className="text-slate-500 text-xs font-medium">AI Travel Experience Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-500 text-xs font-medium">Powered by Gemini</span>
        </div>
      </header>

      {/* Main content area */}
      <main id="main-content" className="relative z-10 flex-1 flex flex-col items-center overflow-hidden">
        {hasMessages ? (
          <div className="w-full flex-1 overflow-y-auto">
            <div
              className="max-w-3xl mx-auto px-4 py-6 space-y-6"
              role="log"
              aria-live="polite"
              aria-label="Conversation"
            >
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {/* User message */}
                  {message.role === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-indigo-50 border border-indigo-100 px-4 py-3">
                        <p className="text-slate-800 text-sm leading-relaxed">
                          {message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => (p as { type: "text"; text: string }).text)
                            .join("")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assistant message */}
                  {message.role === "assistant" && (
                    <div className="space-y-3">
                      {message.parts.map((part, partIdx) => {
                        if (part.type === "text") {
                          const textPart = part as { type: "text"; text: string };
                          if (!textPart.text) return null;
                          return (
                            <div key={partIdx} className="pl-1">
                              <Streamdown isAnimating={status === "streaming"}>
                                {textPart.text}
                              </Streamdown>
                            </div>
                          );
                        }
                        if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
                          const toolPart = part as {
                            type: string;
                            toolName?: string;
                            toolCallId: string;
                            state: string;
                            input: unknown;
                            output?: unknown;
                          };
                          const toolName =
                            toolPart.toolName ?? part.type.replace(/^tool-/, "");
                          const { toolCallId, state, input: toolInput, output } = toolPart;
                          const mappedState = mapToolState(state);

                          if (toolName === "askFollowUpQuestions") {
                            const qInput = toolInput as {
                              context?: string;
                            } | undefined;
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {/* Loading skeleton while tool is building questions */}
                                {state !== "output-available" && (
                                  <QuestionCardSkeleton context={qInput?.context} />
                                )}
                                {/* Full interactive form once output is ready */}
                                {state === "output-available" && !!output && (
                                  <QuestionCard
                                    context={
                                      (output as { context: string; questions: Array<{
                                        id: string;
                                        question: string;
                                        type: "text" | "date" | "number" | "select";
                                        placeholder?: string;
                                        options?: string[];
                                        suggestions?: string[];
                                        required: boolean;
                                      }> }).context
                                    }
                                    questions={
                                      (output as { context: string; questions: Array<{
                                        id: string;
                                        question: string;
                                        type: "text" | "date" | "number" | "select";
                                        placeholder?: string;
                                        options?: string[];
                                        suggestions?: string[];
                                        required: boolean;
                                      }> }).questions
                                    }
                                    onSubmit={(answers) =>
                                      handleQuestionSubmit(toolCallId, answers)
                                    }
                                    isSubmitted={submittedQuestions.has(toolCallId)}
                                  />
                                )}
                              </div>
                            );
                          }

                          if (toolName === "calculateRoute") {
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state === "output-available" &&
                                  !!output &&
                                  !(output as Record<string, unknown>).error && (
                                    <AnimatedMap
                                      {...(output as AnimatedMapProps)}
                                    />
                                  )}
                              </div>
                            );
                          }

                          if (toolName === "findPlaces") {
                            const findInput = toolInput as { destination?: string; category?: string } | undefined;
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state !== "output-available" && (
                                  <PlaceCardsLoadingSkeleton
                                    destination={findInput?.destination}
                                  />
                                )}
                                {state === "output-available" && !!output && (
                                  <PlaceCards
                                    data={output as Parameters<typeof PlaceCards>[0]["data"]}
                                  />
                                )}
                              </div>
                            );
                          }

                          if (toolName === "optimizeItinerary") {
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state === "output-available" && !!output && (
                                  <ItineraryRoute
                                    data={output as Parameters<typeof ItineraryRoute>[0]["data"]}
                                  />
                                )}
                              </div>
                            );
                          }

                          if (toolName === "searchFlights") {
                            const flightInput = toolInput as {
                              departureIata?: string;
                              arrivalIata?: string;
                            } | undefined;
                            return (
                              <div key={partIdx} className="space-y-3">
                                <ToolCallStatus
                                  toolName={toolName}
                                  state={mappedState}
                                  input={toolInput}
                                  output={output}
                                />
                                {state !== "output-available" && (
                                  <FlightLoadingSkeleton
                                    from={flightInput?.departureIata}
                                    to={flightInput?.arrivalIata}
                                  />
                                )}
                                {state === "output-available" && !!output && (
                                  <FlightResults
                                    data={output as Parameters<typeof FlightResults>[0]["data"]}
                                  />
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={partIdx}>
                              <ToolCallStatus
                                toolName={toolName}
                                state={mappedState}
                                input={toolInput}
                                output={output}
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 pl-1">
                  <TypingDots />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : null}

        {/* Input area, aligned to center if empty, bottom if not */}
        <div 
          className={cn(
            "w-full px-4 transition-all duration-500 ease-in-out",
            hasMessages ? "pb-6 pt-2" : "flex-1 flex flex-col justify-center"
          )}
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {!hasMessages && (
              <div className="space-y-2">
                <p className="text-2xl md:text-3xl text-slate-700 font-medium">Hi {userProfile?.name || "there"}</p>
                <h2 className="text-4xl md:text-5xl text-slate-800 font-semibold">What can I help with?</h2>
              </div>
            )}
            
            <div className="space-y-3">
              <form onSubmit={onSubmit} className="relative">
                <Input
                  ref={textareaRef}
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInput(e.target.value)
                  }
                  onSubmit={onSubmit}
                  placeholder={
                    hasMessages
                      ? "Ask a follow-up or refine your search..."
                      : (animatedPlaceholder + "|")
                  }
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    "pr-14 transition-all",
                    !hasMessages && "bg-white/90 hover:bg-white shadow-sm border border-slate-200/60 text-lg py-5 px-6 min-h-[64px]"
                  )}
                />
                {!input.trim() && !isLoading && (
                  <VoiceButton
                    onTranscript={handleVoiceTranscript}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  />
                )}
                {(input.trim() || isLoading) && (
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400 active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200/500 border-t-white animate-spin" aria-hidden="true" />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                        <path
                          d="M2 8h12M8 2l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </form>

              {/* Hint text */}
              {hasMessages && (
                <p className="text-center text-slate-400 text-xs">
                  Press Enter to send · Shift+Enter for new line
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
