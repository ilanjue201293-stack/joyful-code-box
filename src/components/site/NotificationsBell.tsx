import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Check, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => (await (supabase as any).from("notifications").select("*").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  if (!user) return null;
  const unread = (data ?? []).filter((n: any) => !n.read).length;

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  const markAllRead = async () => {
    await (supabase as any).from("notifications").update({ read: true }).eq("recipient_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  const del = async (id: string) => {
    await (supabase as any).from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>Mark all read</Button>}
        </div>
        {(data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>}
        <div>
          {(data ?? []).map((n: any) => (
            <div key={n.id} className={`p-3 border-b border-border ${!n.read ? "bg-secondary/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  {n.link && <Link to={n.link} className="text-xs text-primary hover:underline mt-1 inline-block" onClick={() => markRead(n.id)}>Open →</Link>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.read && <button onClick={() => markRead(n.id)} title="Mark read"><Check className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>}
                  <button onClick={() => del(n.id)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
