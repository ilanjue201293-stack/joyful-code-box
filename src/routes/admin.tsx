import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateAdminCode, revokeAdminCode, listUsers, setUserAdmin, setUserPremium, notifyContentChange, getAdminScriptSource, getAdminSourceCode, acceptStoreRequest, rejectStoreRequest, deleteStore, sendNotification, markBuyer, generatePremiumCode, revokePremiumCode } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/site-utils";
import { Trash2, Plus } from "lucide-react";
import { ScreenshotUploader } from "@/components/site/ScreenshotUploader";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  if (!isAdmin) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-1">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage everything from here. No hardcoding.</p>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="store-requests">Store Requests</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="codes">Admin Codes</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardPanel /></TabsContent>
        <TabsContent value="scripts"><ScriptsPanel /></TabsContent>
        <TabsContent value="sources"><SourcesPanel /></TabsContent>
        <TabsContent value="reviews"><ReviewsPanel /></TabsContent>
        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="store"><StorePanel /></TabsContent>
        <TabsContent value="store-requests"><StoreRequestsPanel /></TabsContent>
        <TabsContent value="notifications"><NotificationsPanel /></TabsContent>
        <TabsContent value="settings"><SettingsPanel /></TabsContent>
        <TabsContent value="codes"><CodesPanel /></TabsContent>
      </Tabs>

    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardPanel() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [s, src, r, u] = await Promise.all([
        supabase.from("scripts").select("id", { count: "exact", head: true }),
        supabase.from("sources").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { scripts: s.count ?? 0, sources: src.count ?? 0, reviews: r.count ?? 0, users: u.count ?? 0 };
    },
  });
  return (
    <div className="grid md:grid-cols-4 gap-4 mt-6">
      {Object.entries(data ?? {}).map(([k, v]) => (
        <div key={k} className="card-elevated p-6 text-center">
          <div className="text-3xl font-black gradient-text">{v as number}</div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{k}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Scripts ---------- */
function ScriptsPanel() {
  const qc = useQueryClient();
  const notify = useServerFn(notifyContentChange);
  const fetchAdminScriptSource = useServerFn(getAdminScriptSource);
  const { data: scripts } = useQuery({
    queryKey: ["admin-scripts"],
    queryFn: async () => (await supabase.from("scripts").select("id,name,slug,description,features,screenshots,youtube_url,discord_url,tags,status,is_premium,payment_method,sellauth_url,paypal_url,ltc_address,verified_by_nalyy,badges,views,developer,created_at,updated_at").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<any>(null);
  const blank = {
    name: "", description: "", features: "", screenshots: "", youtube_url: "", discord_url: "",
    tags: "", status: "working", source_code: "", is_premium: false, payment_method: "",
    sellauth_url: "", paypal_url: "", ltc_address: "", verified_by_nalyy: false, developer: "Nalyy",
  };

  const save = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name, description: form.description,
        features: arr(form.features), screenshots: arr(form.screenshots),
        youtube_url: form.youtube_url || null, discord_url: form.discord_url || null,
        tags: arr(form.tags), status: form.status, source_code: form.source_code,
        is_premium: form.is_premium,
        payment_method: form.payment_method || null,
        sellauth_url: form.sellauth_url || null, paypal_url: form.paypal_url || null, ltc_address: form.ltc_address || null,
        verified_by_nalyy: form.verified_by_nalyy, developer: form.developer || "Nalyy",
      };
      if (form.id) {
        const { error } = await supabase.from("scripts").update(payload).eq("id", form.id);
        if (error) throw error;
        return { slug: form.slug, action: "updated" as const, name: form.name };
      } else {
        const slug = slugify(form.name);
        const { error } = await supabase.from("scripts").insert({ ...payload, slug });
        if (error) throw error;
        return { slug, action: "created" as const, name: form.name };
      }
    },
    onSuccess: async (r) => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-scripts"] });
      try { await notify({ data: { kind: "script", slug: r.slug, name: r.name, action: r.action, is_premium: editing.is_premium } }); } catch {}
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("scripts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-scripts"] }); },
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Scripts ({scripts?.length ?? 0})</h2>
        <Button onClick={() => setEditing({ ...blank })} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" /> New script</Button>
      </div>
      {editing && (
        <div className="card-elevated p-6 space-y-3">
          <h3 className="font-semibold">{editing.id ? "Edit script" : "New script"}</h3>
          <Field label="Name"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
          <Field label="Features (one per line)"><Textarea value={Array.isArray(editing.features) ? editing.features.join("\n") : editing.features} onChange={e => setEditing({ ...editing, features: e.target.value })} /></Field>
          <Field label="Screenshots"><ScreenshotUploader value={editing.screenshots} onChange={urls => setEditing({ ...editing, screenshots: urls })} /></Field>
          <Field label="YouTube URL"><Input value={editing.youtube_url ?? ""} onChange={e => setEditing({ ...editing, youtube_url: e.target.value })} /></Field>
          <Field label="Discord URL"><Input value={editing.discord_url ?? ""} onChange={e => setEditing({ ...editing, discord_url: e.target.value })} /></Field>
          <Field label="Tags (comma separated)"><Input value={Array.isArray(editing.tags) ? editing.tags.join(", ") : editing.tags} onChange={e => setEditing({ ...editing, tags: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="working">Working</SelectItem><SelectItem value="patched">Patched</SelectItem><SelectItem value="updating">Updating</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Loader (script code)"><Textarea rows={8} value={editing.source_code} onChange={e => setEditing({ ...editing, source_code: e.target.value })} className="font-mono text-xs" /></Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><Switch checked={editing.is_premium} onCheckedChange={v => setEditing({ ...editing, is_premium: v })} />Paid</label>
            <label className="flex items-center gap-2"><Switch checked={editing.verified_by_nalyy} onCheckedChange={v => setEditing({ ...editing, verified_by_nalyy: v })} />Verified by Nalyy</label>
          </div>
          {editing.is_premium && (
            <>
              <Field label="Payment method">
                <Select value={editing.payment_method || ""} onValueChange={v => setEditing({ ...editing, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">💎 Premium (unlocked by Premium pass)</SelectItem>
                    <SelectItem value="sellauth">SellAuth</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="ltc">LTC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {editing.payment_method === "sellauth" && <Field label="SellAuth URL"><Input value={editing.sellauth_url ?? ""} onChange={e => setEditing({ ...editing, sellauth_url: e.target.value })} /></Field>}
              {editing.payment_method === "paypal" && <Field label="PayPal URL"><Input value={editing.paypal_url ?? ""} onChange={e => setEditing({ ...editing, paypal_url: e.target.value })} /></Field>}
              {editing.payment_method === "ltc" && <Field label="LTC address"><Input value={editing.ltc_address ?? ""} onChange={e => setEditing({ ...editing, ltc_address: e.target.value })} /></Field>}
            </>
          )}
          <div className="flex gap-2">
            <Button onClick={() => save.mutate(editing)} className="gradient-primary text-white border-0">Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="grid gap-2">
        {(scripts ?? []).map((s: any) => (
          <div key={s.id} className="card-elevated p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">/{s.slug} · {s.status} · {s.is_premium ? "paid" : "free"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                const sourceCode = await fetchAdminScriptSource({ data: { id: s.id } });
                setEditing({ ...s, source_code: sourceCode ?? "" });
              }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Sources ---------- */
function SourcesPanel() {
  const qc = useQueryClient();
  const notify = useServerFn(notifyContentChange);
  const fetchAdminSourceCode = useServerFn(getAdminSourceCode);
  const { data: items } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => (await supabase.from("sources").select("id,name,slug,description,screenshots,discord_url,tags,status,access_method,sellauth_url,paypal_url,ltc_address,discord_redirect_url,views,created_at,updated_at").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<any>(null);
  const blank = { name: "", description: "", screenshots: "", discord_url: "", tags: "", status: "ready", source_code: "", access_method: "free", sellauth_url: "", paypal_url: "", ltc_address: "", discord_redirect_url: "" };

  const save = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name, description: form.description,
        screenshots: arr(form.screenshots), discord_url: form.discord_url || null,
        tags: arr(form.tags), status: form.status, source_code: form.source_code,
        access_method: form.access_method,
        sellauth_url: form.sellauth_url || null, paypal_url: form.paypal_url || null,
        ltc_address: form.ltc_address || null, discord_redirect_url: form.discord_redirect_url || null,
      };
      if (form.id) { const { error } = await supabase.from("sources").update(payload).eq("id", form.id); if (error) throw error; return { slug: form.slug, action: "updated" as const, name: form.name }; }
      const slug = slugify(form.name);
      const { error } = await supabase.from("sources").insert({ ...payload, slug });
      if (error) throw error;
      return { slug, action: "created" as const, name: form.name };
    },
    onSuccess: async (r) => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-sources"] }); try { await notify({ data: { kind: "source", ...r, is_premium: editing?.access_method !== "free" } }); } catch {} },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sources").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-sources"] }); },
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sources ({items?.length ?? 0})</h2>
        <Button onClick={() => setEditing({ ...blank })} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />New source</Button>
      </div>
      {editing && (
        <div className="card-elevated p-6 space-y-3">
          <h3 className="font-semibold">{editing.id ? "Edit source" : "New source"}</h3>
          <Field label="Name"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
          <Field label="Screenshots"><ScreenshotUploader value={editing.screenshots} onChange={urls => setEditing({ ...editing, screenshots: urls })} /></Field>
          <Field label="Discord URL"><Input value={editing.discord_url ?? ""} onChange={e => setEditing({ ...editing, discord_url: e.target.value })} /></Field>
          <Field label="Tags (comma separated)"><Input value={Array.isArray(editing.tags) ? editing.tags.join(", ") : editing.tags} onChange={e => setEditing({ ...editing, tags: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ready">Ready To Go</SelectItem><SelectItem value="needs_modification">Needs Modification</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Source code"><Textarea rows={8} value={editing.source_code} onChange={e => setEditing({ ...editing, source_code: e.target.value })} className="font-mono text-xs" /></Field>
          <Field label="Access method">
            <Select value={editing.access_method} onValueChange={v => setEditing({ ...editing, access_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">💎 Premium (unlocked by Premium pass)</SelectItem>
                <SelectItem value="sellauth">SellAuth</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="ltc">LTC</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {editing.access_method === "sellauth" && <Field label="SellAuth URL"><Input value={editing.sellauth_url ?? ""} onChange={e => setEditing({ ...editing, sellauth_url: e.target.value })} /></Field>}
          {editing.access_method === "paypal" && <Field label="PayPal URL"><Input value={editing.paypal_url ?? ""} onChange={e => setEditing({ ...editing, paypal_url: e.target.value })} /></Field>}
          {editing.access_method === "ltc" && <Field label="LTC address"><Input value={editing.ltc_address ?? ""} onChange={e => setEditing({ ...editing, ltc_address: e.target.value })} /></Field>}
          {editing.access_method === "discord" && <Field label="Discord redirect URL"><Input value={editing.discord_redirect_url ?? ""} onChange={e => setEditing({ ...editing, discord_redirect_url: e.target.value })} /></Field>}
          <div className="flex gap-2">
            <Button onClick={() => save.mutate(editing)} className="gradient-primary text-white border-0">Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="grid gap-2">
        {(items ?? []).map((s: any) => (
          <div key={s.id} className="card-elevated p-4 flex items-center justify-between">
            <div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">/{s.slug} · {s.access_method}</div></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                const sourceCode = await fetchAdminSourceCode({ data: { id: s.id } });
                setEditing({ ...s, source_code: sourceCode ?? "" });
              }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Reviews ---------- */
function ReviewsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, scripts(name), profiles(username)").order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
  });
  return (
    <div className="mt-6 space-y-2">
      {(data ?? []).map((r: any) => (
        <div key={r.id} className="card-elevated p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">{r.profiles?.username ?? "user"} → {r.scripts?.name} · {r.rating}★</div>
            <div className="text-xs text-muted-foreground">{r.text}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Users ---------- */
function UsersPanel() {
  const list = useServerFn(listUsers);
  const setAdmin = useServerFn(setUserAdmin);
  const setPremium = useServerFn(setUserPremium);
  const mark = useServerFn(markBuyer);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const { data: products } = useQuery({ queryKey: ["admin-store-products-mini"], queryFn: async () => (await supabase.from("store_products").select("id,name").order("name")).data ?? [] });
  const { data: buyers } = useQuery({
    queryKey: ["product-buyers"],
    queryFn: async () => (await (supabase as any).from("product_buyers").select("product_id,user_id")).data ?? [],
  });
  const buyerSet = new Set((buyers ?? []).map((b: any) => `${b.product_id}:${b.user_id}`));
  const [opening, setOpening] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-2">
      {(data ?? []).map((u: any) => (
        <div key={u.id} className="card-elevated p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {u.username ?? u.id.slice(0, 8)}
                {u.is_premium && <span className="premium-badge">💎 Premium</span>}
              </div>
              <div className="text-xs text-muted-foreground">{u.is_admin ? "Admin" : "User"} · joined {new Date(u.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs">Admin
                <Switch checked={!!u.is_admin} onCheckedChange={async (v) => { await setAdmin({ data: { user_id: u.id, admin: v } }); qc.invalidateQueries({ queryKey: ["admin-users"] }); }} />
              </label>
              <label className="flex items-center gap-2 text-xs text-cyan-300">💎 Premium
                <Switch checked={!!u.is_premium} onCheckedChange={async (v) => { await setPremium({ data: { user_id: u.id, premium: v } }); qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success(v ? "Premium granted" : "Premium revoked"); }} />
              </label>
              <Button size="sm" variant="outline" onClick={() => setOpening(opening === u.id ? null : u.id)}>Verified buys</Button>
            </div>
          </div>
          {opening === u.id && (
            <div className="mt-3 border-t border-border pt-3 grid md:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
              {(products ?? []).map((p: any) => {
                const key = `${p.id}:${u.id}`;
                const checked = buyerSet.has(key);
                return (
                  <label key={p.id} className="flex items-center gap-2 text-xs px-2 py-1 hover:bg-secondary/30 rounded cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={async (e) => {
                      await mark({ data: { product_id: p.id, user_id: u.id, verified: e.target.checked } });
                      qc.invalidateQueries({ queryKey: ["product-buyers"] });
                    }} />
                    <span className="truncate">{p.name}</span>
                  </label>
                );
              })}
              {(products ?? []).length === 0 && <span className="text-xs text-muted-foreground">No products yet</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Store ---------- */
function StorePanel() {
  const qc = useQueryClient();
  const delStoreFn = useServerFn(deleteStore);
  const { data } = useQuery({ queryKey: ["admin-store"], queryFn: async () => (await supabase.from("store_products").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: stores } = useQuery({ queryKey: ["admin-stores"], queryFn: async () => (await supabase.from("stores").select("*, profiles(username)").order("created_at", { ascending: false })).data ?? [] });
  const [editing, setEditing] = useState<any>(null);
  const blank = { name: "", description: "", price: 0, screenshots: [] as string[], payment_method: "sellauth", sellauth_url: "", paypal_url: "", ltc_address: "" };
  const save = useMutation({
    mutationFn: async (f: any) => {
      const screenshots: string[] = Array.isArray(f.screenshots) ? f.screenshots.filter(Boolean) : [];
      const payload: any = {
        name: f.name, description: f.description, price: Number(f.price),
        image: screenshots[0] ?? null,
        screenshots,
        payment_method: f.payment_method,
        sellauth_url: f.sellauth_url || null, paypal_url: f.paypal_url || null, ltc_address: f.ltc_address || null,
      };
      if (f.id) { const { error } = await supabase.from("store_products").update(payload).eq("id", f.id); if (error) throw error; }
      else {
        const slug = `${slugify(f.name || "product")}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("store_products").insert({ ...payload, slug });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-store"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("store_products").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-store"] }) });
  const delStore = async (id: string, name: string) => {
    if (!confirm(`Delete entire store "${name}" and all its products?`)) return;
    try { await delStoreFn({ data: { id } }); toast.success("Store deleted"); qc.invalidateQueries({ queryKey: ["admin-stores"] }); qc.invalidateQueries({ queryKey: ["admin-store"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Stores ({stores?.length ?? 0})</h2>
        {(stores ?? []).map((s: any) => (
          <div key={s.id} className="card-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {s.logo && <img src={s.logo} alt="" className="h-10 w-10 rounded object-cover border border-border" />}
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">by {s.profiles?.username ?? s.owner_id.slice(0, 8)} · /{s.slug}</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => delStore(s.id, s.name)}><Trash2 className="h-4 w-4 mr-1" />Delete store</Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Products ({data?.length ?? 0})</h2>
          <Button onClick={() => setEditing({ ...blank })} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />New product</Button>
        </div>
        {editing && (
          <div className="card-elevated p-6 space-y-3">
            <Field label="Name"><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label="Price (USD)"><Input type="number" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} /></Field>
            <Field label="Showcase (max 5 — click thumbnail to set cover)">
              <ScreenshotUploader value={editing.screenshots ?? (editing.image ? [editing.image] : [])} onChange={urls => setEditing({ ...editing, screenshots: urls })} />
            </Field>
            <Field label="Payment method">
              <Select value={editing.payment_method} onValueChange={v => setEditing({ ...editing, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sellauth">SellAuth</SelectItem><SelectItem value="paypal">PayPal</SelectItem><SelectItem value="ltc">LTC</SelectItem></SelectContent>
              </Select>
            </Field>
            {editing.payment_method === "sellauth" && <Field label="SellAuth URL"><Input value={editing.sellauth_url ?? ""} onChange={e => setEditing({ ...editing, sellauth_url: e.target.value })} /></Field>}
            {editing.payment_method === "paypal" && <Field label="PayPal URL"><Input value={editing.paypal_url ?? ""} onChange={e => setEditing({ ...editing, paypal_url: e.target.value })} /></Field>}
            {editing.payment_method === "ltc" && <Field label="LTC address"><Input value={editing.ltc_address ?? ""} onChange={e => setEditing({ ...editing, ltc_address: e.target.value })} /></Field>}
            <div className="flex gap-2"><Button onClick={() => save.mutate(editing)} className="gradient-primary text-white border-0">Save</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
          </div>
        )}
        {(data ?? []).map((p: any) => (
          <div key={p.id} className="card-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(p.screenshots?.[0] || p.image) && <img src={p.screenshots?.[0] || p.image} alt="" className="h-12 w-12 rounded object-cover border border-border" />}
              <div><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)} · {p.payment_method} · /{p.slug}</div></div>
            </div>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing({ ...p, screenshots: p.screenshots?.length ? p.screenshots : (p.image ? [p.image] : []) })}>Edit</Button><Button size="sm" variant="outline" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Store Requests ---------- */
function StoreRequestsPanel() {
  const qc = useQueryClient();
  const accept = useServerFn(acceptStoreRequest);
  const reject = useServerFn(rejectStoreRequest);
  const { data } = useQuery({
    queryKey: ["store-requests"],
    queryFn: async () => (await supabase.from("store_requests").select("*, profiles(username)").order("created_at", { ascending: false })).data ?? [],
  });
  const [selections, setSelections] = useState<Record<string, Set<number>>>({});

  const toggle = (rid: string, idx: number, total: number) => {
    setSelections(prev => {
      const cur = new Set(prev[rid] ?? new Set(Array.from({ length: total }, (_, i) => i)));
      if (cur.has(idx)) cur.delete(idx); else cur.add(idx);
      return { ...prev, [rid]: cur };
    });
  };

  const doAccept = async (r: any) => {
    const all = (r.products ?? []).map((_: any, i: number) => i);
    const sel = selections[r.id] ? Array.from(selections[r.id]) : all;
    if (!sel.length) { toast.error("Select at least one product"); return; }
    try {
      await accept({ data: { id: r.id, product_indexes: sel } });
      toast.success(`Accepted ${sel.length}/${all.length} products`);
      qc.invalidateQueries({ queryKey: ["store-requests"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const doReject = async (id: string) => {
    try { await reject({ data: { id } }); toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["store-requests"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mt-6 space-y-3">
      {(data ?? []).length === 0 && <div className="card-elevated p-10 text-center text-muted-foreground">No store requests.</div>}
      {(data ?? []).map((r: any) => {
        const products = r.products ?? [];
        const selected = selections[r.id] ?? new Set(products.map((_: any, i: number) => i));
        return (
          <div key={r.id} className="card-elevated p-5">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3">
                {r.store_logo && <img src={r.store_logo} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />}
                <div>
                  <div className="font-semibold">{r.store_name}</div>
                  <div className="text-xs text-muted-foreground">by {r.profiles?.username ?? r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()} · <span className="uppercase">{r.status}</span></div>
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-primary text-white border-0" onClick={() => doAccept(r)}>Accept selected ({selected.size}/{products.length})</Button>
                  <Button size="sm" variant="outline" onClick={() => doReject(r.id)}>Reject all</Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {products.map((p: any, i: number) => {
                const cover = Array.isArray(p.screenshots) && p.screenshots.length ? p.screenshots[0] : p.image;
                const checked = selected.has(i);
                return (
                  <div key={i} className={`border rounded p-3 text-sm flex gap-3 ${checked ? "border-primary/60" : "border-border"}`}>
                    {r.status === "pending" && (
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.id, i, products.length)} className="mt-1" />
                    )}
                    {cover && <img src={cover} alt="" className="h-20 w-20 rounded object-cover border border-border flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-primary">${Number(p.price).toFixed(2)}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-secondary border border-border">{p.kind ?? "script"}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{p.payment_method}</span>
                        {p.status && <span className="text-[10px] uppercase text-muted-foreground">· {p.status}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{p.description}</div>
                      {Array.isArray(p.features) && p.features.length > 0 && (
                        <div className="text-xs mt-1"><b>Features:</b> {p.features.join(", ")}</div>
                      )}
                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <div className="text-xs mt-1"><b>Tags:</b> {p.tags.join(", ")}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1">{Array.isArray(p.screenshots) ? p.screenshots.length : (p.image ? 1 : 0)} media</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Notifications (admin send) ---------- */
function NotificationsPanel() {
  const send = useServerFn(sendNotification);
  const { data: users } = useQuery({
    queryKey: ["all-users-mini"],
    queryFn: async () => (await supabase.from("profiles").select("id,username").order("username")).data ?? [],
  });
  const [scope, setScope] = useState<"all" | "admins" | "users">("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [search, setSearch] = useState("");

  const toggleUser = (id: string) => {
    setSelectedUsers(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title required");
    if (scope === "users" && selectedUsers.size === 0) return toast.error("Select at least one user");
    try {
      const r = await send({ data: { scope, user_ids: scope === "users" ? Array.from(selectedUsers) : undefined, title, body: body || undefined, link: link || undefined } });
      toast.success(`Sent to ${r.count} user(s)`);
      setTitle(""); setBody(""); setLink(""); setSelectedUsers(new Set());
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredUsers = (users ?? []).filter((u: any) => !search || (u.username ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mt-6 card-elevated p-6 space-y-3 max-w-2xl">
      <h2 className="font-semibold">Send a notification</h2>
      <Field label="Scope">
        <Select value={scope} onValueChange={v => setScope(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="admins">All admins only</SelectItem>
            <SelectItem value="users">Specific users</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {scope === "users" && (
        <Field label={`Pick users (${selectedUsers.size} selected)`}>
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
          <div className="border border-border rounded max-h-48 overflow-y-auto">
            {filteredUsers.map((u: any) => (
              <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)} />
                <span>{u.username ?? u.id.slice(0, 8)}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
      <Field label="Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Body (optional)"><Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} /></Field>
      <Field label="Link (optional, e.g. /scripts/foo)"><Input value={link} onChange={e => setLink(e.target.value)} /></Field>
      <Button onClick={submit} className="gradient-primary text-white border-0">Send notification</Button>
    </div>
  );
}



/* ---------- Settings ---------- */
function SettingsPanel() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data });
  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (isLoading || form) return;
    setForm(settings ?? { id: 1, discord_url: "", webhook_url: "", default_ltc_address: "", premium_price: 5, premium_paypal_url: "", premium_ltc_address: "" });
  }, [settings, isLoading, form]);
  const save = async () => {
    const payload = {
      discord_url: form.discord_url,
      webhook_url: form.webhook_url,
      default_ltc_address: form.default_ltc_address,
      premium_price: Number(form.premium_price) || 5,
      premium_paypal_url: form.premium_paypal_url || null,
      premium_ltc_address: form.premium_ltc_address || null,
    } as any;
    // upsert in case row was missing
    const { error } = await supabase.from("site_settings").upsert({ id: 1, ...payload });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["settings"] }); qc.invalidateQueries({ queryKey: ["public-settings"] }); }
  };
  if (!form) return <div className="mt-6">Loading…</div>;
  return (
    <div className="mt-6 card-elevated p-6 space-y-3 max-w-2xl">
      <Field label="Discord URL"><Input value={form.discord_url ?? ""} onChange={e => setForm({ ...form, discord_url: e.target.value })} /></Field>
      <Field label="Discord webhook URL (for notifications)"><Input value={form.webhook_url ?? ""} onChange={e => setForm({ ...form, webhook_url: e.target.value })} /></Field>
      <Field label="Default LTC address"><Input value={form.default_ltc_address ?? ""} onChange={e => setForm({ ...form, default_ltc_address: e.target.value })} /></Field>

      <div className="border-t border-cyan-400/20 pt-4 mt-4">
        <h3 className="font-bold text-cyan-300 mb-3 flex items-center gap-2">💎 Premium Pass Settings</h3>
        <div className="space-y-3">
          <Field label="Premium price (EUR)"><Input type="number" step="0.01" value={form.premium_price ?? 5} onChange={e => setForm({ ...form, premium_price: e.target.value })} /></Field>
          <Field label="Premium PayPal URL (paypal.me link)"><Input placeholder="https://paypal.me/yourhandle/5" value={form.premium_paypal_url ?? ""} onChange={e => setForm({ ...form, premium_paypal_url: e.target.value })} /></Field>
          <Field label="Premium LTC address"><Input value={form.premium_ltc_address ?? ""} onChange={e => setForm({ ...form, premium_ltc_address: e.target.value })} /></Field>
        </div>
      </div>

      <Button onClick={save} className="gradient-primary text-white border-0">Save</Button>
    </div>
  );
}

/* ---------- Codes ---------- */
function CodesPanel() {
  const gen = useServerFn(generateAdminCode);
  const rev = useServerFn(revokeAdminCode);
  const genPrem = useServerFn(generatePremiumCode);
  const revPrem = useServerFn(revokePremiumCode);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-codes"], queryFn: async () => (await supabase.from("admin_codes").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: premCodes } = useQuery({ queryKey: ["premium-codes"], queryFn: async () => (await (supabase as any).from("premium_codes").select("*").order("created_at", { ascending: false })).data ?? [] });

  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success("Copied"); };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Admin codes</h2>
          <Button className="gradient-primary text-white border-0" onClick={async () => { await gen(); qc.invalidateQueries({ queryKey: ["admin-codes"] }); toast.success("Code generated"); }}>
            <Plus className="h-4 w-4 mr-1" />Generate admin code
          </Button>
        </div>
        {(data ?? []).map((c: any) => (
          <div key={c.id} className="card-elevated p-4 flex items-center justify-between">
            <div>
              <code className="font-mono text-sm cursor-pointer hover:text-primary" onClick={() => copy(c.code)}>{c.code}</code>
              <div className="text-xs text-muted-foreground">{c.revoked ? "Revoked" : c.used_by ? "Used" : "Available"} · {new Date(c.created_at).toLocaleString()}</div>
            </div>
            {!c.revoked && !c.used_by && (
              <Button size="sm" variant="outline" onClick={async () => { await rev({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["admin-codes"] }); }}>Revoke</Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-cyan-400/20 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-cyan-300 flex items-center gap-2">💎 Premium gift codes</h2>
          <Button className="gradient-primary text-white border-0" onClick={async () => { await genPrem(); qc.invalidateQueries({ queryKey: ["premium-codes"] }); toast.success("Premium code generated"); }}>
            <Plus className="h-4 w-4 mr-1" />Gift Premium
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Generate a code and share it with the recipient. They redeem it on the Premium page to instantly unlock Premium.</p>
        {(premCodes ?? []).map((c: any) => (
          <div key={c.id} className="card-elevated p-4 flex items-center justify-between">
            <div>
              <code className="font-mono text-sm text-cyan-300 cursor-pointer hover:text-white" onClick={() => copy(c.code)}>{c.code}</code>
              <div className="text-xs text-muted-foreground">{c.revoked ? "Revoked" : c.used_by ? `Used by ${String(c.used_by).slice(0, 8)}` : "Available"} · {new Date(c.created_at).toLocaleString()}</div>
            </div>
            {!c.revoked && !c.used_by && (
              <Button size="sm" variant="outline" onClick={async () => { await revPrem({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["premium-codes"] }); }}>Revoke</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function arr(v: any): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  return String(v).split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}
