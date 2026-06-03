export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item-" + Math.random().toString(36).slice(2, 8);
}

export function computeBadges(opts: {
  is_premium?: boolean; verified_by_nalyy?: boolean; created_at?: string; updated_at?: string; views?: number; likes?: number;
}): string[] {
  const out: string[] = [];
  if (opts.verified_by_nalyy) out.push("VERIFIED BY NALYY");
  if (opts.is_premium) out.push("PREMIUM");
  const now = Date.now();
  if (opts.created_at && now - new Date(opts.created_at).getTime() < 7 * 86400000) out.push("NEW");
  if (opts.updated_at && opts.created_at && opts.updated_at !== opts.created_at && now - new Date(opts.updated_at).getTime() < 3 * 86400000) out.push("UPDATED");
  if ((opts.views ?? 0) > 100 || (opts.likes ?? 0) > 20) out.push("HOT");
  return out;
}

export function badgeClass(b: string) {
  switch (b) {
    case "VERIFIED BY NALYY": return "bg-primary/20 text-primary border-primary/40";
    case "PREMIUM": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "NEW": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "UPDATED": return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "HOT": return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "WORKING": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "PATCHED": return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "UPDATING": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "READY TO GO": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "NEEDS MODIFICATION": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    default: return "bg-secondary text-secondary-foreground border-border";
  }
}

export function statusLabel(s: string) {
  return s.replace(/_/g, " ").toUpperCase();
}
