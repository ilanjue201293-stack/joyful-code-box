import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { badgeClass } from "@/lib/site-utils";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/sources")({ component: SourcesPage });

function SourcesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = pathname !== "/sources";

  if (isDetailRoute) {
    return <Outlet />;
  }

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("recent");

  const { data } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => (await supabase.from("sources").select("id,name,slug,description,screenshots,discord_url,tags,status,access_method,sellauth_url,paypal_url,ltc_address,discord_redirect_url,views,created_at,updated_at").order("created_at", { ascending: false })).data ?? [],
  });

  const allTags = useMemo(() => {
    const t = new Set<string>();
    (data ?? []).forEach((s: any) => (s.tags ?? []).forEach((x: string) => t.add(x)));
    return Array.from(t).sort();
  }, [data]);

  const baseFilter = (s: any) => {
    if (q) {
      const t = q.toLowerCase();
      if (!s.name.toLowerCase().includes(t) && !(s.tags ?? []).some((x: string) => x.toLowerCase().includes(t))) return false;
    }
    if (status !== "all" && s.status !== status) return false;
    if (tag !== "all" && !(s.tags ?? []).includes(tag)) return false;
    return true;
  };

  const sorted = (arr: any[]) => {
    const c = [...arr];
    if (sort === "popular") c.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    else if (sort === "name") c.sort((a, b) => a.name.localeCompare(b.name));
    else c.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return c;
  };

  const filtered = sorted((data ?? []).filter(baseFilter));
  const free = filtered.filter((s: any) => s.access_method === "free");
  const paid = filtered.filter((s: any) => s.access_method !== "free");
  const defaultTab = free.length >= paid.length ? "free" : "paid";

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl md:text-4xl font-bold">📦 Sources</h1>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Search sources, tags…" className="max-w-sm" />
      </div>

      <div className="card-elevated p-4 mb-6 flex flex-wrap gap-3 items-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Filters</span>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="ready">✅ Ready</SelectItem>
            <SelectItem value="needs_modification">🛠️ Needs modification</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">🆕 Most recent</SelectItem>
            <SelectItem value="popular">🔥 Most popular</SelectItem>
            <SelectItem value="name">🔤 Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
        {(status !== "all" || tag !== "all" || sort !== "recent") && (
          <Button size="sm" variant="ghost" onClick={() => { setStatus("all"); setTag("all"); setSort("recent"); }}>Reset</Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="free">🆓 Free Sources ({free.length})</TabsTrigger>
          <TabsTrigger value="paid">💎 Paid Sources ({paid.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="free"><Grid items={free} /></TabsContent>
        <TabsContent value="paid"><Grid items={paid} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Grid({ items }: { items: any[] }) {
  if (!items.length) return <div className="card-elevated p-10 text-center text-muted-foreground mt-4">Nothing here yet.</div>;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {items.map(s => {
        const cover: string | undefined = s.screenshots?.[0];
        const isVideo = cover && /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(cover);
        return (
          <Link key={s.id} to="/sources/$slug" params={{ slug: s.slug }} className="card-elevated overflow-hidden glow-hover block">
            {cover && (isVideo
              ? <video src={cover} muted className="w-full h-40 object-cover" />
              : <img src={cover} alt={s.name} className="w-full h-40 object-cover" />)}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{s.name}</div>
                <span className={`text-[10px] px-2 py-1 rounded border ${badgeClass(String(s.status).replace(/_/g," ").toUpperCase())}`}>{String(s.status).replace(/_/g," ").toUpperCase()}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
              <div className="text-xs text-primary uppercase">{s.access_method === "free" ? "free" : "paid"}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
