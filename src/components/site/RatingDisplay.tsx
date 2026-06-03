import { Star } from "lucide-react";

export function RatingDisplay({ avg, count, size = 14 }: { avg: number; count: number; size?: number }) {
  if (!count) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="text-muted-foreground/40" style={{ width: size, height: size }} />)}</div>
        <span>No ratings</span>
      </div>
    );
  }
  const full = Math.round(avg);
  return (
    <div className="flex items-center gap-1 text-xs">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={i < full ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
            style={{ width: size, height: size }}
          />
        ))}
      </div>
      <span className="text-muted-foreground">{avg.toFixed(1)} ({count})</span>
    </div>
  );
}
