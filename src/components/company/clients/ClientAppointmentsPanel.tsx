"use client";

import React, { useMemo, useState } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useClientAppointments,
  useCreateClientAppointment,
  useDeleteClientAppointment,
} from "@/hooks/queries/useAppointments";
import { cn } from "@/lib/utils";

type PropertyOption = {
  id: string;
  title?: string | null;
  title_ar?: string | null;
  code?: string | null;
};

interface ClientAppointmentsPanelProps {
  companyId: string;
  clientId: string;
  interestedPropertyIds: string[];
  properties: PropertyOption[];
  disabled?: boolean;
  className?: string;
}

export default function ClientAppointmentsPanel({
  companyId,
  clientId,
  interestedPropertyIds,
  properties,
  disabled = false,
  className,
}: ClientAppointmentsPanelProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;

  const { data: appointments = [], isLoading } = useClientAppointments(
    companyId,
    clientId,
  );
  const createMutation = useCreateClientAppointment();
  const deleteMutation = useDeleteClientAppointment();

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"appointment" | "viewing">("appointment");
  const [scheduledAt, setScheduledAt] = useState("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [note, setNote] = useState("");

  const propertyOptions = useMemo(() => {
    const byId = new Map(properties.map((p) => [p.id, p]));
    return interestedPropertyIds
      .map((id) => byId.get(id))
      .filter((p): p is PropertyOption => Boolean(p));
  }, [interestedPropertyIds, properties]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...appointments]
      .filter((a) => {
        try {
          return !isBefore(parseISO(a.scheduled_at), now);
        } catch {
          return true;
        }
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
  }, [appointments]);

  const resetForm = () => {
    setTitle("");
    setKind("appointment");
    setScheduledAt("");
    setPropertyId("");
    setNote("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t("Appointment title is required."));
      return;
    }
    if (!scheduledAt) {
      toast.error(t("Appointment date/time is required."));
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        companyId,
        clientId,
        title: trimmed,
        kind,
        scheduledAt: new Date(scheduledAt).toISOString(),
        propertyId: propertyId || null,
        note: note.trim() || undefined,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Saved successfully."));
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("An error occurred.");
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (disabled) return;
    try {
      const result = await deleteMutation.mutateAsync({
        id,
        companyId,
        clientId,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Saved successfully."));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("An error occurred.");
      toast.error(message);
    }
  };

  const propertyLabel = (id: string | null) => {
    if (!id) return null;
    const p = properties.find((x) => x.id === id);
    if (!p) return null;
    const title =
      language === "ar"
        ? p.title_ar || p.title || p.code
        : p.title || p.title_ar || p.code;
    return title || id;
  };

  return (
    <section
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 bg-muted/30 px-4 sm:px-5 py-3.5 border-border/50 border-b">
        <span className="flex justify-center items-center bg-primary/10 rounded-lg w-7 h-7 text-primary shrink-0">
          <CalendarDays className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-semibold text-foreground text-sm">
            {t("Appointments")}
          </h3>
          <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
            {t("Schedule appointments and property viewings for this client.")}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("No appointments yet.")}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((appt) => {
              const propLabel = propertyLabel(appt.property_id);
              return (
                <li
                  key={appt.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">
                        {appt.title}
                      </p>
                      <Badge
                        variant="secondary"
                        className="h-5 text-[10px] font-medium"
                      >
                        {appt.kind === "viewing"
                          ? t("Viewing")
                          : t("Appointment")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs" dir="ltr">
                      {format(parseISO(appt.scheduled_at), "MMM d, yyyy · HH:mm", {
                        locale: dateLocale,
                      })}
                    </p>
                    {propLabel ? (
                      <p className="text-muted-foreground text-xs truncate" dir="auto">
                        {propLabel}
                      </p>
                    ) : null}
                    {appt.note ? (
                      <p className="text-muted-foreground text-xs line-clamp-2">
                        {appt.note}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    disabled={disabled || deleteMutation.isPending}
                    aria-label={t("Delete appointment")}
                    onClick={() => handleDelete(appt.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleCreate} className="space-y-3 border-t border-border/50 pt-4">
          <p className="font-medium text-foreground text-xs">
            {t("Add appointment")}
          </p>
          <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("Title")} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background h-9 text-sm"
                placeholder={t("Title")}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Appointment type")}</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  setKind(v === "viewing" ? "viewing" : "appointment")
                }
                disabled={disabled}
              >
                <SelectTrigger className="bg-background h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">{t("Appointment")}</SelectItem>
                  <SelectItem value="viewing">{t("Viewing")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Scheduled at")}</Label>
              <Input
                type="datetime-local"
                dir="ltr"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-background h-9 text-sm"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("Property (optional)")}</Label>
              <Select
                value={propertyId || "__none__"}
                onValueChange={(v) => setPropertyId(v === "__none__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger className="bg-background h-9">
                  <SelectValue placeholder={t("Property (optional)")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("None")}</SelectItem>
                  {propertyOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span dir="auto">
                        {(language === "ar"
                          ? p.title_ar || p.title || p.code
                          : p.title || p.title_ar || p.code) || p.id}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("Optional note")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-background min-h-[72px] text-sm"
                placeholder={t("Optional note")}
                disabled={disabled}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5 h-9"
            disabled={disabled || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {t("Add appointment")}
          </Button>
        </form>
      </div>
    </section>
  );
}
