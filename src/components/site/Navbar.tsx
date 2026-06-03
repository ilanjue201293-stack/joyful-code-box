import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut, User as UserIcon, Shield, Search, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoAsset from "@/assets/nalyys-logo.jpeg.asset.json";
import { NotificationsBell } from "@/components/site/NotificationsBell";

const DISCORD_URL = "https://discord.gg/pmshPYywDD";

const baseLinks = [
  { to: "/", label: "Home" },
  { to: "/scripts", label: "Scripts" },
  { to: "/sources", label: "Sources" },
  { to: "/store", label: "Store" },
  { to: "/reviews", label: "Reviews" },
];

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/scripts", search: { q: q.trim() } as never });
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logoAsset.url} alt="Nalyy's Scripts logo" className="h-8 w-8 rounded-lg object-cover animate-pulse-glow" />
          <div className="leading-none">
            <div className="font-bold text-base gradient-text">Nalyy's Scripts</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5">by Nalyy</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {baseLinks.map(l => (
            <Link key={l.to} to={l.to} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
              activeProps={{ className: "text-foreground bg-secondary/60" }} activeOptions={{ exact: l.to === "/" }}>
              {l.label}
            </Link>
          ))}
          <Link to="/premium" className="nav-premium px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Premium
          </Link>
          {user && (
            <Link to="/profile" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50" activeProps={{ className: "text-foreground bg-secondary/60" }}>
              Profile
            </Link>
          )}
          {user && !isAdmin && (
            <Link to="/redeem-admin" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-secondary/50 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Redeem code
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="px-3 py-2 text-sm font-medium text-primary hover:text-primary-foreground transition-colors rounded-md hover:bg-primary/20 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        <form onSubmit={onSearch} className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search scripts, sources…" className="pl-9 h-9 bg-secondary/40 border-border" />
        </form>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="hidden sm:inline-flex">
            <Button variant="default" size="sm" className="gradient-primary text-white border-0 glow-hover">Discord</Button>
          </a>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/login" className="hidden md:inline-flex">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          )}
          <button className="lg:hidden p-2" onClick={() => setOpen(o => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden glass border-t">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {baseLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md hover:bg-secondary/50">{l.label}</Link>
            ))}
            <Link to="/premium" onClick={() => setOpen(false)} className="nav-premium block px-3 py-2 rounded-md font-bold flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Premium
            </Link>
            {user && <Link to="/profile" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md hover:bg-secondary/50">Profile</Link>}
            {user && !isAdmin && <Link to="/redeem-admin" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md hover:bg-secondary/50">Redeem admin code</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-primary">Admin Dashboard</Link>}
            <form onSubmit={(e) => { onSearch(e); setOpen(false); }} className="pt-2">
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" />
            </form>
            <div className="flex gap-2 pt-2">
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="flex-1">
                <Button className="w-full gradient-primary text-white border-0">Discord</Button>
              </a>
              {user ? (
                <Button variant="outline" onClick={() => { signOut(); setOpen(false); }}><LogOut className="h-4 w-4" /></Button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full"><UserIcon className="h-4 w-4 mr-2" />Sign in</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
