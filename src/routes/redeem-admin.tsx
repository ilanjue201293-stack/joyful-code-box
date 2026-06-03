import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { redeemAdminCode } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/redeem-admin")({ component: RedeemAdmin });

function RedeemAdmin() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redeem = useServerFn(redeemAdminCode);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be signed in to redeem a code.");
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);
    try {
      await redeem({ data: { code } });
      await refresh();
      toast.success("You are now an admin!");
      navigate({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="card-elevated p-8">
        <h1 className="text-2xl font-bold mb-2 gradient-text">Redeem admin code</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter the secret code given by an existing admin.</p>
        {!loading && !user && (
          <div className="mb-4 p-3 rounded-md border border-border bg-muted/40 text-sm">
            You need to <Link to="/login" className="text-primary hover:underline">sign in</Link> first to redeem a code.
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Admin code</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="SAB-XXXX-XXXX-XXXX-XXXX" /></div>
          <Button type="submit" disabled={submitting || loading} className="w-full gradient-primary text-white border-0">
            {submitting ? "Redeeming..." : "Redeem"}
          </Button>
        </form>
      </div>
    </div>
  );
}
