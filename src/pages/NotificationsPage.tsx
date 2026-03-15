import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  UserPlus,
  Clock,
  Trash2,
  Filter
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NotificationItem } from "@/services/database";
import {
  markAllNotificationsAsRead,
  subscribeCurrentUserNotifications,
  clearAllNotifications,
  deleteNotificationById
} from "@/services/realtime";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Mark all notifications as read when the page is opened
    void markAllNotificationsAsRead();

    return subscribeCurrentUserNotifications((items) => {
      setNotifications(items);
    });
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => activeFilter === 'all' || !n.read);
  }, [notifications, activeFilter]);

  const onMarkAllRead = async () => {
    await markAllNotificationsAsRead();
  };

  const onClearAll = async () => {
    await clearAllNotifications();
  };

  const onDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotificationById(id);
  };

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("message")) return <MessageSquare className="h-4 w-4 text-sky-500" />;
    if (t.includes("project") || t.includes("innovation")) return <Lightbulb className="h-4 w-4 text-gold-dark" />;
    if (t.includes("connection") || t.includes("follow")) return <UserPlus className="h-4 w-4 text-emerald-500" />;
    return <Bell className="h-4 w-4 text-slate-400" />;
  };

  const groups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const sections: Record<string, NotificationItem[]> = {
      "Today": [],
      "Yesterday": [],
      "Earlier": []
    };

    filteredNotifications.forEach(n => {
      if (n.createdAt >= today) sections["Today"].push(n);
      else if (n.createdAt >= yesterday) sections["Yesterday"].push(n);
      else sections["Earlier"].push(n);
    });

    return Object.entries(sections).filter(([_, items]) => items.length > 0);
  }, [filteredNotifications]);

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] dark:bg-slate-950">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} />

      <main className="mx-auto max-w-4xl px-4 pt-[180px] pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-gold rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gold-dark">Real-time Updates</span>
            </div>
            <h1 className="text-5xl font-black text-navy dark:text-white font-display tracking-tight leading-none">Activity Center</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-4 font-bold text-lg max-w-xl">Departmental alerts and collaborative innovation triggers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 shadow-sm font-sans">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeFilter === 'all' ? 'bg-navy text-white shadow-md' : 'text-slate-400 hover:text-navy'}`}
              >
                All Alerts
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeFilter === 'unread' ? 'bg-navy text-white shadow-md' : 'text-slate-400 hover:text-navy'}`}
              >
                Unread
              </button>
            </div>
            <Button variant="outline" size="sm" className="h-[42px] font-black px-5 border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all rounded-xl shadow-sm" onClick={onClearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          </div>
        </div>

        <div className="space-y-12">
          {filteredNotifications.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
              <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 mb-6 relative z-10">
                <Bell className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-navy dark:text-white relative z-10">System is Idle</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 font-medium relative z-10">You've cleared all alerts. Important updates about your innovations and messages will appear here.</p>
            </div>
          ) : (
            groups.map(([title, items]) => (
              <div key={title} className="space-y-5">
                <div className="flex items-center gap-4 px-1">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{title}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid gap-4">
                  {items.map((item) => {
                    const icon = getIcon(item.title);
                    const isUnread = !item.read;

                    let accentClass = "border-l-slate-200";
                    if (item.title.toLowerCase().includes("message")) accentClass = "border-l-sky-500";
                    if (item.title.toLowerCase().includes("project") || item.title.toLowerCase().includes("innovation")) accentClass = "border-l-gold";
                    if (item.title.toLowerCase().includes("connection")) accentClass = "border-l-emerald-500";

                    return (
                      <div
                        key={item.id}
                        className={`group relative flex items-start gap-5 p-5 rounded-2.5xl border transition-all overflow-hidden ${isUnread
                          ? "bg-white dark:bg-slate-900 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] ring-1 ring-gold/10"
                          : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 grayscale opacity-60"
                          } border-l-4 ${accentClass}`}
                      >
                        {isUnread && (
                          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />
                        )}
                        <div className={`mt-1 h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${isUnread ? "bg-slate-50 dark:bg-slate-800 border border-slate-100/50" : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                          {icon}
                        </div>

                        <div className="flex-1 min-w-0 pr-10">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className={`text-lg font-black tracking-tight ${isUnread ? "text-navy dark:text-white" : "text-slate-600"}`}>
                              {item.title}
                            </h4>
                            {isUnread && (
                              <Badge className="bg-gold hover:bg-gold text-navy-dark text-[10px] uppercase font-black px-2 py-0 h-4 border-none">New Update</Badge>
                            )}
                          </div>
                          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {item.body}
                          </p>
                          <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(item.createdAt)}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-slate-400">Internal Alert</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => onDeleteOne(item.id, e)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
