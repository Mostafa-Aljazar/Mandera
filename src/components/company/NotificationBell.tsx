"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import supabase from "@/lib/supabase/client";
import {
  useMyNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/queries/useNotifications";

export default function NotificationBell() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { currentUser } = useCompanyAuth();
  const queryClient = useQueryClient();
  const dateLocale = language === "ar" ? ar : enUS;

  const { data: notifications = [], isLoading } = useMyNotifications();
  const { data: unreadCount = 0, isFetched } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const primed = useRef(false);
  const prevUnread = useRef(0);
  const skipToastFromPoll = useRef(false);

  // Instant in-app toast when unread count rises (poll fallback).
  useEffect(() => {
    if (!isFetched) return;
    if (!primed.current) {
      primed.current = true;
      prevUnread.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnread.current) {
      if (!skipToastFromPoll.current) {
        const latest = notifications.find((n) => !n.read_at) ?? notifications[0];
        toast.message(t("New notification"), {
          description: latest?.title,
        });
      }
      skipToastFromPoll.current = false;
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, isFetched, notifications, t]);

  // Realtime: instant toast + refresh when a notification is inserted for this user.
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const row = payload.new as { title?: string } | null;
          if (row?.title) {
            skipToastFromPoll.current = true;
            primed.current = true;
            prevUnread.current += 1;
            toast.message(t("New notification"), {
              description: row.title,
            });
          }
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, queryClient, t]);

  const handleOpen = (link: string | null, id: string, readAt: string | null) => {
    if (!readAt) markRead.mutate(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground"
          aria-label={t("Notifications")}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -end-0.5 flex justify-center items-center bg-destructive px-1 rounded-full min-w-[1.1rem] h-[1.1rem] font-semibold text-[10px] text-white tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="p-0 w-[min(100vw-1.5rem,22rem)]"
        sideOffset={8}
      >
        <div className="flex justify-between items-center gap-2 px-3.5 py-3 border-b border-border/60">
          <p className="font-outfit font-semibold text-sm">{t("Notifications")}</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="font-medium text-primary text-xs hover:underline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {t("Mark all as read")}
            </button>
          ) : null}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {isLoading ? (
            <p className="px-3.5 py-8 text-muted-foreground text-sm text-center">
              {t("Loading...")}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3.5 py-8 text-muted-foreground text-sm text-center">
              {t("No notifications")}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {notifications.map((n) => {
                const content = (
                  <div
                    className={cn(
                      "px-3.5 py-3 transition-colors hover:bg-muted/40 text-start",
                      !n.read_at && "bg-primary/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at ? (
                        <span className="bg-primary mt-1.5 rounded-full w-1.5 h-1.5 shrink-0" />
                      ) : (
                        <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm leading-snug">
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed line-clamp-2 whitespace-pre-line">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-muted-foreground/80 text-[11px]">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => handleOpen(n.link, n.id, n.read_at)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full"
                        onClick={() => handleOpen(null, n.id, n.read_at)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
