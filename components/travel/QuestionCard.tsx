"use client";

import { useState, useRef } from "react";
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
  const hasSubmitted = submitted || isSubmitted;

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

  if (hasSubmitted) {
    return (
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-slate-700 text-sm font-medium">Answers submitted</p>
        <dl className="mt-2 space-y-1">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-1.5 text-xs">
              <dt className="text-slate-500 shrink-0">{q.question}:</dt>
              <dd className="text-slate-700 font-medium">
                {answers[q.id] || "(not provided)"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white px-4 py-4">
      {context && (
        <p className="text-slate-700 text-sm leading-relaxed mb-4">{context}</p>
      )}

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-1.5">
            <label
              id={`qc-label-${q.id}`}
              htmlFor={`qc-input-${q.id}`}
              className="text-slate-700 text-sm font-medium block"
            >
              {q.question}
              {q.required !== false && (
                <span className="text-slate-400 ml-1.5 font-normal text-xs">
                  required
                </span>
              )}
            </label>

            {q.type === "select" && q.options ? (
              <div role="group" aria-labelledby={`qc-label-${q.id}`}>
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChange(q.id, opt)}
                      aria-pressed={answers[q.id] === opt}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        answers[q.id] === opt
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {errors[q.id] && (
                  <p className="text-red-500 text-xs font-medium mt-1.5" role="alert">
                    {errors[q.id]}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  ref={(el) => {
                    inputRefs.current[q.id] = el;
                  }}
                  id={`qc-input-${q.id}`}
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
                      const textQuestions = questions.filter(
                        (tq) => tq.type !== "select"
                      );
                      const currentIdx = textQuestions.findIndex(
                        (tq) => tq.id === q.id
                      );
                      if (currentIdx < textQuestions.length - 1) {
                        inputRefs.current[
                          textQuestions[currentIdx + 1].id
                        ]?.focus();
                      } else {
                        handleSubmit();
                      }
                    }
                  }}
                  placeholder={q.placeholder || "Enter answer…"}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 bg-white transition-colors focus:outline-none",
                    errors[q.id]
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
                      : "border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  )}
                />

                {focused === q.id && q.suggestions && q.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggestions">
                    {q.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChange(q.id, s)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {errors[q.id] && (
                  <p
                    id={`qc-error-${q.id}`}
                    className="text-red-500 text-xs font-medium"
                    role="alert"
                  >
                    {errors[q.id]}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {answeredCount === questions.length
            ? "All answered"
            : `${answeredCount} / ${questions.length} answered`}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-1.5 transition-colors disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("rounded bg-slate-100 animate-pulse", className)} />;
}

export function QuestionCardSkeleton({ context }: { context?: string }) {
  return (
    <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-slate-500 text-sm mb-4">
        {context ? `"${context}"` : "Creating questions…"}
      </p>

      <div className="space-y-4">
        {[
          { labelW: "w-2/5", inputW: ["w-20", "w-28", "w-16"] },
          { labelW: "w-1/3", inputW: ["w-32"] },
          { labelW: "w-1/2", inputW: ["w-24", "w-20"] },
        ].map((row, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonBar className={`h-3.5 ${row.labelW}`} />
            <div className="flex gap-1.5">
              {row.inputW.map((w, j) => (
                <SkeletonBar key={j} className={`h-7 ${w} rounded-full`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}
