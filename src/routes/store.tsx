import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Store as StoreIcon, Play, Crown } from "lucide-react";
import { MediaUploader, isVideoUrl } from "@/components/site/MediaUploader";
import { RatingDisplay } from "@/components/site/RatingDisplay";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { slugify } from "@/lib/site-utils";
import { useServerFn } from "@tanstack/react-start";
import { createPremiumStore } from "@/lib/api.functions";

export const Route = createFileRoute("/store")({ component: StoreLayout });

function StoreLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/store") return <Outlet />;
  return <StorePage />;
}

type ProductKind = "script" | "source";
type ReqProduct = {
  kind: ProductKind;
  name: string; description: string; price: string;
  screenshots: string[]; payment_method: string;
  sellauth_url: string; paypal_url: string; ltc_address: string;
  features: string; youtube_url: string; discord_url: string;
  tags: string; status: string; source_code: string;
  access_method: string; discord_redirect_url: string;
};
const blankProduct = (): ReqProduct => ({
  kind: "script",
  name: "", description: "", price: "0", screenshots: [], payment_method: "sellauth",
  sellauth_url: "", paypal_url: "", ltc_address: "",
  features: "", youtube_url: "", discord_url: "",
  tags: "", status: "working", source_code: "",
  access_method: "free", discord_redirect_url: "",
});

function arr(v: string): string[] {
  return v.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function StorePage() {
  const { data: stores } = useQuery({
    queryKey: ["stores-public"],
    queryFn: async () => (await supabase.from("stores").select("id,name,slug,logo,owner_id,created_at").order("created_at")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["store-products-public"],
    queryFn: async () => (await supabase.from("store_products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: adminIds } = useQuery({
    queryKey: ["store-owner-admins"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set((data ?? []).map((r: any) => r.user_id));
    },
  });
  const { data: ratings } = useQuery({
    queryKey: ["product-ratings"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("product_reviews").select("product_id,rating");
      const map = new Map<string, { sum: number; count: number }>();
      (data ?? []).forEach((r: any) => {
        const cur = map.get(r.product_id) ?? { sum: 0, count: 0 };
        cur.sum += r.rating; cur.count += 1;
        map.set(r.product_id, cur);
      });
      return map;
    },
  });

  const grouped = new Map<string | null, any[]>();
  (products ?? []).forEach((p: any) => {
    const k = p.store_id ?? null;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(p);
  });
  const officialProducts = grouped.get(null) ?? [];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">🛒 Store</h1>
          <p className="text-muted-foreground">Discover stores from Nalyy and the community. ✨</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <CreateStoreDialog />
          <p className="text-[10px] text-muted-foreground italic max-w-[260px] text-right">
            * You'll need to pay by discord
          </p>
        </div>
      </div>

      {officialProducts.length > 0 && (
        <StoreSection name="✨ Nalyy Official" logo={null} products={officialProducts} ratings={ratings} isAdminOwned />
      )}

      {(stores ?? []).map((s: any) => {
        const items = grouped.get(s.id) ?? [];
        if (!items.length) return null;
        return <StoreSection key={s.id} name={s.name} logo={s.logo} products={items} ratings={ratings} isAdminOwned={adminIds?.has(s.owner_id) ?? false} />;
      })}

      {officialProducts.length === 0 && (stores ?? []).every((s: any) => !(grouped.get(s.id) ?? []).length) && (
        <div className="card-elevated p-10 text-center text-muted-foreground">No products yet.</div>
      )}
    </div>
  );
}

function StoreSection({ name, logo, products, ratings, isAdminOwned }: { name: string; logo: string | null; products: any[]; ratings?: Map<string, { sum: number; count: number }>; isAdminOwned?: boolean }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        {logo ? (
          <img src={logo} alt={name} className="h-12 w-12 rounded-lg object-cover border border-border" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
            <StoreIcon className="h-6 w-6 text-white" />
          </div>
        )}
        <h2 className="text-xl md:text-2xl font-bold">{name}</h2>
        {isAdminOwned && (
          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded gradient-primary text-white border-0">
            ★ Official Admin
          </span>
        )}
        <span className="text-xs text-muted-foreground">· {products.length} product{products.length > 1 ? "s" : ""}</span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => <ProductCard key={p.id} p={p} rating={ratings?.get(p.id)} />)}
      </div>
    </section>
  );
}

