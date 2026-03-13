import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getKnownUserById } from "@/services/auth";
import type { NotificationItem } from "@/services/database";
import { seedDatabaseIfEmpty } from "@/services/database";
import { markAllNotificationsAsRead, subscribeCurrentUserNotifications } from "@/services/realtime";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    seedDatabaseIfEmpty();
    void markAllNotificationsAsRead();
    return subscribeCurrentUserNotifications((items) => {
      setNotifications(items);
    });
  }, []);

  const onMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const resolveNotificationBody = (body: string) => {
    const match = body.match(/from\s+(u-[a-z0-9]+)/i);
    if (!match) {
      return body;
    }

    const senderId = match[1];
    const senderName = getKnownUserById(senderId)?.name;
    if (!senderName) {
      return body;
    }

    return body.replace(senderId, senderName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} onSearchChange={() => undefined} />
      <main className="mx-auto max-w-5xl px-4 pt-40 pb-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-foreground font-display">Notifications</h1>
            <Button type="button" variant="outline" size="sm" onClick={() => void onMarkAllRead()}>
              Mark all as read
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className={`rounded-lg border px-4 py-3 ${item.read ? "border-border" : "border-info/40 bg-info/5"}`}>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{resolveNotificationBody(item.body)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
