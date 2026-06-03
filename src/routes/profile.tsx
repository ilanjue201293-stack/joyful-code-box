import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { redeemAdminCode } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/site/MediaUploader";
import { toast } from "sonner";
import { Shield, Bell } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const PREF_LABELS: { key: string; label: string }[] = [
  { key: "free_script", label: "New free script" },
  { key: "paid_script", label: "New paid script" },
  { key: "free_source", label: "New free source" },
  { key: "paid_source", label: "New paid source" },
  { key: "new_store", label: "New store" },
];

function ProfilePage() {
  const { user, isAdmin, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [pw, setPw] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const redeem = useServerFn(redeemAdminCode);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    if (profile && prefs) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? { id: user.id }));
    (supabase as any).from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }: any) =>
      setPrefs(data ?? { user_id: user.id, free_script: true, paid_script: true, free_source: true, paid_source: true, new_store: true }));
  }, [user?.id, profile, prefs]);

  if (!user || !profile) return <div className="container mx-auto p-10">Loading…</div>;

  const save = async () => {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: profile.username, bio: profile.bio, avatar_url: profile.avatar_url,
    }, { onConflict: "id" });
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const savePrefs = async (next: any) => {
    setPrefs(next);
    const { error } = await (supabase as any).from("notification_preferences").upsert({ ...next, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) toast.error(error.message); else toast.success("Preferences saved");
  };

  const changePw = async () => {
    if (pw.length < 6) return toast.error("Min 6 chars");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated"); setPw(""); }
  };

  const avatarArr = profile.avatar_url ? [profile.avatar_url] : [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Your profile</h1>
      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
            : <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold">{(profile.username ?? "U")[0]?.toUpperCase()}</div>}
          <div>
            <p className="font-semibold">{user.email}</p>
            <p className="text-xs text-muted-foreground">Joined {new Date(profile.created_at ?? Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
        <div><Label>Username</Label><Input value={profile.username ?? ""} onChange={e => setProfile({ ...profile, username: e.target.value })} /></div>
        <div>
          <Label>Avatar (image upload)</Label>
          <MediaUploader value={avatarArr} onChange={urls => setProfile({ ...profile, avatar_url: urls[0] ?? null })} accept="image/*" max={1} showCover={false} />
        </div>
        <div><Label>Bio</Label><Textarea value={profile.bio ?? ""} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={3} /></div>
        <Button onClick={save} className="gradient-primary text-white border-0">Save profile</Button>
      </div>

      {prefs && (
        <div className="card-elevated p-6 mt-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notification preferences</h3>
          <p className="text-xs text-muted-foreground">Admin direct messages and "your store approved" can't be disabled.</p>
          {PREF_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
              <span>{label}</span>
              <Switch checked={!!prefs[key]} onCheckedChange={v => savePrefs({ ...prefs, [key]: v })} />
            </label>
          ))}
        </div>
      )}

      <div className="card-elevated p-6 mt-6 space-y-3">
        <h3 className="font-semibold">Change password</h3>
        <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" />
        <Button variant="outline" onClick={changePw}>Update password</Button>
      </div>

      {!isAdmin && (
        <div className="card-elevated p-6 mt-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Have an admin code?</h3>
          <Input value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Enter admin code" />
          <Button
            className="gradient-primary text-white border-0"
            onClick={async () => {
              if (!adminCode.trim()) return;
              try {
                await redeem({ data: { code: adminCode.trim() } });
                await refresh();
                toast.success("You are now an admin!");
                setAdminCode("");
                navigate({ to: "/admin" });
              } catch (e: any) { toast.error(e.message); }
            }}
          >Redeem code</Button>
        </div>
      )}
    </div>
  );
}
