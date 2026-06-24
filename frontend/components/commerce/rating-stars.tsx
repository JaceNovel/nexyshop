import { Star } from "lucide-react";

export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${star <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
        />
      ))}
    </div>
  );
}
