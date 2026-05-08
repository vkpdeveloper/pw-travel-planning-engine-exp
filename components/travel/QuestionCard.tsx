"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardQuestion {
  id: string;
  question: string;
  type: "text" | "date" | "number" | "select";
  placeholder?: string;
  options?: string[];
  suggestions?: string[];
  required?: boolean;
}

interface QuestionCardProps {
  context?: string;
  questions: CardQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitted?: boolean;
}

export function QuestionCard({
  context,
  questions,
  onSubmit,
  isSubmitted = false,
}: QuestionCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(isSubmitted);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Keep submitted in sync with isSubmitted prop
  useEffect(() => {
    if (isSubmitted) setSubmitted(true);
  }, [isSubmitted]);

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      if (q.required !== false && !answers[q.id]?.trim()) {
        newErrors[q.id] = "This is required";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitted(true);
    onSubmit(answers);
  };

  // Submitted state — compact confirmation
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 py-3 shadow-sm shadow-slate-200/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-slate-600 text-sm font-medium">Answers submitted</span>
        </div>
        <div className="mt-2.5 pl-8 space-y-1">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-1.5 text-xs">
              <span className="text-slate-400 shrink-0">{q.question}:</span>
              <span className="text-slate-600 font-medium">{answers[q.id] || "(not provided)"}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 24, stiffness: 300, mass: 0.9 }}
      className="max-w-xl w-full"
    >
      {/* Main card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Thin gradient accent bar at top */}
        <div className="h-[2.5px] bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500" />

        {/* Questions body */}
        <div className="px-5 pt-4 pb-3 space-y-5">
          {/* Context */}
          {context && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-300/25 mt-0.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M2 4a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2H9l-3 3V11H4a2 2 0 01-2-2V4z"
                    fill="currentColor"
                    fillOpacity="0.2"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{context}</p>
            </motion.div>
          )}

          {/* Question list */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.08 + idx * 0.07,
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-2"
              >
                {/* Question label */}
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
                    {idx + 1}
                  </span>
                  <span id={`qc-label-${q.id}`} className="text-slate-700 text-[13.5px] font-semibold leading-snug">
                    {q.question}
                    {q.required !== false && (
                      <span className="text-indigo-400 ml-1 font-normal text-[11px]">
                        required
                      </span>
                    )}
                  </span>
                </div>

                {/* Select — pill buttons */}
                {q.type === "select" && q.options ? (
                  <div className="pl-7" role="group" aria-labelledby={`qc-label-${q.id}`}>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleChange(q.id, opt)}
                          aria-pressed={answers[q.id] === opt}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium border transition-all duration-150 active:scale-95",
                            answers[q.id] === opt
                              ? "bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-400/30"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {errors[q.id] && (
                      <p className="text-red-500 text-[11px] font-medium mt-1.5" role="alert">{errors[q.id]}</p>
                    )}
                  </div>
                ) : (
                  /* Text / date / number — inline input */
                  <div className="pl-7 space-y-1.5">
                    <div className="relative">
                      <input
                        ref={(el) => { inputRefs.current[q.id] = el; }}
                        id={`qc-input-${q.id}`}
                        aria-labelledby={`qc-label-${q.id}`}
                        aria-required={q.required !== false}
                        aria-invalid={!!errors[q.id]}
                        aria-describedby={errors[q.id] ? `qc-error-${q.id}` : undefined}
                        type={
                          q.type === "date"
                            ? "date"
                            : q.type === "number"
                            ? "number"
                            : "text"
                        }
                        value={answers[q.id] || ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        onFocus={() => setFocused(q.id)}
                        onBlur={() =>
                          setTimeout(
                            () => setFocused((prev) => (prev === q.id ? null : prev)),
                            160
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            // Move to next text question or submit
                            const textQuestions = questions.filter(
                              (tq) => tq.type !== "select"
                            );
                            const currentIdx = textQuestions.findIndex((tq) => tq.id === q.id);
                            if (currentIdx < textQuestions.length - 1) {
                              inputRefs.current[textQuestions[currentIdx + 1].id]?.focus();
                            } else {
                              handleSubmit();
                            }
                          }
                        }}
                        placeholder={q.placeholder || `Enter answer…`}
                        className={cn(
                          "w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 bg-slate-50 transition-all duration-150 focus:outline-none focus:bg-white",
                          errors[q.id]
                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
                            : "border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                        )}
                      />
                    </div>

                    {/* Suggestions — appear on focus */}
                    <AnimatePresence>
                      {focused === q.id && q.suggestions && q.suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14 }}
                          className="flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Suggestions"
                        >
                          {q.suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleChange(q.id, s)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {errors[q.id] && (
                      <p id={`qc-error-${q.id}`} className="text-red-500 text-[11px] font-medium" role="alert">{errors[q.id]}</p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar — mimics the main chat input + send button */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 shadow-sm">
            <span className="flex-1 text-[13px] text-slate-400 select-none">
              {Object.values(answers).filter(Boolean).length === questions.length
                ? "All answered — ready to continue"
                : `${Object.values(answers).filter(Boolean).length} / ${questions.length} answered`}
            </span>

            {/* Circular submit button */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              whileTap={{ scale: 0.93 }}
              aria-label="Submit answers"
              className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center shadow-md shadow-indigo-500/25 transition-colors duration-150 shrink-0 disabled:opacity-40"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M2 8h12M8 2l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-[skeleton-shimmer_1.5s_ease-in-out_infinite] ${className ?? ""}`}
    />
  );
}

export function QuestionCardSkeleton({ context }: { context?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl w-full"
    >
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Animated gradient top bar */}
        <div className="h-[2.5px] bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 animate-pulse" />

        <div className="px-5 pt-4 pb-3 space-y-5">
          {/* Header — "Creating questions…" */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-300/25">
              {/* mini spinner */}
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
            <div>
              <p className="text-slate-700 text-sm font-semibold">
                {context ? `"${context}"` : "Creating questions…"}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">Building your personalised form</p>
            </div>
          </div>

          {/* Skeleton question rows — staggered */}
          <div className="space-y-4">
            {[
              { labelW: "w-2/5", inputW: ["w-20", "w-28", "w-16"] },
              { labelW: "w-1/3", inputW: ["w-32"] },
              { labelW: "w-1/2", inputW: ["w-24", "w-20"] },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.12, duration: 0.3 }}
                className="space-y-2"
              >
                {/* Question label skeleton */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200/70 shrink-0 animate-pulse" />
                  <SkeletonPulse className={`h-3 ${row.labelW}`} />
                </div>
                {/* Answer option skeletons */}
                <div className="pl-7 flex gap-2">
                  {row.inputW.map((w, j) => (
                    <SkeletonPulse key={j} className={`h-8 ${w} rounded-xl`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar skeleton */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5">
            <SkeletonPulse className="flex-1 h-3 max-w-[160px]" />
            <div className="w-9 h-9 rounded-full bg-indigo-100 animate-pulse shrink-0" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
