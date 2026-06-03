import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

async function sendWebhook(title: string, description: string, url: string) {
  const { data } = await supabaseAdmin.from("site_settings").select("webhook_url").eq("id", 1).maybeSingle();
  if (!data?.webhook_url) return;
  try {
    await fetch(data.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [{ title, description, url, color: 9442047 }] }),
    });
  } catch (e) { console.error("webhook failed", e); }
}

const PREF_FIELDS = ["free_script","paid_script","free_source","paid_source","new_store"] as const;
type PrefKind = typeof PREF_FIELDS[number];
const FORCED_KINDS = new Set(["admin_only","store_approved"]);

async function insertNotifications(recipients: string[], title: string, body: string | null, link: string | null, kind: string) {
  if (!recipients.length) return;
  // Respect preferences when applicable
  let filtered = recipients;
  if (PREF_FIELDS.includes(kind as PrefKind)) {
    const { data: prefs } = await supabaseAdmin.from("notification_preferences" as any).select("user_id," + kind).in("user_id", recipients);
    const optedOut = new Set((prefs ?? []).filter((p: any) => p[kind] === false).map((p: any) => p.user_id));
    filtered = recipients.filter(r => !optedOut.has(r));
  }
  if (!filtered.length) return;
  const rows = filtered.map(r => ({ recipient_id: r, title, body, link, kind }));
  await (supabaseAdmin as any).from("notifications").insert(rows);
}

async function getAllUserIds(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("profiles").select("id");
  return (data ?? []).map((d: any) => d.id);
}
async function getAdminIds(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((d: any) => d.user_id);
}

/* ---------------- VIEWS ---------------- */
export const incrementScriptViews = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin.from("scripts").select("views").eq("id", data.id).maybeSingle();
    if (row) await supabaseAdmin.from("scripts").update({ views: (row.views ?? 0) + 1 }).eq("id", data.id);
    return { ok: true };
  });

export const incrementSourceViews = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin.from("sources").select("views").eq("id", data.id).maybeSingle();
    if (row) await supabaseAdmin.from("sources").update({ views: (row.views ?? 0) + 1 }).eq("id", data.id);
    return { ok: true };
  });


export const getScriptSource = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; userId?: string }) => z.object({ id: z.string().uuid(), userId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { data: script, error } = await supabaseAdmin.from("scripts").select("source_code,is_premium").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!script?.is_premium) return script?.source_code ?? "";
    if (data.userId) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("is_premium").eq("id", data.userId).maybeSingle();
      if ((prof as any)?.is_premium) return script.source_code ?? "";
    }
    return "";
  });

export const getSourceCode = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; userId?: string }) => z.object({ id: z.string().uuid(), userId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { data: source, error } = await supabaseAdmin.from("sources").select("source_code,access_method").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (source?.access_method === "free") return source?.source_code ?? "";
    // Premium pass unlocks "premium" sources AND all other paid access methods
    if (data.userId) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("is_premium").eq("id", data.userId).maybeSingle();
      if ((prof as any)?.is_premium) return source?.source_code ?? "";
    }
    return "";
  });

/* ---------------- ADMIN CODES ---------------- */
export const redeemAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: code } = await supabaseAdmin.from("admin_codes").select("*").eq("code", data.code).maybeSingle();
    if (!code) throw new Error("Invalid code");
    if (code.revoked) throw new Error("Code revoked");
    if (code.used_by) throw new Error("Code already used");
    await supabaseAdmin.from("admin_codes").update({ used_by: userId, used_at: new Date().toISOString() }).eq("id", code.id);
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const generateAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const code = "SAB-" + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");
    const { data, error } = await supabaseAdmin.from("admin_codes").insert({ code, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  });

export const revokeAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("admin_codes").update({ revoked: true }).eq("id", data.id);
    return { ok: true };
  });

/* ---------------- PREMIUM GIFT CODES ---------------- */
export const generatePremiumCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const code = "PREM-" + Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");
    const { data, error } = await (supabaseAdmin as any).from("premium_codes").insert({ code, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  });

export const revokePremiumCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await (supabaseAdmin as any).from("premium_codes").update({ revoked: true }).eq("id", data.id);
    return { ok: true };
  });

