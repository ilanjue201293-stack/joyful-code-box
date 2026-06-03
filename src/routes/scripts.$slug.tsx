import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Heart, Star, ExternalLink } from "lucide-react";
import { badgeClass, computeBadges } from "@/lib/site-utils";
import { useServerFn } from "@tanstack/react-start";
import { getScriptSource, incrementScriptViews } from "@/lib/api.functions";
import { toast } from "sonner";
import { Highlight, themes } from "prism-react-renderer";
import { SCRIPT_PUBLIC_COLS } from "@/lib/db-columns";

export const Route = createFileRoute("/scripts/$slug")({
  component: ScriptDetail,
});

function ScriptDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const incView = useServerFn(incrementScriptViews);
  const fetchScriptSource = useServerFn(getScriptSource);

  const { data: script } = useQuery({
    queryKey: ["script", slug],
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select(SCRIPT_PUBLIC_COLS).eq("slug", slug).maybeSingle();
      return data as any;
    },
  });

  const { data: sourceCode } = useQuery({
    queryKey: ["script-source", script?.id, user?.id],
    enabled: !!script?.id,
    queryFn: async () => {
      return await fetchScriptSource({ data: { id: script!.id, userId: user?.id } });
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", script?.id],
    enabled: !!script?.id,
    queryFn: async () => (await supabase.from("reviews").select("*, profiles(username,avatar_url,is_premium)").eq("script_id", script!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: likeCount } = useQuery({
    queryKey: ["likes", script?.id],
    enabled: !!script?.id,
    queryFn: async () => ((await supabase.rpc("get_script_likes_count", { _script_id: script!.id })).data as number | null) ?? 0,
  });

  const { data: liked } = useQuery({
    queryKey: ["liked", script?.id, user?.id],
    enabled: !!script?.id && !!user,
    queryFn: async () => !!(await supabase.from("likes").select("user_id").eq("script_id", script!.id).eq("user_id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (script?.id) incView({ data: { id: script.id } }).catch(() => {});
  }, [script?.id, incView]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user || !script) throw new Error("Login required");
      if (liked) await supabase.from("likes").delete().eq("user_id", user.id).eq("script_id", script.id);
      else await supabase.from("likes").insert({ user_id: user.id, script_id: script.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["likes", script?.id] }); qc.invalidateQueries({ queryKey: ["liked", script?.id, user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!script) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading…</div>;
  const badges = computeBadges({ is_premium: script.is_premium, verified_by_nalyy: script.verified_by_nalyy, created_at: script.created_at, updated_at: script.updated_at, views: script.views, likes: likeCount });
  const payUrl = script.payment_method === "sellauth" ? script.sellauth_url : script.payment_method === "paypal" ? script.paypal_url : null;
  const ytId = script.youtube_url ? (script.youtube_url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1]) : null;
  const locked = script.is_premium && !sourceCode;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="card-elevated p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{script.name}</h1>
            <p className="text-sm text-muted-foreground">by {script.developer ?? "Nalyy"}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className={`text-[10px] px-2 py-1 rounded border ${badgeClass(String(script.status).toUpperCase())}`}>{String(script.status).toUpperCase()}</span>
            {badges.map(b => <span key={b} className={`text-[10px] px-2 py-1 rounded border ${badgeClass(b)}`}>{b}</span>)}
          </div>
        </div>
        <p className="mb-6">{script.description}</p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button size="sm" variant={liked ? "default" : "outline"} onClick={() => toggleLike.mutate()} disabled={!user}>
            <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} /> {likeCount ?? 0}
          </Button>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Eye className="h-4 w-4" /> {script.views}</span>
          {script.discord_url && (
            <a href={script.discord_url} target="_blank" rel="noreferrer">
              <Button size="sm" className="gradient-primary text-white border-0">Discord <ExternalLink className="h-3 w-3 ml-1" /></Button>
            </a>
          )}
        </div>

        {script.features?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="grid md:grid-cols-2 gap-1.5 text-sm">
              {script.features.map((f: string, i: number) => <li key={i} className="flex gap-2"><span className="text-primary">▹</span>{f}</li>)}
            </ul>
          </div>
        )}

        {script.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {script.tags.map((t: string) => <span key={t} className="text-xs px-2 py-1 rounded bg-secondary border border-border">{t}</span>)}
          </div>
        )}

        {script.screenshots?.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {script.screenshots.map((s: string, i: number) => (
              /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(s)
                ? <video key={i} src={s} controls playsInline className="rounded-lg w-full" />
                : <img key={i} src={s} alt="" className="rounded-lg w-full" />
            ))}
          </div>
        )}

        {ytId && (
          <div className="aspect-video mb-6 rounded-lg overflow-hidden border border-border">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen />
          </div>
        )}

        {/* Loader */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Loader</h3>
          {locked ? (
            <div className="relative">
              <div className="blur-source pointer-events-none select-none">
                <CodeBlock code={sourceCode || "-- premium loader\n-- purchase to unlock"} />
              </div>
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="text-center glass rounded-xl p-6">
                  <p className="mb-3 font-semibold">💎 This is a paid script</p>
                  {script.payment_method === "premium" ? (
                    <Link to="/premium"><Button className="gradient-primary text-white border-0">Unlock with Premium</Button></Link>
                  ) : payUrl ? (
                    <a href={payUrl} target="_blank" rel="noreferrer"><Button className="gradient-primary text-white border-0">Buy Now</Button></a>
                  ) : script.payment_method === "ltc" && script.ltc_address ? (
                    <LtcBox addr={script.ltc_address} />
                  ) : <Button disabled>Contact admin</Button>}
                </div>
              </div>
            </div>
          ) : (
            <CodeBlock code={sourceCode || "-- no loader provided"} />
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="card-elevated p-6 md:p-8">
        <h3 className="text-xl font-bold mb-4">Reviews</h3>
        {user && <ReviewForm scriptId={script.id} />}
        <div className="space-y-3 mt-4">
          {[...(reviews ?? [])].sort((a: any, b: any) => (b.profiles?.is_premium ? 1 : 0) - (a.profiles?.is_premium ? 1 : 0)).map((r: any) => (
            <div key={r.id} className={`border rounded-lg p-4 ${r.profiles?.is_premium ? "review-premium" : "border-border"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  {r.profiles?.username ?? "user"}
                  {r.profiles?.is_premium && <span className="premium-badge">💎</span>}
                </span>
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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="absolute right-2 top-2 z-10" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? "Copied" : "Copy"}
      </Button>
      <Highlight code={code} language="lua" theme={themes.nightOwl}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} rounded-lg p-4 text-xs overflow-auto max-h-96 border border-border`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, k) => <span key={k} {...getTokenProps({ token })} />)}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function LtcBox({ addr }: { addr: string }) {
  return (
    <div>
      <p className="text-xs mb-2">Pay with LTC:</p>
      <code className="block bg-secondary p-2 rounded text-xs break-all">{addr}</code>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(addr); toast.success("Copied"); }}>Copy address</Button>
    </div>
  );
}

function ReviewForm({ scriptId }: { scriptId: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (!text.trim()) throw new Error("Write something first");
      const { error } = await supabase.from("reviews").upsert(
        { user_id: user.id, script_id: scriptId, rating, text: text.trim() },
        { onConflict: "user_id,script_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review saved");
      setText("");
      qc.invalidateQueries({ queryKey: ["reviews", scriptId] });
      qc.invalidateQueries({ queryKey: ["all-reviews"] });
    },
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
