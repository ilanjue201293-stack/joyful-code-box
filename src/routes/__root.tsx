import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SAB Nalyy's script — By the player 4 players" },
      { name: "description", content: "Free and paid scripts, sources, by Nalyy. Verified, updated, and trusted." },
      { property: "og:title", content: "SAB Nalyy's script — By the player 4 players" },
      { property: "og:description", content: "Free and paid scripts, sources, by Nalyy. Verified, updated, and trusted." },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#0a0612" },
      { name: "twitter:title", content: "SAB Nalyy's script — By the player 4 players" },
      { name: "twitter:description", content: "Free and paid scripts, sources, by Nalyy. Verified, updated, and trusted." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/348114f4-fae9-46ea-b674-bd14780e008e" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/348114f4-fae9-46ea-b674-bd14780e008e" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-7xl font-black gradient-text mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Page not found.</p>
        <a href="/" className="text-primary hover:underline">Go home</a>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthEvents() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        qc.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthEvents />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
        <Toaster theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
