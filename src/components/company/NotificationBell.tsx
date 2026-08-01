"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Bell,
  BellOff,
  CheckCheck,
  ClipboardCheck,
  Clock,
  FilePenLine,
  Home,
  ImagePlus,
  ImageMinus,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  User,
  type LucideIcon,
} from "lucide-react";
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
import {
  propertyFieldLabel,
  translateNotificationTitle,
} from "@/lib/propertyFieldI18n";
import { resolveNotificationBilingual } from "@/lib/notificationCopy";
import type { AppNotification } from "@/types/supabase-entities.types";
import type { TFunction, i18n as I18nInstance } from "i18next";

type NotifyTone = "primary" | "amber" | "emerald" | "rose" | "violet" | "sky" | "slate";

const TYPE_META: Record<
  string,
  { icon: LucideIcon; tone: NotifyTone }
> = {
  property_created: { icon: Home, tone: "primary" },
  property_pending_review: { icon: ClipboardCheck, tone: "amber" },
  property_resubmitted: { icon: RefreshCw, tone: "amber" },
  property_approved: { icon: ClipboardCheck, tone: "emerald" },
  property_rejected: { icon: ClipboardCheck, tone: "rose" },
  property_returned: { icon: FilePenLine, tone: "amber" },
  property_change_request: { icon: FilePenLine, tone: "violet" },
  property_images_added: { icon: ImagePlus, tone: "sky" },
  property_images_removal_request: { icon: ImageMinus, tone: "rose" },
  property_status_change_request: { icon: ArrowRightLeft, tone: "amber" },
  property_status_changed: { icon: ArrowRightLeft, tone: "primary" },
  property_paused: { icon: PauseCircle, tone: "slate" },
  property_unpaused: { icon: PlayCircle, tone: "emerald" },
  property_draft_stale: { icon: Clock, tone: "amber" },
};

const TONE_CLASSES: Record<
  NotifyTone,
  { wrap: string; icon: string }
> = {
  primary: {
    wrap: "bg-primary/10 border-primary/15 text-primary",
    icon: "text-primary",
  },
  amber: {
    wrap: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    icon: "text-amber-700",
  },
  emerald: {
    wrap: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    icon: "text-emerald-700",
  },
  rose: {
    wrap: "bg-rose-500/10 border-rose-500/20 text-rose-700",
    icon: "text-rose-700",
  },
  violet: {
    wrap: "bg-violet-500/10 border-violet-500/20 text-violet-700",
    icon: "text-violet-700",
  },
  sky: {
    wrap: "bg-sky-500/10 border-sky-500/20 text-sky-700",
    icon: "text-sky-700",
  },
  slate: {
    wrap: "bg-slate-500/10 border-slate-500/20 text-slate-700",
    icon: "text-slate-700",
  },
};

interface ParsedNotifyBody {
  property?: string;
  title?: string;
  agent?: string;
  status?: string;
  previousStatus?: string;
  newStatus?: string;
  note?: string;
  reason?: string;
  fields?: string[];
  date?: string;
  imagesAdded?: string;
  imagesRemoved?: string;
  lastUpdated?: string;
  extras: string[];
}

function translateStatusValue(
  value: string,
  t: TFunction,
  i18nInstance: I18nInstance,
): string {
  const v = value.trim();
  if (!v) return v;
  if (i18nInstance.exists(v)) return t(v);
  const known: Record<string, string> = {
    draft: t("Draft"),
    pending_review: t("Pending Review"),
    approved: t("Approved"),
    rejected: t("Rejected"),
    Draft: t("Draft"),
  };
  return known[v] ?? v;
}