function ProductCard({ p, rating }: { p: any; rating?: { sum: number; count: number } }) {
  const cover: string | null = (p.screenshots && p.screenshots[0]) || p.image || null;
  const avg = rating && rating.count ? rating.sum / rating.count : 0;
  return (
    <Link to="/store/$slug" params={{ slug: p.slug }} className="card-elevated overflow-hidden glow-hover block">
      {cover && (isVideoUrl(cover)
        ? <div className="relative w-full h-40 bg-secondary">
            <video src={cover} className="w-full h-40 object-cover" muted />
            <Play className="absolute inset-0 m-auto h-10 w-10 text-white drop-shadow" />
          </div>
        : <img src={cover} alt={p.name} className="w-full h-40 object-cover" />)}
      <div className="p-5">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="font-semibold truncate">{p.name}</div>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary border border-border flex-shrink-0">{p.kind ?? "script"}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="text-2xl font-black gradient-text">${Number(p.price).toFixed(2)}</div>
          <RatingDisplay avg={avg} count={rating?.count ?? 0} />
        </div>
      </div>
    </Link>
  );
}

function CreateStoreDialog() {
  const { user, isAdmin, isPremium } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeLogo, setStoreLogo] = useState<string[]>([]);
  const [products, setProducts] = useState<ReqProduct[]>([blankProduct()]);
  const canCreateDirect = isAdmin || isPremium;
  const createPremiumStoreFn = useServerFn(createPremiumStore);

  const buildPayload = () => {
    if (!storeName.trim()) throw new Error("Store name required");
    if (!products.length || !products.every(p => p.name.trim())) throw new Error("Each product needs a name");
    return products.map(p => ({
      kind: p.kind,
      name: p.name, description: p.description, price: Number(p.price) || 0,
      screenshots: p.screenshots, payment_method: p.payment_method,
      sellauth_url: p.sellauth_url || null, paypal_url: p.paypal_url || null, ltc_address: p.ltc_address || null,
      features: arr(p.features), youtube_url: p.youtube_url || null, discord_url: p.discord_url || null,
      tags: arr(p.tags), status: p.status, source_code: p.source_code || "",
      access_method: p.access_method, discord_redirect_url: p.discord_redirect_url || null,
    }));
  };

  const directCreate = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const payloadProducts = buildPayload();
      if (isAdmin) {
        let slug = slugify(storeName);
        for (let i = 1; i <= 50; i++) {
          const { data: ex } = await supabase.from("stores").select("id").eq("slug", slug).maybeSingle();
          if (!ex) break;
          slug = `${slugify(storeName)}-${i}`;
        }
        const { data: store, error: sErr } = await supabase.from("stores").insert({
          owner_id: user.id, name: storeName.trim(), slug, logo: storeLogo[0] ?? null,
        }).select().single();
        if (sErr || !store) throw sErr ?? new Error("Failed to create store");
        const rows = payloadProducts.map((p, idx) => ({
          store_id: store.id,
          name: p.name,
          slug: `${slugify(p.name)}-${slug}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          description: p.description || null,
          price: p.price,
          image: p.screenshots[0] ?? null,
          screenshots: p.screenshots,
          payment_method: p.payment_method as any,
          sellauth_url: p.sellauth_url, paypal_url: p.paypal_url, ltc_address: p.ltc_address,
          kind: p.kind, features: p.features, youtube_url: p.youtube_url, discord_url: p.discord_url,
          tags: p.tags, status: p.status, source_code: p.source_code,
          access_method: p.access_method, discord_redirect_url: p.discord_redirect_url,
        }));
        const { error: pErr } = await (supabase as any).from("store_products").insert(rows);
        if (pErr) throw pErr;
        return;
      }
      // Premium: use server fn (bypasses RLS via service role after premium check)
      await createPremiumStoreFn({ data: { store_name: storeName.trim(), store_logo: storeLogo[0] ?? null, products: payloadProducts } });
    },
    onSuccess: () => {
      toast.success("Store created!");
      setOpen(false); setStoreName(""); setStoreLogo([]); setProducts([blankProduct()]);
      qc.invalidateQueries({ queryKey: ["stores-public"] });
      qc.invalidateQueries({ queryKey: ["store-products-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const payloadProducts = buildPayload();
      const { error } = await supabase.from("store_requests").insert({
        user_id: user.id,
        store_name: storeName.trim(),
        store_logo: storeLogo[0] ?? null,
        products: payloadProducts,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store request sent! Admins will review it.");
      setOpen(false); setStoreName(""); setStoreLogo([]); setProducts([blankProduct()]);
      qc.invalidateQueries({ queryKey: ["stores-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateP = (i: number, patch: Partial<ReqProduct>) =>
    setProducts(products.map((p, idx) => idx === i ? { ...p, ...patch } : p));

  const busy = directCreate.isPending || submitRequest.isPending;


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white border-0" disabled={!user}>
          <Plus className="h-4 w-4 mr-1" /> {user ? (canCreateDirect ? "Create store" : "Request my store") : "Login to create a store"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>🛍️ Create your store</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Store name</Label>
            <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="My Awesome Store" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Store logo (image only)</Label>
            <MediaUploader value={storeLogo} onChange={setStoreLogo} accept="image/*" max={1} showCover={false} />
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Products</h4>
            {products.map((p, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Product #{i + 1}</span>
                  {products.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => setProducts(products.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={p.kind} onValueChange={v => updateP(i, { kind: v as ProductKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="script">Script</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Name" value={p.name} onChange={e => updateP(i, { name: e.target.value })} />
                <Textarea placeholder="Description" value={p.description} onChange={e => updateP(i, { description: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Price (USD)" value={p.price} onChange={e => updateP(i, { price: e.target.value })} />
                <div>
                  <Label className="text-xs text-muted-foreground">Showcase (max 5 — click a thumbnail to set cover)</Label>
                  <MediaUploader value={p.screenshots} onChange={urls => updateP(i, { screenshots: urls })} max={5} />
                </div>
                <Input placeholder="Tags (comma separated)" value={p.tags} onChange={e => updateP(i, { tags: e.target.value })} />
                <Input placeholder="Discord URL (optional)" value={p.discord_url} onChange={e => updateP(i, { discord_url: e.target.value })} />

                {p.kind === "script" ? (
                  <>
                    <Textarea placeholder="Features (one per line)" value={p.features} onChange={e => updateP(i, { features: e.target.value })} />
                    <Input placeholder="YouTube URL (optional)" value={p.youtube_url} onChange={e => updateP(i, { youtube_url: e.target.value })} />
                    <Select value={p.status} onValueChange={v => updateP(i, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="working">Working</SelectItem>
                        <SelectItem value="patched">Patched</SelectItem>
                        <SelectItem value="updating">Updating</SelectItem>
                      </SelectContent>
                    </Select>
                    
                  </>
                ) : (
                  <>
                    <Select value={p.status} onValueChange={v => updateP(i, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ready">Ready To Go</SelectItem>
                        <SelectItem value="needs_modification">Needs Modification</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={p.access_method} onValueChange={v => updateP(i, { access_method: v })}>
                      <SelectTrigger><SelectValue placeholder="Access method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="sellauth">SellAuth</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="ltc">LTC</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                      </SelectContent>
                    </Select>
                    {p.access_method === "discord" && <Input placeholder="Discord redirect URL" value={p.discord_redirect_url} onChange={e => updateP(i, { discord_redirect_url: e.target.value })} />}
                    
                  </>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Payment</Label>
                  <Select value={p.payment_method} onValueChange={v => updateP(i, { payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sellauth">SellAuth</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="ltc">LTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {p.payment_method === "sellauth" && <Input placeholder="SellAuth URL" value={p.sellauth_url} onChange={e => updateP(i, { sellauth_url: e.target.value })} />}
                {p.payment_method === "paypal" && <Input placeholder="PayPal URL" value={p.paypal_url} onChange={e => updateP(i, { paypal_url: e.target.value })} />}
                {p.payment_method === "ltc" && <Input placeholder="LTC address" value={p.ltc_address} onChange={e => updateP(i, { ltc_address: e.target.value })} />}
              </div>
            ))}
            <Button variant="outline" onClick={() => setProducts([...products, blankProduct()])} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add product
            </Button>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          {!isAdmin && (
            <Button
              className="gradient-primary text-white border-0"
              onClick={() => submitRequest.mutate()}
              disabled={busy}
            >
              {submitRequest.isPending ? "Sending…" : "Request store"}
            </Button>
          )}
          <Button
            className={canCreateDirect ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0" : ""}
            variant={canCreateDirect ? "default" : "outline"}
            onClick={() => directCreate.mutate()}
            disabled={busy || !canCreateDirect}
            title={!canCreateDirect ? "You need Premium to create a store instantly" : undefined}
          >
            <Crown className="h-4 w-4 mr-1" />
            {directCreate.isPending
              ? "Creating…"
              : canCreateDirect
                ? "Create store"
                : "Create store · You need Premium"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
