import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-cyan text-void shadow-cyan hover:bg-white",
        variant === "secondary" && "border border-white/15 bg-white/10 text-white hover:border-cyan/60",
        variant === "ghost" && "bg-transparent text-white/70 hover:text-cyan",
        className
      )}
      {...props}
    />
  );
}
