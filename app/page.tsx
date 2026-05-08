"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { ToolCallStatus } from "@/components/travel/ToolCallStatus";
import { FlightResults } from "@/components/travel/FlightResults";
import { QuestionFlow } from "@/components/travel/QuestionFlow";

// Dynamically import the map (no SSR - needs window/google)
const AnimatedMap = dynamic(
  () => import("@/components/travel/AnimatedMap").then((m) => m.AnimatedMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-72 md:h-96 rounded-2xl border border-white/10 bg-white/3 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <span className="text-white/40 text-sm">Loading map...</span>
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

// Typing animation dots
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-400/60 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
        />
      ))}
    </div>
  );
}

// Markdown-like text renderer (simple)
function StreamingText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Headers
        if (line.startsWith("### "))
          return (
            <h3 key={i} className="text-white font-bold text-base mt-3">
              {line.slice(4)}
            </h3>
          );
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="text-white font-bold text-lg mt-4">
              {line.slice(3)}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="text-white font-bold text-xl mt-4">
              {line.slice(2)}
            </h1>
          );

        // List items
        if (line.match(/^[-*•]\s/))
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-indigo-400 mt-1 shrink-0">•</span>
              <p className="text-white/80 text-sm leading-relaxed">
                {renderInline(line.slice(2))}
              </p>
            </div>
          );

        // Numbered list
        if (line.match(/^\d+\.\s/))
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-indigo-400 text-sm font-bold shrink-0 mt-0.5">
                {line.match(/^(\d+)/)?.[1]}.
              </span>
              <p className="text-white/80 text-sm leading-relaxed">
                {renderInline(line.replace(/^\d+\.\s/, ""))}
              </p>
            </div>
          );

        return (
          <p key={i} className="text-white/80 text-sm leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function TravelAgentPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());

  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setInput } =
    useChat({
      api: "/api/travel",
      onError: (err) => console.error("Chat error:", err),
    });

  const hasMessages = messages.length > 0;

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
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    },
    [input, isLoading, handleSubmit]
  );

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      append({ role: "user", content: suggestion });
    }, 50);
  };

  const handleQuestionSubmit = useCallback(
    (toolCallId: string, answers: Record<string, string>) => {
      setSubmittedQuestions((prev) => new Set([...prev, toolCallId]));
      // Build a natural language answer from structured responses
      const answerText = Object.entries(answers)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join(", ");
      append({
        role: "user",
        content: `Here are my answers: ${answerText}`,
      });
    },
    [append]
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#080c18]">
      {/* Background gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-indigo-950/60 to-slate-950/90 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/6 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-700/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-sm">✈</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">TravelMind</h1>
            <p className="text-white/35 text-xs">AI Travel Experience Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/35 text-xs">Powered by Gemini</span>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex-1 flex flex-col items-center overflow-hidden">
        {/* Messages */}
        <div className="w-full flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {/* Empty state */}
            {!hasMessages && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 py-16">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
                    <span className="text-2xl">✈</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Where do you want to go?
                    </h2>
                    <p className="text-white/45 text-base max-w-md">
                      Tell me your travel plans and I'll find flights, map your route, and
                      create a personalized experience guide.
                    </p>
                  </div>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/30 text-white/60 hover:text-white/80 text-sm transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                {/* User message */}
                {message.role === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-indigo-500/20 border border-indigo-400/20 px-4 py-3">
                      <p className="text-white/90 text-sm leading-relaxed">
                        {typeof message.content === "string"
                          ? message.content
                          : JSON.stringify(message.content)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assistant message */}
                {message.role === "assistant" && (
                  <div className="space-y-3">
                    {/* Render each part */}
                    {message.parts?.map((part, partIdx) => {
                      // Text part
                      if (part.type === "text" && part.text) {
                        return (
                          <div key={partIdx} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs">✈</span>
                            </div>
                            <div className="flex-1 pt-0.5">
                              <StreamingText text={part.text} />
                            </div>
                          </div>
                        );
                      }

                      // Tool invocation part
                      if (part.type === "tool-invocation") {
                        const { toolInvocation } = part;
                        const { toolName, toolCallId, state } = toolInvocation;
                        const input = "input" in toolInvocation ? toolInvocation.input : undefined;
                        const output =
                          "output" in toolInvocation ? toolInvocation.output : undefined;

                        // Q&A tool — render interactive form
                        if (toolName === "askFollowUpQuestions") {
                          if (state === "result" && output) {
                            const result = output as {
                              context: string;
                              questions: Array<{
                                id: string;
                                question: string;
                                type: "text" | "date" | "number" | "select";
                                placeholder?: string;
                                options?: string[];
                                required: boolean;
                              }>;
                            };
                            return (
                              <div key={partIdx}>
                                <QuestionFlow
                                  context={result.context}
                                  questions={result.questions}
                                  onSubmit={(answers) =>
                                    handleQuestionSubmit(toolCallId, answers)
                                  }
                                  isSubmitted={submittedQuestions.has(toolCallId)}
                                />
                              </div>
                            );
                          }
                          // Loading state
                          return (
                            <div key={partIdx}>
                              <ToolCallStatus
                                toolName={toolName}
                                state={state as "partial-call" | "call" | "result"}
                                input={input}
                                output={output}
                              />
                            </div>
                          );
                        }

                        // Route tool — show status + map when done
                        if (toolName === "calculateRoute") {
                          return (
                            <div key={partIdx} className="space-y-3">
                              <ToolCallStatus
                                toolName={toolName}
                                state={state as "partial-call" | "call" | "result"}
                                input={input}
                                output={output}
                              />
                              {state === "result" && output && !(output as Record<string, unknown>).error && (
                                <AnimatedMap
                                  {...(output as Parameters<typeof AnimatedMap>[0])}
                                />
                              )}
                            </div>
                          );
                        }

                        // Flight search tool — show status + results
                        if (toolName === "searchFlights") {
                          return (
                            <div key={partIdx} className="space-y-3">
                              <ToolCallStatus
                                toolName={toolName}
                                state={state as "partial-call" | "call" | "result"}
                                input={input}
                                output={output}
                              />
                              {state === "result" && output && (
                                <FlightResults
                                  data={output as Parameters<typeof FlightResults>[0]["data"]}
                                />
                              )}
                            </div>
                          );
                        }

                        // Generic tool status
                        return (
                          <div key={partIdx}>
                            <ToolCallStatus
                              toolName={toolName}
                              state={state as "partial-call" | "call" | "result"}
                              input={input}
                              output={output}
                            />
                          </div>
                        );
                      }

                      return null;
                    }) || (
                      // Fallback for messages without parts
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs">✈</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <StreamingText
                            text={
                              typeof message.content === "string"
                                ? message.content
                                : ""
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs">✈</span>
                </div>
                <div className="pt-1">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="relative z-10 w-full px-4 pb-6 pt-2">
          <div className="max-w-3xl mx-auto space-y-3">
            <form onSubmit={onSubmit} className="relative">
              <Input
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onSubmit={onSubmit}
                placeholder={
                  hasMessages
                    ? "Ask a follow-up or refine your search..."
                    : "Tell me where you want to travel — I'll handle the rest..."
                }
                disabled={isLoading}
                rows={1}
                className="pr-14"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M2 8h12M8 2l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Hint text */}
            <p className="text-center text-white/20 text-xs">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
