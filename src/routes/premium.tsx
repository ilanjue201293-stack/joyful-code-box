import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { requestPremium, redeemPremiumCode, requestPremiumManual } from "@/lib/api.functions";
import { toast } from "sonner";
import { Crown, Check, Sparkles, Store, Pin, Zap, Heart, ShieldCheck, Copy, Gift } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "💎 Premium Pass — Nalyy's Scripts" },
      { name: "description", content: "Unlock all paid scripts & sources by Nalyy, create a free store with unlimited products, get a Premium badge and more." },
    ],
  }),
  component: PremiumPage,
});

const BENEFITS = [
  { icon: Crown, title: "Exclusive Premium badge", desc: "Stand out everywhere on the site with your shiny Premium badge." },
  { icon: Zap, title: "Paid script Access", desc: "Unlock access to all scripts made by Nalyy and Admins." },
  { icon: Sparkles, title: "Paid source Access", desc: "Unlock access to all paid sources made by Nalyy and Admins." },
  { icon: Store, title: "Free store · unlimited products", desc: "Create your own store right away, with no product limit and no admin review." },
  { icon: Pin, title: "Pinned reviews in blue", desc: "Your reviews get a glowing blue highlight and float to the top." },
  { icon: Heart, title: "And much more to come…", desc: "Early access to upcoming features and Premium-only drops." },
];

