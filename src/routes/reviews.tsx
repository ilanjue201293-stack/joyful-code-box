import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export const Route = createFileRoute("/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const { data } = useQuery({
    queryKey: ["all-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, scripts(name,slug), profiles(username,is_premium)").order("created_at", { ascending: false })).data ?? [],
  });
  const avg = data && data.length ? data.reduce((s: number, r: any) => s + r.rating, 0) / data.length : 0;
  // Pin premium reviews to the top
  const sorted = [...(data ?? [])].sort((a: any, b: any) => {
    const ap = a.profiles?.is_premium ? 1 : 0;
    const bp = b.profiles?.is_premium ? 1 : 0;
    return bp - ap;
  });
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">Reviews</h1>
      <p className="text-muted-foreground mb-6">Average rating: <span className="text-primary font-bold">{avg.toFixed(2)}</span> · {data?.length ?? 0} reviews</p>
      <div className="grid md:grid-cols-2 gap-4">
        {sorted.map((r: any) => (
          <div key={r.id} className={`card-elevated p-5 ${r.profiles?.is_premium ? "review-premium" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm flex items-center gap-1.5">
                {r.profiles?.username ?? "user"}
                {r.profiles?.is_premium && <span className="premium-badge">💎</span>}
              </span>
              <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
            </div>
            <p className="text-sm mb-3">{r.text}</p>
            {r.scripts && <Link to="/scripts/$slug" params={{ slug: r.scripts.slug }} className="text-xs text-primary hover:underline">on {r.scripts.name} →</Link>}
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="card-elevated p-10 text-center text-muted-foreground md:col-span-2">No reviews yet.</div>}
      </div>
    </div>
  );
}