export const redeemPremiumCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await (supabaseAdmin as any).from("premium_codes").select("*").eq("code", data.code).maybeSingle();
    if (!row) throw new Error("Invalid code");
    if (row.revoked) throw new Error("Code revoked");
    if (row.used_by) throw new Error("Code already used");
    await (supabaseAdmin as any).from("premium_codes").update({ used_by: userId, used_at: new Date().toISOString() }).eq("id", row.id);
    await supabaseAdmin.from("profiles").update({ is_premium: true, premium_since: new Date().toISOString() } as any).eq("id", userId);
    await (supabaseAdmin as any).from("notifications").insert({
      recipient_id: userId,
      title: "💎 Welcome to Premium!",
      body: "Your Premium pass is now active. Enjoy all paid scripts & sources, a free store with unlimited products, pinned reviews, and more.",
      link: "/premium",
      kind: "admin_only",
    });
    return { ok: true };
  });

/* ---------------- USERS ---------------- */
export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; admin: boolean }) => z.object({ user_id: z.string().uuid(), admin: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    }
    return { ok: true };
  });

export const setUserPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; premium: boolean }) => z.object({ user_id: z.string().uuid(), premium: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("profiles").update({ is_premium: data.premium, premium_since: data.premium ? new Date().toISOString() : null } as any).eq("id", data.user_id);
    if (data.premium) {
      await (supabaseAdmin as any).from("notifications").insert({
        recipient_id: data.user_id,
        title: "💎 Welcome to Premium!",
        body: "Your Premium pass is now active. Enjoy all paid scripts & sources, a free store with unlimited products, pinned reviews, and more.",
        link: "/premium",
        kind: "admin_only",
      });
    }
    return { ok: true };
  });

export const requestPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { method: "paypal" | "ltc"; gift?: boolean }) => z.object({ method: z.enum(["paypal", "ltc"]), gift: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin.from("profiles").select("username").eq("id", context.userId).maybeSingle();
    const uname = (prof as any)?.username ?? context.userId.slice(0, 8);
    const tag = data.gift ? "🎁 Premium GIFT request" : "💎 Premium request";
    const body = data.gift
      ? `User ${uname} (${context.userId}) wants to BUY a Premium GIFT CODE via **${data.method.toUpperCase()}**. Verify payment, then generate a code in Admin → Premium gift codes and send it to them.`
      : `User ${uname} (${context.userId}) wants to buy Premium via **${data.method.toUpperCase()}**. Verify payment and grant access from the Admin → Users panel.`;
    await sendWebhook(`${tag} from ${uname}`, body, "/admin");
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (admins ?? []).map((a: any) => a.user_id);
    if (ids.length) {
      await (supabaseAdmin as any).from("notifications").insert(ids.map((id: string) => ({
        recipient_id: id,
        title: data.gift ? "🎁 New Premium GIFT request" : "💎 New Premium request",
        body: data.gift ? `${uname} wants a Premium gift code via ${data.method.toUpperCase()}.` : `${uname} wants Premium via ${data.method.toUpperCase()}.`,
        link: "/admin",
        kind: "admin_only",
      })));
    }
    return { ok: true };
  });

export const requestPremiumManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { method: string; username: string; note?: string; gift?: boolean }) => z.object({
    method: z.string().min(1).max(50),
    username: z.string().min(1).max(80),
    note: z.string().max(500).optional(),
    gift: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin.from("profiles").select("username").eq("id", context.userId).maybeSingle();
    const uname = (prof as any)?.username ?? context.userId.slice(0, 8);
    const tag = data.gift ? "🆘 Manual Premium GIFT claim" : "🆘 Manual Premium claim";
    const body = `User **${uname}** (${context.userId}) says they paid but did not get ${data.gift ? "their gift code" : "Premium"}.\n\n**Payment method:** ${data.method}\n**Payment username/handle:** ${data.username}${data.note ? `\n**Note:** ${data.note}` : ""}\n\nCheck your ${data.method} account for a payment from this user, then grant Premium${data.gift ? " / generate a gift code" : ""} manually.`;
    await sendWebhook(tag, body, "/admin");
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (admins ?? []).map((a: any) => a.user_id);
    if (ids.length) {
      await (supabaseAdmin as any).from("notifications").insert(ids.map((id: string) => ({
        recipient_id: id,
        title: tag,
        body: `${uname} paid via ${data.method} as "${data.username}" but didn't get ${data.gift ? "a gift code" : "Premium"} — please verify.`,
        link: "/admin",
        kind: "admin_only",
      })));
    }
    return { ok: true };
  });

