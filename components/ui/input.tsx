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
          "block w-full rounded-[32px] border border-slate-200/60 bg-white/80 backdrop-blur-2xl px-6 py-[18px]",
          "text-base text-slate-800 placeholder:text-slate-400 leading-[24px] align-middle",
          "shadow-sm",
          "ring-offset-transparent transition-all duration-200 ease-in-out",
          "focus:outline-none focus:border-indigo-300 focus:bg-white focus:shadow-md focus:ring-4 focus:ring-indigo-500/10",
          "resize-none overflow-hidden max-h-[240px]",
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