function parseNotifyBody(
  body: string | null,
  language: string,
  t: TFunction,
  i18nInstance: I18nInstance,
): ParsedNotifyBody {
  if (!body?.trim()) return { extras: [] };

  const resolved = resolveNotificationBilingual(body, language);
  const parsed: ParsedNotifyBody = { extras: [] };

  for (const rawLine of resolved.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      parsed.extras.push(line);
      continue;
    }

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (key === "property" || key === "عقار") parsed.property = value;
    else if (key === "title" || key === "العنوان") parsed.title = value;
    else if (key === "agent" || key === "الوكيل") parsed.agent = value;
    else if (key === "status" || key === "الحالة") {
      parsed.status = translateStatusValue(value, t, i18nInstance);
    } else if (
      key === "previous status" ||
      key === "الحالة السابقة"
    ) {
      parsed.previousStatus = translateStatusValue(value, t, i18nInstance);
    } else if (key === "new status" || key === "الحالة الجديدة") {
      parsed.newStatus = translateStatusValue(value, t, i18nInstance);
    }     else if (key === "note" || key === "ملاحظة") parsed.note = value;
    else if (key === "reason" || key === "السبب") parsed.reason = value;
    else if (key === "fields" || key === "الحقول") {
      parsed.fields = value
        .split(/[,،]/)
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => propertyFieldLabel(f, t, i18nInstance));
    } else if (key === "date" || key === "التاريخ") parsed.date = value;
    else if (key === "images added" || key === "صور مضافة") {
      parsed.imagesAdded = value;
    } else if (key === "images removed" || key === "صور محذوفة") {
      parsed.imagesRemoved = value;
    } else if (
      key === "last updated" ||
      key.startsWith("آخر تحديث") ||
      key === "last updated:"
    ) {
      parsed.lastUpdated = value;
    } else if (key.startsWith("unreviewed") || key.startsWith("لم يُراجع")) {
      parsed.extras.push(line);
    } else {
      parsed.extras.push(line);
    }
  }

  // Drop redundant title when it's already embedded in the property line.
  if (
    parsed.property &&
    parsed.title &&
    parsed.property.includes(parsed.title)
  ) {
    parsed.title = undefined;
  }

  return parsed;
}

function metaForType(type: string) {
  return TYPE_META[type] ?? { icon: Bell, tone: "primary" as NotifyTone };
}

