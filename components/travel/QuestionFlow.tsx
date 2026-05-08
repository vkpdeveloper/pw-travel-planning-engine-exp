"use client";

import { useState } from "react";

interface Question {
  id: string;
  question: string;
  type: "text" | "date" | "number" | "select";
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface QuestionFlowProps {
  context: string;
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitted?: boolean;
}

export function QuestionFlow({
  context,
  questions,
  onSubmit,
  isSubmitted = false,
}: QuestionFlowProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(isSubmitted);

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      if (q.required && !answers[q.id]?.trim()) {
        newErrors[q.id] = "This field is required";
      }
      if (q.type === "number" && answers[q.id] && isNaN(Number(answers[q.id]))) {
        newErrors[q.id] = "Please enter a valid number";
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

  if (submitted) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 12 12">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-white/50 text-sm">Answers submitted</span>
        </div>
        <div className="space-y-1.5">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-2">
              <span className="text-white/30 text-xs mt-0.5 shrink-0">•</span>
              <div>
                <span className="text-white/40 text-xs">{q.question}: </span>
                <span className="text-white/70 text-xs font-medium">
                  {answers[q.id] || "(not provided)"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-5 space-y-4">
      {/* Context */}
      <div className="flex items-start gap-3">
        <span className="text-indigo-400 text-base shrink-0 mt-0.5">💬</span>
        <p className="text-white/75 text-sm leading-relaxed">{context}</p>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-white/80 font-medium">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-[10px] text-indigo-300 font-bold shrink-0">
                {i + 1}
              </span>
              {q.question}
              {q.required && <span className="text-indigo-400 text-xs">*</span>}
            </label>

            {q.type === "select" && q.options ? (
              <div className="flex flex-wrap gap-2 pl-7">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleChange(q.id, option)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      answers[q.id] === option
                        ? "bg-indigo-500/30 border-indigo-400/60 text-indigo-100"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pl-7">
                <input
                  type={q.type === "date" ? "date" : q.type === "number" ? "number" : "text"}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder={q.placeholder || `Enter ${q.question.toLowerCase()}`}
                  min={q.type === "number" ? "1" : undefined}
                  className={`w-full rounded-xl bg-white/5 border px-3 py-2.5 text-sm text-white placeholder:text-white/30 transition-all duration-150 focus:outline-none ${
                    errors[q.id]
                      ? "border-red-400/50 focus:border-red-400/80 focus:bg-red-500/5"
                      : "border-white/10 focus:border-indigo-400/50 focus:bg-white/8"
                  }`}
                  style={{
                    colorScheme: "dark",
                  }}
                />
                {errors[q.id] && (
                  <p className="text-red-400 text-xs mt-1">{errors[q.id]}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-400/30 active:scale-95"
        >
          <span>Continue</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
