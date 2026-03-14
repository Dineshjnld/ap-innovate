import { useEffect, useState } from "react";
import { Bell, Home, LogOut, MessageSquare, Search, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { MessageItem, NotificationItem } from "@/services/database";
import { subscribeCurrentUserMessages, subscribeCurrentUserNotifications } from "@/services/realtime";
import apPoliceLogo from "@/assets/ap-police-logo.png";
import dgpLogo from "@/assets/dgp.png";

interface HeaderProps {
  onNavigate: (page: "dashboard" | "create-project") => void;
  onSearchChange: (value: string) => void;
}

const Header = ({ onNavigate, onSearchChange }: HeaderProps) => {
  const navigate = useNavigate();
  const { signOut, session } = useAuth();
  const [query, setQuery] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const stopMessages = subscribeCurrentUserMessages((items: MessageItem[]) => {
      const currentUserId = session?.user.id;
      if (!currentUserId) {
        setUnreadMessages(0);
        return;
      }

      const count = items.filter((item) => item.to === currentUserId && !item.read).length;
      setUnreadMessages(count);
    });

    const stopNotifications = subscribeCurrentUserNotifications((items: NotificationItem[]) => {
      const count = items.filter((item) => !item.read).length;
      setUnreadNotifications(count);
    });

    return () => {
      stopMessages();
      stopNotifications();
    };
  }, [session]);

  return (
    <header className="fixed inset-x-0 top-0 z-[100]">
      <div className="gradient-navy border-b border-navy-light">
        <div className="mx-auto grid h-24 max-w-full grid-cols-3 items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="justify-self-start"
          >
            <img src={apPoliceLogo} alt="AP Police" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="justify-self-center"
          >
            <h1 className="text-base sm:text-2xl font-bold leading-tight text-primary-foreground font-display text-center whitespace-nowrap">
              AP Police Innovation Hub
            </h1>
          </button>

          <img
            src={dgpLogo}
            alt="DGP"
            className="justify-self-end h-12 w-12 sm:h-14 sm:w-14 rounded-md object-cover border border-gold/30"
          />
        </div>
      </div>

      <div className="border-b border-navy-light bg-navy/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-full items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate("dashboard")}
            className="border-navy-light bg-navy-light/40 text-primary-foreground hover:bg-navy-light"
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onNavigate("create-project")}
            className="bg-gold text-navy-dark hover:bg-gold-dark"
          >
            Submit Innovation
          </Button>

          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/60" />
            <input
              type="text"
              placeholder="Search innovations, officers, districts..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                onSearchChange(event.target.value);
              }}
              className="h-9 w-full rounded-md border border-navy-light bg-navy-light/40 pl-9 pr-10 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-primary-foreground/80 hover:bg-navy-light"
              aria-label="Run search"
              onClick={() => onSearchChange(query)}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative text-primary-foreground hover:bg-navy-light shrink-0"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadMessages > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-tr from-gold to-yellow-300 px-1 text-[9px] font-black text-navy-dark shadow-sm border border-navy/20">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            ) : null}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-navy-light relative shrink-0"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-tr from-gold to-yellow-300 px-1 text-[9px] font-black text-navy-dark shadow-sm border border-navy/20">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
          </Button>

          <div className="h-8 w-px bg-navy-light/40 mx-1 hidden sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex border-navy-light bg-navy-light/40 text-primary-foreground hover:bg-navy-light pl-1.5 pr-3 items-center gap-2 rounded-full ring-offset-navy/40"
            onClick={() => navigate("/profile")}
          >
            <div className="h-6 w-6 rounded-full overflow-hidden bg-gold/10 border border-gold/30">
              {session?.user?.avatar ? (
                <img src={session.user.avatar} alt={session.user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-gold">
                  {session?.user?.name?.[0] || "?"}
                </div>
              )}
            </div>
            <span className="font-semibold text-xs tracking-tight">
              {session?.user?.name ? session.user.name.split(" ")[0] : "Officer"}
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary-foreground/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            onClick={() => {
              signOut();
              navigate("/signin", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
