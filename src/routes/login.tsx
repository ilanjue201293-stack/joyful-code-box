import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username } },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="card-elevated p-8">
        <h1 className="text-2xl font-bold mb-1 gradient-text">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground mb-6">Welcome to SAB Scripting by Nalyy.</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div><Label>Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} required /></div>
          )}
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-white border-0">{mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">or</div>
        <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        <p className="text-sm text-center mt-6 text-muted-foreground">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary hover:underline">
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
        <p className="text-xs text-center mt-3"><Link to="/redeem-admin" className="text-muted-foreground hover:text-foreground">Have an admin code?</Link></p>
      </div>
    </div>
  );
}