function NotificationCard({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const unread = !notification.read_at;
  const meta = metaForType(notification.type);
  const Icon = meta.icon;
  const tone = TONE_CLASSES[meta.tone];
  const title = translateNotificationTitle(notification.title, t, i18n);
  const fields = parseNotifyBody(notification.body, language, t, i18n);

  const inner = (
    <div
      className={cn(
        "group relative flex gap-3 px-3.5 py-3.5 text-start transition-colors",
        unread
          ? "bg-primary/[0.045] hover:bg-primary/[0.07]"
          : "hover:bg-muted/50",
      )}
    >
      {unread ? (
        <span className="absolute top-4 start-1.5 bg-primary rounded-full w-1.5 h-1.5" />
      ) : null}

      <span
        className={cn(
          "mt-0.5 flex justify-center items-center border rounded-xl w-10 h-10 shrink-0",
          tone.wrap,
        )}
      >
        <Icon className={cn("w-4 h-4", tone.icon)} />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-outfit font-semibold text-foreground text-sm leading-snug">
            {title}
          </p>
          <time className="shrink-0 pt-0.5 text-muted-foreground/75 text-[10px] whitespace-nowrap tabular-nums">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </time>
        </div>

        {fields.property ? (
          <p
            className="font-medium text-foreground/90 text-xs leading-snug line-clamp-2"
            dir="auto"
          >
            <span className="text-muted-foreground font-normal">
              {t("Property")}:{" "}
            </span>
            {fields.property}
          </p>
        ) : null}

        {fields.title ? (
          <p className="text-muted-foreground text-xs line-clamp-1" dir="auto">
            <span className="font-medium text-foreground/70">{t("Title")}: </span>
            {fields.title}
          </p>
        ) : null}

        {(fields.previousStatus || fields.newStatus || fields.status) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {fields.previousStatus ? (
              <span className="inline-flex items-center bg-muted/80 px-2 py-0.5 border border-border/60 rounded-md text-[11px] text-muted-foreground">
                {fields.previousStatus}
              </span>
            ) : null}
            {fields.previousStatus && fields.newStatus ? (
              <ArrowRightLeft className="w-3 h-3 text-muted-foreground/60 rtl:rotate-180" />
            ) : null}
            {fields.newStatus ? (
              <span className="inline-flex items-center bg-primary/10 px-2 py-0.5 border border-primary/15 rounded-md font-medium text-[11px] text-primary">
                {fields.newStatus}
              </span>
            ) : null}
            {!fields.previousStatus && !fields.newStatus && fields.status ? (
              <span className="inline-flex items-center bg-muted/80 px-2 py-0.5 border border-border/60 rounded-md text-[11px] text-muted-foreground">
                {fields.status}
              </span>
            ) : null}
          </div>
        )}

        {fields.agent ? (
          <p className="inline-flex items-center gap-1.5 max-w-full text-muted-foreground text-xs">
            <User className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate" dir="auto">
              {fields.agent}
            </span>
          </p>
        ) : null}

        {(fields.note || fields.reason) && (
          <p
            className="bg-muted/40 px-2.5 py-1.5 border border-border/50 rounded-lg text-muted-foreground text-xs leading-relaxed line-clamp-2"
            dir="auto"
          >
            {fields.note || fields.reason}
          </p>
        )}

        {(fields.imagesAdded ||
          fields.imagesRemoved ||
          (fields.fields && fields.fields.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {fields.imagesAdded ? (
              <span className="inline-flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 border border-sky-500/15 rounded-md text-sky-800">
                <ImagePlus className="w-3 h-3" />
                {t("Images added")}: {fields.imagesAdded}
              </span>
            ) : null}
            {fields.imagesRemoved ? (
              <span className="inline-flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 border border-rose-500/15 rounded-md text-rose-800">
                <ImageMinus className="w-3 h-3" />
                {t("Images removed")}: {fields.imagesRemoved}
              </span>
            ) : null}
            {fields.fields?.map((label) => (
              <span
                key={label}
                className="inline-flex items-center bg-violet-500/10 px-2 py-0.5 border border-violet-500/15 rounded-md text-violet-800"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {fields.extras.length > 0 ? (
          <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
            {fields.extras.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={onOpen} className="block">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className="block w-full" onClick={onOpen}>
      {inner}
    </button>
  );
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { currentUser } = useCompanyAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useMyNotifications();
  const { data: unreadCount = 0, isFetched } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const primed = useRef(false);
  const prevUnread = useRef(0);
  const skipToastFromPoll = useRef(false);

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
          description: latest?.title
            ? translateNotificationTitle(latest.title, t, i18n)
            : undefined,
        });
      }
      skipToastFromPoll.current = false;
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, isFetched, notifications, t, i18n]);

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
              description: translateNotificationTitle(row.title, t, i18n),
            });
          }
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, queryClient, t, i18n]);

  const handleOpen = (id: string, readAt: string | null) => {
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
        className="p-0 w-[min(100vw-1.5rem,26rem)] overflow-hidden rounded-2xl border-border/60 shadow-[var(--shadow-hover)]"
        sideOffset={8}
      >
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative flex justify-between items-center gap-3 px-4 py-3.5 border-b border-border/60">
            <div className="min-w-0">
              <p className="font-outfit font-semibold text-foreground text-sm">
                {t("Notifications")}
              </p>
              {unreadCount > 0 ? (
                <p className="mt-0.5 text-muted-foreground text-[11px]">
                  {t("{{count}} unread", { count: unreadCount })}
                </p>
              ) : (
                <p className="mt-0.5 text-muted-foreground text-[11px]">
                  {t("You're all caught up")}
                </p>
              )}
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 px-2.5 text-primary hover:text-primary"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{t("Mark all as read")}</span>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 px-4 py-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="bg-muted rounded-xl w-10 h-10 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="bg-muted rounded w-3/4 h-3" />
                    <div className="bg-muted rounded w-full h-3" />
                    <div className="bg-muted rounded w-1/2 h-2.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center px-6 py-12 text-center">
              <span className="flex justify-center items-center bg-muted/60 mb-3 border border-border/50 rounded-2xl w-12 h-12 text-muted-foreground">
                <BellOff className="w-5 h-5" />
              </span>
              <p className="font-medium text-foreground text-sm">
                {t("No notifications")}
              </p>
              <p className="mt-1 max-w-[16rem] text-muted-foreground text-xs leading-relaxed">
                {t("New property updates and approvals will show up here.")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {notifications.map((n) => (
                <li key={n.id}>
                  <NotificationCard
                    notification={n}
                    onOpen={() => handleOpen(n.id, n.read_at)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