function PremiumPage() {
  const { user, isPremium, refresh } = useAuth();
  const reqFn = useServerFn(requestPremium);
  const redeemFn = useServerFn(redeemPremiumCode);
  const manualFn = useServerFn(requestPremiumManual);
  const [loading, setLoading] = useState<"paypal" | "ltc" | "gift-paypal" | "gift-ltc" | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [manualOpen, setManualOpen] = useState<"premium" | "gift" | null>(null);
  const [manualMethod, setManualMethod] = useState("PayPal");
  const [manualUsername, setManualUsername] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualSending, setManualSending] = useState(false);

  const handleRedeem = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!code.trim()) { toast.error("Enter a code"); return; }
    setRedeeming(true);
    try {
      await redeemFn({ data: { code: code.trim() } });
      toast.success("🎉 Premium activated! Welcome aboard.");
      setCode("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setRedeeming(false); }
  };

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("premium_price,premium_paypal_url,premium_ltc_address").eq("id", 1).maybeSingle()).data as any,
  });

  const price = settings?.premium_price ?? 5;

  const handleBuy = async (method: "paypal" | "ltc", gift = false) => {
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(gift ? (`gift-${method}` as any) : method);
    try {
      await reqFn({ data: { method, gift } });
      // Auto-open the payment destination
      if (method === "paypal" && settings?.premium_paypal_url) {
        window.open(settings.premium_paypal_url, "_blank", "noopener,noreferrer");
      } else if (method === "ltc" && settings?.premium_ltc_address) {
        try { await navigator.clipboard.writeText(settings.premium_ltc_address); } catch {}
        toast.success("LTC address copied — paste it in your wallet to pay.");
      }
      toast.success(gift
        ? "Gift request sent! Complete the payment — an admin will send you a Premium code to share."
        : "Request sent! Complete the payment and an admin will activate Premium.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const submitManual = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!manualUsername.trim()) { toast.error("Enter your payment username/handle"); return; }
    setManualSending(true);
    try {
      await manualFn({ data: { method: manualMethod, username: manualUsername.trim(), note: manualNote.trim() || undefined, gift: manualOpen === "gift" } });
      toast.success("Claim sent to admins — you'll get a reply soon.");
      setManualOpen(null); setManualUsername(""); setManualNote("");
    } catch (e: any) { toast.error(e.message); }
    finally { setManualSending(false); }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full premium-bg-orb" />
        <div className="absolute top-1/3 left-10 w-72 h-72 rounded-full premium-bg-orb-2" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full premium-bg-orb-3" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 premium-pill px-4 py-1.5 mb-6 text-xs font-semibold">
            <Crown className="h-3.5 w-3.5" />
            <span>PREMIUM PASS</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-5 premium-text">
            Go Premium.<br />Unlock everything.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            One pass. All paid scripts & sources. A free store. And a glowing badge that follows you everywhere on Nalyy's Scripts. 💎
          </p>

          {isPremium && (
            <div className="mt-10 mx-auto max-w-2xl premium-card-hero p-8 md:p-10 relative">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl">
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <div className="text-xs uppercase tracking-[0.4em] text-cyan-300 font-bold">You're a Premium member</div>
                <div className="text-5xl md:text-7xl font-black premium-text leading-tight text-center">
                  YOU ARE<br/>PREMIUM 💎
                </div>
                <p className="text-base text-muted-foreground text-center max-w-md">
                  All paid scripts, all paid sources, free unlimited store, glowing badge — it's all unlocked. Enjoy!
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full premium-active">
                  <ShieldCheck className="h-4 w-4" /> Active for life
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-14">
          {BENEFITS.map(b => (
            <div key={b.title} className="premium-card p-5 group">
              <div className="flex items-start gap-3">
                <div className="premium-icon-wrap shrink-0">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    {b.title}
                    <Check className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div className="max-w-xl mx-auto">
          <div className="premium-card-hero p-8 md:p-10 text-center relative">
            <Sparkles className="absolute top-4 right-4 h-5 w-5 text-cyan-300 animate-pulse" />
            <Sparkles className="absolute bottom-4 left-4 h-4 w-4 text-blue-300 animate-pulse" style={{ animationDelay: "0.5s" }} />
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-2 font-bold">Lifetime access</div>
            <div className="text-6xl md:text-7xl font-black premium-text mb-1">€{Number(price).toFixed(0)}</div>
            <div className="text-sm text-muted-foreground mb-8">One-time payment · No subscription</div>

            {!user ? (
              <Link to="/login">
                <Button size="lg" className="w-full premium-button text-white border-0">
                  Sign in to get Premium
                </Button>
              </Link>
            ) : isPremium ? (
              <Button size="lg" disabled className="w-full premium-button text-white border-0 opacity-70">
                <Check className="h-5 w-5 mr-2" /> You already have Premium
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full premium-button text-white border-0 h-14 text-base"
                  disabled={loading !== null}
                  onClick={() => handleBuy("paypal")}
                >
                  {loading === "paypal" ? "Sending…" : "💳  Buy with PayPal"}
                </Button>
                <Button
                  size="lg"
                  className="w-full premium-button-alt text-white border-0 h-14 text-base"
                  disabled={loading !== null}
                  onClick={() => handleBuy("ltc")}
                >
                  {loading === "ltc" ? "Sending…" : "Ł  Buy with LTC"}
                </Button>

                {/* Gift Premium */}
                <div className="mt-4 pt-4 border-t border-cyan-400/20">
                  <div className="text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center justify-center gap-1.5 mb-3">
                    <Gift className="h-3.5 w-3.5" /> Gift Premium to a friend
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mb-3">
                    Buy a gift — you'll receive a one-time code you can share. Anyone who redeems it becomes Premium for life.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/10 h-11"
                      disabled={loading !== null}
                      onClick={() => handleBuy("paypal", true)}
                    >
                      {loading === "gift-paypal" ? "Sending…" : "🎁 Gift via PayPal"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/10 h-11"
                      disabled={loading !== null}
                      onClick={() => handleBuy("ltc", true)}
                    >
                      {loading === "gift-ltc" ? "Sending…" : "🎁 Gift via LTC"}
                    </Button>
                  </div>
                </div>

                {/* Premium gift code redeem */}
                {user && (
                  <div className="mt-4 pt-4 border-t border-cyan-400/20 text-left">
                    <label className="text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5 mb-2">
                      <Gift className="h-3.5 w-3.5" /> Have a Premium gift code?
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="PREM-XXXX-XXXX-XXXX"
                        className="font-mono text-xs"
                        disabled={redeeming}
                      />
                      <Button onClick={handleRedeem} disabled={redeeming || !code.trim()} className="premium-button text-white border-0 shrink-0">
                        {redeeming ? "…" : "Redeem"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment details */}
            {!isPremium && user && (settings?.premium_paypal_url || settings?.premium_ltc_address) && (
              <div className="mt-6 space-y-2 text-left text-xs border-t border-cyan-400/20 pt-5">
                {settings?.premium_paypal_url && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded bg-blue-500/10 border border-blue-400/30">
                    <span className="text-muted-foreground">PayPal:</span>
                    <a href={settings.premium_paypal_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline truncate flex-1 text-right">{settings.premium_paypal_url}</a>
                  </div>
                )}
                {settings?.premium_ltc_address && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded bg-blue-500/10 border border-blue-400/30">
                    <span className="text-muted-foreground">LTC:</span>
                    <code className="text-cyan-300 truncate flex-1 text-right">{settings.premium_ltc_address}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(settings.premium_ltc_address); toast.success("Copied"); }}
                      className="text-cyan-300 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-muted-foreground text-[11px] pt-1">
                  After paying, click the button above — an admin will verify the payment and activate Premium on your account.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .premium-text {
          background: linear-gradient(135deg, #60a5fa 0%, #22d3ee 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 0 24px rgba(56, 189, 248, 0.4));
        }
        .premium-pill {
          background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(34,211,238,0.25));
          border: 1px solid rgba(56,189,248,0.4);
          color: #7dd3fc;
          border-radius: 999px;
          box-shadow: 0 0 24px rgba(56,189,248,0.3), inset 0 0 12px rgba(56,189,248,0.15);
        }
        .premium-card {
          background: linear-gradient(135deg, rgba(30,58,138,0.25), rgba(8,145,178,0.15));
          border: 1px solid rgba(56,189,248,0.25);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          transition: all 0.35s ease;
        }
        .premium-card:hover {
          border-color: rgba(56,189,248,0.6);
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(56,189,248,0.25);
        }
        .premium-card-hero {
          background: linear-gradient(135deg, rgba(30,58,138,0.4), rgba(8,145,178,0.3));
          border: 2px solid rgba(56,189,248,0.5);
          border-radius: 24px;
          backdrop-filter: blur(16px);
          box-shadow:
            0 0 60px rgba(56,189,248,0.3),
            0 0 120px rgba(59,130,246,0.2),
            inset 0 0 40px rgba(56,189,248,0.08);
          animation: premium-pulse 3.5s ease-in-out infinite;
        }
        .premium-icon-wrap {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 16px rgba(56,189,248,0.5);
        }
        .premium-button {
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #38bdf8 100%);
          background-size: 200% 200%;
          animation: premium-shift 4s ease infinite;
          box-shadow: 0 0 28px rgba(56,189,248,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          font-weight: 700;
        }
        .premium-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(56,189,248,0.7), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .premium-button-alt {
          background: linear-gradient(135deg, #1e3a8a 0%, #0e7490 100%);
          border: 1px solid rgba(56,189,248,0.5) !important;
          box-shadow: 0 0 20px rgba(56,189,248,0.3);
          font-weight: 700;
        }
        .premium-button-alt:hover:not(:disabled) {
          box-shadow: 0 0 32px rgba(56,189,248,0.5);
        }
        .premium-active {
          background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,211,238,0.2));
          border: 1px solid rgba(34,211,238,0.5);
          color: #67e8f9;
        }
        .premium-bg-orb {
          background: radial-gradient(circle, rgba(56,189,248,0.25), transparent 65%);
          filter: blur(40px);
        }
        .premium-bg-orb-2 {
          background: radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%);
          filter: blur(50px);
          animation: premium-float 8s ease-in-out infinite;
        }
        .premium-bg-orb-3 {
          background: radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%);
          filter: blur(50px);
          animation: premium-float 10s ease-in-out infinite reverse;
        }
        @keyframes premium-pulse {
          0%,100% {
            box-shadow: 0 0 60px rgba(56,189,248,0.3), 0 0 120px rgba(59,130,246,0.2), inset 0 0 40px rgba(56,189,248,0.08);
          }
          50% {
            box-shadow: 0 0 90px rgba(56,189,248,0.5), 0 0 160px rgba(59,130,246,0.35), inset 0 0 60px rgba(56,189,248,0.15);
          }
        }
        @keyframes premium-shift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes premium-float {
          0%,100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(20px); }
        }
      `}</style>
    </div>
  );
}
