import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/nalyys-logo.jpeg.asset.json";


export function Footer() {
  return (
    <footer className="border-t border-border mt-24 glass">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoAsset.url} alt="SAB Scripting logo" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <div className="font-bold gradient-text">SAB Scripting</div>
              <div className="text-xs text-muted-foreground">by Nalyy</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Premium scripts, sources, and tools — curated and verified.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/scripts" className="hover:text-foreground">Scripts</Link></li>
            <li><Link to="/sources" className="hover:text-foreground">Sources</Link></li>
            <li><Link to="/store" className="hover:text-foreground">Store</Link></li>
            <li><Link to="/reviews" className="hover:text-foreground">Reviews</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Community</h4>
          <a href="https://discord.gg/pmshPYywDD" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground">Join our Discord</a>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SAB Scripting by Nalyy. All rights reserved.
      </div>
    </footer>
  );
}
