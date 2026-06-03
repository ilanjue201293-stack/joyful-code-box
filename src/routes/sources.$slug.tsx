import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Highlight, themes } from "prism-react-renderer";
import { useServerFn } from "@tanstack/react-start";
import { getSourceCode, incrementSourceViews } from "@/lib/api.functions";
import { toast } from "sonner";
import { Maximize2, Eye, ExternalLink, Crown } from "lucide-react";
import { SOURCE_PUBLIC_COLS } from "@/lib/db-columns";
import { badgeClass } from "@/lib/site-utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/sources/$slug")({ component: SourceDetail });

function SourceDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const incView = useServerFn(incrementSourceViews);
  const fetchSourceCode = useServerFn(getSourceCode);
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: src } = useQuery({
    queryKey: ["source", slug],
    queryFn: async () => (await supabase.from("sources").select(SOURCE_PUBLIC_COLS).eq("slug", slug).maybeSingle()).data as any,
  });

  const { data: sourceCode } = useQuery({
    queryKey: ["source-code", (src as any)?.id, user?.id],
    enabled: !!(src as any)?.id,
    queryFn: async () => {
      return await fetchSourceCode({ data: { id: (src as any).id, userId: user?.id } });
    },
  });

  useEffect(() => { if (src?.id) incView({ data: { id: src.id } }).catch(() => {}); }, [src?.id, incView]);

  if (!src) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading…</div>;
  const free = src.access_method === "free";
  const unlocked = free || !!sourceCode;

  const cta = () => {
    switch (src.access_method) {
      case "premium": return (
        <Link to="/premium">
          <Button className="gradient-primary text-white border-0"><Crown className="h-4 w-4 mr-1.5" /> Unlock with Premium</Button>
        </Link>
      );
      case "sellauth": return src.sellauth_url ? <a href={src.sellauth_url} target="_blank" rel="noreferrer"><Button className="gradient-primary text-white border-0">Buy Now</Button></a> : null;
      case "paypal": return src.paypal_url ? <a href={src.paypal_url} target="_blank" rel="noreferrer"><Button className="gradient-primary text-white border-0">Pay with PayPal</Button></a> : null;
      case "ltc": return src.ltc_address ? (
        <div className="text-left">
          <p className="text-xs mb-2">Pay with LTC:</p>
          <code className="block bg-secondary p-2 rounded text-xs break-all">{src.ltc_address}</code>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(src.ltc_address!); toast.success("Copied"); }}>Copy</Button>
        </div>
      ) : null;
      case "discord": return src.discord_redirect_url ? <a href={src.discord_redirect_url} target="_blank" rel="noreferrer"><Button className="gradient-primary text-white border-0">Join Discord</Button></a> : null;
      default: return null;
    }
  };

  return (
    <div className={`${full ? "fixed inset-0 z-50 bg-background overflow-auto" : "container mx-auto px-4 py-10 max-w-5xl"}`}>
      {!full && (
        <div className="card-elevated p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold">{src.name}</h1>
            <div className="flex flex-wrap gap-1">
              <span className={`text-[10px] px-2 py-1 rounded border ${badgeClass(String(src.status).replace(/_/g," ").toUpperCase())}`}>{String(src.status).replace(/_/g," ").toUpperCase()}</span>
              <span className={`text-[10px] px-2 py-1 rounded border ${badgeClass(String(src.access_method).toUpperCase())}`}>{String(src.access_method).toUpperCase()}</span>
            </div>
          </div>
          <p className="mb-4">{src.description}</p>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {src.views ?? 0}</span>
            {src.discord_url && (
              <a href={src.discord_url} target="_blank" rel="noreferrer">
                <Button size="sm" className="gradient-primary text-white border-0">Discord <ExternalLink className="h-3 w-3 ml-1" /></Button>
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(src.tags ?? []).map((t: string) => <span key={t} className="text-xs px-2 py-1 rounded bg-secondary border border-border">{t}</span>)}
          </div>
          {src.screenshots?.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {src.screenshots.map((s: string, i: number) => (
                /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(s)
                  ? <video key={i} src={s} controls playsInline className="rounded-lg w-full" />
                  : <img key={i} src={s} alt="" className="rounded-lg w-full" />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`card-elevated ${full ? "m-4" : ""} p-6`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Source Code</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setExpanded(e => !e)}>{expanded ? "Collapse" : "Expand"}</Button>
            <Button size="sm" variant="outline" onClick={() => setFull(f => !f)}><Maximize2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="relative">
          {!unlocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="glass p-6 rounded-xl text-center">{cta()}</div>
            </div>
          )}
          <div className={!unlocked ? "blur-source" : ""}>
            <Highlight code={sourceCode || (free ? "// no code" : "// premium")} language="lua" theme={themes.nightOwl}>
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={`${className} rounded-lg p-4 text-xs overflow-auto border border-border ${expanded || full ? "max-h-none" : "max-h-96"}`} style={style}>
                  {tokens.map((line, i) => <div key={i} {...getLineProps({ line })}>{line.map((tk, k) => <span key={k} {...getTokenProps({ token: tk })} />)}</div>)}
                </pre>
              )}
            </Highlight>
          </div>
        </div>
        {unlocked && sourceCode && (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { navigator.clipboard.writeText(sourceCode); toast.success("Copied"); }}>Copy code</Button>
        )}
      </div>
    </div>
  );
}
