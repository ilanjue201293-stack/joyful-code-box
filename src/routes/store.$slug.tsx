import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaShowcase, isVideoUrl } from "@/components/site/MediaUploader";
import { RatingDisplay } from "@/components/site/RatingDisplay";
import { Store as StoreIcon, ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/store/$slug")({ component: ProductDetail });

function ProductDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await supabase.from("store_products").select("*").eq("slug", slug).maybeSingle()).data as any,
  });

  const { data: store } = useQuery({
    queryKey: ["product-store", product?.store_id],
    enabled: !!product?.store_id,
    queryFn: async () => (await supabase.from("stores").select("id,name,slug,logo").eq("id", product!.store_id).maybeSingle()).data as any,
  });

  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", product?.id],
    enabled: !!product?.id,
    queryFn: async () => (await (supabase as any).from("product_reviews").select("*, profiles(username,avatar_url)").eq("product_id", product!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review", product?.id, user?.id],
    enabled: !!product?.id && !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("product_buyers").select("user_id").eq("product_id", product!.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  if (isLoading) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading…</div>;
  if (!product) return <div className="container mx-auto p-10 text-center text-muted-foreground">Product not found.</div>;

  const screenshots: string[] = (product.screenshots?.length ? product.screenshots : (product.image ? [product.image] : []));
  const cover = screenshots[0];
  const rest = screenshots.slice(1);
  const url = product.payment_method === "sellauth" ? product.sellauth_url : product.payment_method === "paypal" ? product.paypal_url : null;
  const ytId = product.youtube_url ? (product.youtube_url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1]) : null;
  const avg = reviews && reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <Link to="/store" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Store
      </Link>

      <div className="card-elevated p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {store?.logo ? (
            <img src={store.logo} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
              <StoreIcon className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="text-sm text-muted-foreground">{store?.name ?? "Nalyy Official"}</div>
          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-secondary border border-border">{product.kind ?? "script"}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-black gradient-text">${Number(product.price).toFixed(2)}</div>
          <RatingDisplay avg={avg} count={reviews?.length ?? 0} size={16} />
        </div>

        {cover && (
          <div className="rounded-lg overflow-hidden mb-4">
            {isVideoUrl(cover)
              ? <video src={cover} controls playsInline className="w-full max-h-[480px] object-cover" />
              : <img src={cover} alt={product.name} className="w-full max-h-[480px] object-cover" />}
          </div>
        )}

        <p className="mb-6 whitespace-pre-wrap">{product.description}</p>

        {product.features?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="grid md:grid-cols-2 gap-1.5 text-sm">
              {product.features.map((f: string, i: number) => <li key={i} className="flex gap-2"><span className="text-primary">▹</span>{f}</li>)}
            </ul>
          </div>
        )}

        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.tags.map((t: string) => <span key={t} className="text-xs px-2 py-1 rounded bg-secondary border border-border">{t}</span>)}
          </div>
        )}

        {rest.length > 0 && <MediaShowcase urls={rest} className="mb-6" />}

        {ytId && (
          <div className="aspect-video mb-6 rounded-lg overflow-hidden border border-border">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer"><Button size="lg" className="gradient-primary text-white border-0">Buy Now</Button></a>
          ) : product.payment_method === "ltc" && product.ltc_address ? (
            <div className="w-full">
              <p className="text-xs mb-2">Pay with LTC:</p>
              <code className="block bg-secondary p-3 rounded text-xs break-all">{product.ltc_address}</code>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(product.ltc_address); toast.success("Copied"); }}>Copy address</Button>
            </div>
          ) : <Button disabled>Unavailable</Button>}
        </div>
      </div>

      <div className="card-elevated p-6 md:p-8">
        <h3 className="text-xl font-bold mb-4">Reviews</h3>
        {user && canReview && <ProductReviewForm productId={product.id} onDone={() => qc.invalidateQueries({ queryKey: ["product-reviews", product.id] })} />}
        {user && !canReview && <p className="text-xs text-muted-foreground mb-3">Only verified buyers can post a review.</p>}
        <div className="space-y-3 mt-4">
          {(reviews ?? []).map((r: any) => (
            <div key={r.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{r.profiles?.username ?? "user"}</span>
                <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
          {(reviews ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        </div>
      </div>
    </div>
  );
}

function ProductReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const { error } = await (supabase as any).from("product_reviews").upsert(
        { user_id: user.id, product_id: productId, rating, text: text.trim() },
        { onConflict: "product_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review posted"); setText(""); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="border border-border rounded-lg p-4 mb-2">
      <div className="flex gap-1 mb-2">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your thoughts…" rows={3} />
      <Button size="sm" className="mt-2" onClick={() => submit.mutate()}>Submit review</Button>
    </div>
  );
}
