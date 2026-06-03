import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Play, Star } from "lucide-react";

function toArr(v: any): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  return String(v).split("\n").map(s => s.trim()).filter(Boolean);
}

export function isVideoUrl(u: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
}

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 10;

export function MediaUploader({
  value,
  onChange,
  accept = "image/*,video/*",
  max = 5,
  showCover = true,
}: {
  value: any;
  onChange: (urls: string[]) => void;
  accept?: string;
  max?: number;
  showCover?: boolean;
}) {
  const urls = toArr(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    // When max=1 we always replace. Otherwise we top up to max.
    const replaceMode = max === 1;
    const base = replaceMode ? [] : urls;
    const remaining = max - base.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} files allowed — remove one first`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    if (files.length > remaining) toast.warning(`Only ${remaining} more file(s) allowed`);
    setBusy(true);
    try {
      const next = [...base];
      for (const file of toUpload) {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `media/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_EXPIRY);
        if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
        next.push(signed.signedUrl);
      }
      onChange(next);
      toast.success(`Uploaded ${toUpload.length} file${toUpload.length > 1 ? "s" : ""}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));
  const setCover = (i: number) => {
    if (i === 0) return;
    const next = [urls[i], ...urls.filter((_, idx) => idx !== i)];
    onChange(next);
    toast.success("Set as cover");
  };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => upload(e.target.files)} />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy || (max > 1 && urls.length >= max)}>
          <Upload className="h-4 w-4 mr-1.5" /> {busy ? "Uploading…" : max === 1 && urls.length >= 1 ? "Replace" : `Upload (${urls.length}/${max})`}
        </Button>
        {showCover && urls.length > 1 && <span className="text-xs text-muted-foreground">Click a thumbnail to set as cover</span>}
      </div>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <div
              key={u + i}
              onClick={() => showCover && setCover(i)}
              title={showCover ? (i === 0 ? "Current cover" : "Click to set as cover") : ""}
              className={`relative group rounded border-2 ${i === 0 && showCover ? "border-primary" : "border-border"} ${showCover ? "cursor-pointer" : ""}`}
            >
              {isVideoUrl(u) ? (
                <div className="relative w-full h-24 rounded bg-secondary flex items-center justify-center overflow-hidden">
                  <video src={u} className="w-full h-24 object-cover" muted />
                  <Play className="absolute h-6 w-6 text-white drop-shadow" />
                </div>
              ) : (
                <img src={u} alt="" className="rounded w-full h-24 object-cover" />
              )}
              {i === 0 && showCover && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" /> COVER
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(i); }}
                title="Remove"
                className="absolute top-1 right-1 bg-black/70 rounded p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaShowcase({ urls, className = "" }: { urls: string[]; className?: string }) {
  if (!urls?.length) return null;
  return (
    <div className={`grid md:grid-cols-2 gap-3 ${className}`}>
      {urls.map((u, i) => isVideoUrl(u) ? (
        <video key={i} src={u} controls playsInline className="rounded-lg w-full" />
      ) : (
        <img key={i} src={u} alt="" className="rounded-lg w-full" />
      ))}
    </div>
  );
}
