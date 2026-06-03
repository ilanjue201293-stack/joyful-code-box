import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { badgeClass, computeBadges } from "@/lib/site-utils";
import { Eye, Filter } from "lucide-react";

export const Route = createFileRoute("/scripts")({
  validateSearch: z.object({ q: z.string().optional() }).parse,
  component: ScriptsPage,
});

function ScriptsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname !== "/scripts";

  if (isDetailRoute) {
    return <Outlet />;
  }

  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const navigate = useNavigate({ from: "/scripts" });
  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);

  const { data: scripts } = useQuery({
    queryKey: ["scripts"],
    queryFn: async () => (await supabase.from("scripts").select("id,name,slug,description,features,screenshots,youtube_url,discord_url,tags,status,is_premium,payment_method,sellauth_url,paypal_url,ltc_address,verified_by_nalyy,badges,views,developer,created_at,updated_at").order("created_at", { ascending: false })).data ?? [],
  });

  const allTags = useMemo(() => {
    const t = new Set<string>();
    (scripts ?? []).forEach((s: any) => (s.tags ?? []).forEach((x: string) => t.add(x)));
    return Array.from(t).sort();
  }, [scripts]);
  const [tag, setTag] = useState<string>("all");

  const baseFilter = (s: any) => {
    if (q) {
      const t = q.toLowerCase();
      if (!s.name.toLowerCase().includes(t) && !(s.tags ?? []).some((x: string) => x.toLowerCase().includes(t)) && !(s.features ?? []).some((x: string) => x.toLowerCase().includes(t))) return false;
    }
    if (status !== "all" && s.status !== status) return false;
    if (tag !== "all" && !(s.tags ?? []).includes(tag)) return false;
    if (verifiedOnly && !s.verified_by_nalyy) return false;
    return true;
  };

  const sorted = (arr: any[]) => {
    const copy = [...arr];
    if (sort === "popular") copy.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    else if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    else copy.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return copy;
  };

  const filtered = sorted((scripts ?? []).filter(baseFilter));
  const free = filtered.filter((s: any) => !s.is_premium);
  const paid = filtered.filter((s: any) => s.is_premium);
  const defaultTab = free.length >= paid.length ? "free" : "paid";

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">⚡ Scripts</h1>
          <p className="text-muted-foreground text-sm mt-1">Verified paid and free scripts.</p>
        </div>
        <Input value={q} onChange={e => { setQ(e.target.value); navigate({ search: e.target.value ? { q: e.target.value } : {} }); }} placeholder="🔍 Search scripts, tags, features…" className="max-w-sm" />
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 mb-6 flex flex-wrap gap-3 items-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Filters</span>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="working">✅ Working</SelectItem>
            <SelectItem value="patched">❌ Patched</SelectItem>
            <SelectItem value="updating">🛠️ Updating</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">🆕 Most recent</SelectItem>
            <SelectItem value="popular">🔥 Most popular</SelectItem>
            <SelectItem value="name">🔤 Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant={verifiedOnly ? "default" : "outline"} onClick={() => setVerifiedOnly(v => !v)}>
          ⭐ Verified only
        </Button>
        {(status !== "all" || tag !== "all" || sort !== "recent" || verifiedOnly) && (
          <Button size="sm" variant="ghost" onClick={() => { setStatus("all"); setTag("all"); setSort("recent"); setVerifiedOnly(false); }}>Reset</Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="free">🆓 Free Scripts ({free.length})</TabsTrigger>
          <TabsTrigger value="paid">💎 Paid Scripts ({paid.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="free"><ScriptGrid items={free} /></TabsContent>
        <TabsContent value="paid"><ScriptGrid items={paid} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ScriptGrid({ items }: { items: any[] }) {
  if (!items.length) return <div className="card-elevated p-10 text-center text-muted-foreground mt-4">No scripts match.</div>;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {items.map((s: any) => {
        const badges = computeBadges({ is_premium: s.is_premium, verified_by_nalyy: s.verified_by_nalyy, created_at: s.created_at, updated_at: s.updated_at, views: s.views });
        const cover: string | undefined = s.screenshots?.[0];
        const isVideo = cover && /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(cover);
        return (
          <Link key={s.id} to="/scripts/$slug" params={{ slug: s.slug }} className="card-elevated overflow-hidden glow-hover block">
            {cover && (
              isVideo
                ? <video src={cover} muted className="w-full h-40 object-cover" />
                : <img src={cover} alt={s.name} className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{s.name}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeClass(String(s.status).toUpperCase())}`}>{String(s.status).toUpperCase()}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {badges.slice(0, 3).map(b => {
                  const label = b === "PREMIUM" ? "PAID" : b;
                  return <span key={b} className={`text-[9px] px-2 py-0.5 rounded border ${badgeClass(label)}`}>{label}</span>;
                })}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{s.views ?? 0}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
