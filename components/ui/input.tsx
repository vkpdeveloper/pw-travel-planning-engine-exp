import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"textarea"> {
  onSubmit?: () => void;
}

const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
  ({ className, onSubmit, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
      }
      onKeyDown?.(e);
    };

    return (
      <textarea
        ref={ref}
        data-slot="input"
        className={cn(
          "flex w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-4",
          "text-base text-white placeholder:text-white/40 leading-relaxed",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.3)]",
          "ring-offset-transparent transition-all duration-200 ease-in-out",
          "focus:outline-none focus:border-indigo-400/60 focus:bg-white/8 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.3),0_8px_32px_rgba(0,0,0,0.4)]",
          "resize-none overflow-hidden min-h-[56px] max-h-[240px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