export const createPremiumStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { store_name: string; store_logo: string | null; products: any[] }) =>
    z.object({
      store_name: z.string().min(1).max(100),
      store_logo: z.string().nullable(),
      products: z.array(z.any()).min(1),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin.from("profiles").select("is_premium,username").eq("id", context.userId).maybeSingle();
    const isAdminRow = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!(prof as any)?.is_premium && !isAdminRow.data) throw new Error("Premium required");

    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "store";
    let slug = slugify(data.store_name);
    for (let i = 1; i <= 50; i++) {
      const { data: ex } = await supabaseAdmin.from("stores").select("id").eq("slug", slug).maybeSingle();
      if (!ex) break;
      slug = `${slugify(data.store_name)}-${i}`;
    }
    const { data: store, error: sErr } = await supabaseAdmin.from("stores").insert({
      owner_id: context.userId, name: data.store_name.trim(), slug, logo: data.store_logo,
    }).select().single();
    if (sErr || !store) throw sErr ?? new Error("Failed to create store");

    const rows = data.products.map((p: any, idx: number) => ({
      store_id: store.id,
      name: p.name,
      slug: `${slugify(p.name)}-${slug}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      description: p.description || null,
      price: Number(p.price) || 0,
      image: (p.screenshots?.[0]) ?? null,
      screenshots: p.screenshots ?? [],
      payment_method: p.payment_method,
      sellauth_url: p.sellauth_url || null,
      paypal_url: p.paypal_url || null,
      ltc_address: p.ltc_address || null,
      kind: p.kind || "script",
      features: p.features ?? [],
      youtube_url: p.youtube_url || null,
      discord_url: p.discord_url || null,
      tags: p.tags ?? [],
      status: p.status,
      source_code: p.source_code || "",
      access_method: p.access_method || null,
      discord_redirect_url: p.discord_redirect_url || null,
    }));
    const { error: pErr } = await (supabaseAdmin as any).from("store_products").insert(rows);
    if (pErr) throw pErr;
    return { ok: true, slug };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, username, avatar_url, created_at, is_premium").order("created_at", { ascending: false }).limit(500);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const adminIds = new Set((roles ?? []).filter(r => r.role === "admin").map(r => r.user_id));
    return (profiles ?? []).map((p: any) => ({ ...p, is_admin: adminIds.has(p.id) }));
  });

/* ---------------- WEBHOOK + NOTIFICATIONS ON CONTENT CHANGES ---------------- */
export const notifyContentChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "script" | "source"; slug: string; name: string; action: "created" | "updated"; is_premium?: boolean }) =>
    z.object({ kind: z.enum(["script", "source"]), slug: z.string(), name: z.string(), action: z.enum(["created", "updated"]), is_premium: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const title = `${data.kind === "script" ? "Script" : "Source"} ${data.action}: ${data.name}`;
    const path = data.kind === "script" ? `/scripts/${data.slug}` : `/sources/${data.slug}`;
    await sendWebhook(title, `A ${data.kind} was ${data.action} on SAB Scripting.`, path);
    if (data.action === "created") {
      const notifKind = data.kind === "script" ? (data.is_premium ? "paid_script" : "free_script") : (data.is_premium ? "paid_source" : "free_source");
      const users = await getAllUserIds();
      await insertNotifications(users, title, `Check it out now!`, path, notifKind);
    }
    return { ok: true };
  });

export const getAdminScriptSource = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: script, error } = await supabaseAdmin.from("scripts").select("source_code").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return script?.source_code ?? "";
  });

export const getAdminSourceCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: source, error } = await supabaseAdmin.from("sources").select("source_code").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return source?.source_code ?? "";
  });

/* ---------------- STORE REQUESTS ---------------- */
function slugifyName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "store";
}

function buildProductRow(store_id: string, storeSlug: string, p: any, idx: number) {
  const screenshots: string[] = Array.isArray(p.screenshots) ? p.screenshots.filter(Boolean) : (p.image ? [p.image] : []);
  const baseSlug = slugifyName(String(p.name ?? "product"));
  const kind = p.kind === "source" ? "source" : "script";
  return {
    store_id,
    name: String(p.name ?? "Product"),
    slug: `${baseSlug}-${storeSlug}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    description: p.description ?? null,
    price: Number(p.price ?? 0),
    image: screenshots[0] ?? null,
    screenshots,
    payment_method: (p.payment_method ?? "sellauth") as any,
    sellauth_url: p.sellauth_url ?? null,
    paypal_url: p.paypal_url ?? null,
    ltc_address: p.ltc_address ?? null,
    kind,
    features: Array.isArray(p.features) ? p.features : [],
    youtube_url: p.youtube_url ?? null,
    discord_url: p.discord_url ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    status: p.status ?? (kind === "script" ? "working" : "ready"),
    access_method: p.access_method ?? null,
    discord_redirect_url: p.discord_redirect_url ?? null,
    source_code: p.source_code ?? "",
  };
}

export const acceptStoreRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; product_indexes?: number[] }) => z.object({ id: z.string().uuid(), product_indexes: z.array(z.number().int().min(0)).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: req, error } = await supabaseAdmin.from("store_requests").select("*").eq("id", data.id).maybeSingle();
    if (error || !req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Already reviewed");

    let slug = slugifyName(req.store_name);
    for (let i = 1; ; i++) {
      const { data: ex } = await supabaseAdmin.from("stores").select("id").eq("slug", slug).maybeSingle();
      if (!ex) break;
      slug = `${slugifyName(req.store_name)}-${i}`;
      if (i > 50) throw new Error("Could not generate slug");
    }
    const { data: store, error: sErr } = await supabaseAdmin.from("stores").insert({
      owner_id: req.user_id, name: req.store_name, slug, logo: req.store_logo,
    }).select().single();
    if (sErr || !store) throw new Error(sErr?.message ?? "Store create failed");

    const allProducts = Array.isArray(req.products) ? req.products : [];
    const products = data.product_indexes && data.product_indexes.length
      ? data.product_indexes.map(i => allProducts[i]).filter(Boolean)
      : allProducts;
    if (products.length) {
      const rows = products.map((p: any, idx: number) => buildProductRow(store.id, store.slug, p, idx));
      const { error: pErr } = await supabaseAdmin.from("store_products").insert(rows);
      if (pErr) throw new Error(pErr.message);
    }

    await supabaseAdmin.from("store_requests").update({ status: "accepted", reviewed_at: new Date().toISOString() }).eq("id", data.id);
    // Notify owner store approved
    await insertNotifications([req.user_id], `Your store "${req.store_name}" was approved!`, "View your store on the store page.", `/store`, "store_approved");
    // Notify everyone of new store
    const users = await getAllUserIds();
    await insertNotifications(users.filter(u => u !== req.user_id), `New store: ${req.store_name}`, "A new store just opened!", `/store`, "new_store");
    return { ok: true, store_id: store.id };
  });

// Backwards alias kept for any old call sites
export const approveStoreRequest = acceptStoreRequest;

export const rejectStoreRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("store_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const deleteStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("store_products").delete().eq("store_id", data.id);
    await supabaseAdmin.from("stores").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------- NOTIFICATIONS (admin send) ---------------- */
export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    scope: z.enum(["all", "admins", "users"]),
    user_ids: z.array(z.string().uuid()).optional(),
    title: z.string().min(1).max(200),
    body: z.string().max(2000).optional(),
    link: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let recipients: string[] = [];
    if (data.scope === "all") recipients = await getAllUserIds();
    else if (data.scope === "admins") recipients = await getAdminIds();
    else recipients = data.user_ids ?? [];
    const kind = data.scope === "admins" ? "admin_only" : "admin_broadcast";
    // Forced kinds bypass prefs (admin_only) — admin_broadcast also bypasses since it's a direct message
    if (FORCED_KINDS.has(kind) || kind === "admin_broadcast") {
      if (!recipients.length) return { ok: true, count: 0 };
      const rows = recipients.map(r => ({ recipient_id: r, title: data.title, body: data.body ?? null, link: data.link ?? null, kind }));
      await (supabaseAdmin as any).from("notifications").insert(rows);
    } else {
      await insertNotifications(recipients, data.title, data.body ?? null, data.link ?? null, kind);
    }
    return { ok: true, count: recipients.length };
  });

/* ---------------- BUYERS ---------------- */
export const markBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { product_id: string; user_id: string; verified: boolean }) =>
    z.object({ product_id: z.string().uuid(), user_id: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.verified) {
      await (supabaseAdmin as any).from("product_buyers").upsert(
        { product_id: data.product_id, user_id: data.user_id, approved_by: context.userId },
        { onConflict: "product_id,user_id" }
      );
    } else {
      await (supabaseAdmin as any).from("product_buyers").delete().eq("product_id", data.product_id).eq("user_id", data.user_id);
    }
    return { ok: true };
  });
