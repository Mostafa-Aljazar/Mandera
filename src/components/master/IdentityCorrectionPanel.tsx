"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  KeyRound,
  Loader2,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCorrectIdentityField,
  useFindIdentityEntity,
  useIdentityFieldAudit,
} from "@/hooks/queries/useIdentityAudit";
import type { IdentityEntitySummary } from "@/actions/identityAudit";
import { actionErrorMessage } from "@/lib/actionErrorI18n";
import { cn } from "@/lib/utils";

type Props = {
  companyId: string;
};

export default function IdentityCorrectionPanel({ companyId }: Props) {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState<"client" | "owner">("client");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<IdentityEntitySummary[]>([]);
  const [selected, setSelected] = useState<IdentityEntitySummary | null>(null);
  const [fieldName, setFieldName] = useState<string>("name_en");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [requesterName, setRequesterName] = useState("");

  const findMutation = useFindIdentityEntity();
  const correctMutation = useCorrectIdentityField(companyId);
  const { data: auditRows = [], isLoading: auditLoading } =
    useIdentityFieldAudit(companyId);

  const fieldOptions =
    entityType === "client"
      ? ([
          { value: "name_en", label: t("identity_field_name_en") },
          { value: "name_ar", label: t("identity_field_name_ar") },
          { value: "phone", label: t("identity_field_phone") },
          { value: "country_code", label: t("identity_field_country_code") },
        ] as const)
      : ([
          { value: "name_en", label: t("identity_field_name_en") },
          { value: "name_ar", label: t("identity_field_name_ar") },
          { value: "phone", label: t("identity_field_phone") },
          { value: "country", label: t("identity_field_country") },
        ] as const);

  const handleSearch = async () => {
    try {
      const rows = await findMutation.mutateAsync({
        companyId,
        entityType,
        query,
      });
      setMatches(rows);
      setSelected(rows[0] ?? null);
      if (rows.length === 0) {
        toast.message(t("identity_no_matches"));
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("identity_search_failed"),
      );
    }
  };

  const handleCorrect = async () => {
    if (!selected) {
      toast.error(t("identity_select_record"));
      return;
    }
    if (!newValue.trim() || !reason.trim() || !requesterName.trim()) {
      toast.error(t("identity_required_fields"));
      return;
    }
    try {
      await correctMutation.mutateAsync({
        entityType: selected.entityType,
        entityId: selected.id,
        fieldName,
        newValue,
        reason,
        requesterName,
        companyId,
      });
      toast.success(t("identity_corrected"));
      setNewValue("");
      setReason("");
      const rows = await findMutation.mutateAsync({
        companyId,
        entityType: selected.entityType,
        query: selected.id,
      });
      setMatches(rows);
      setSelected(rows[0] ?? null);
    } catch (err) {
      toast.error(actionErrorMessage(err, t, "identity_correct_failed"));
    }
  };

  return (
    <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div className="relative px-5 sm:px-7 py-5 sm:py-6 border-border/50 border-b overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start gap-3.5">
          <span className="flex justify-center items-center bg-amber-500/10 border border-amber-500/20 rounded-2xl w-11 h-11 text-amber-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
                {t("identity_panel_title")}
              </h2>
              <span className="inline-flex items-center bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-full font-medium text-amber-700 text-[11px]">
                {t("identity_badge_admin_only")}
              </span>
            </div>
            <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
              {t("identity_panel_desc")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <section className="bg-muted/25 p-4 sm:p-5 border border-border/50 rounded-2xl">
          <h3 className="mb-3.5 font-outfit font-semibold text-foreground text-sm tracking-tight">
            {t("identity_find_record")}
          </h3>
          <div className="gap-3 grid grid-cols-1 sm:grid-cols-[minmax(10rem,12rem)_1fr_auto]">
            <div className="space-y-1.5">
              <Label className="font-medium text-muted-foreground text-xs">
                {t("identity_record_type")}
              </Label>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as "client" | "owner");
                  setFieldName("name_en");
                  setMatches([]);
                  setSelected(null);
                }}
              >
                <SelectTrigger className="bg-background border-border/60 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">{t("Client")}</SelectItem>
                  <SelectItem value="owner">{t("Owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-muted-foreground text-xs">
                {t("identity_id_or_phone")}
              </Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder={t("identity_query_placeholder")}
                className="bg-background border-border/60 rounded-xl h-11"
                dir="ltr"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleSearch}
                disabled={findMutation.isPending || !query.trim()}
                className="rounded-xl w-full sm:min-w-[7.5rem] h-11 font-semibold"
              >
                {findMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {t("Search")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {matches.length > 0 ? (
            <ul className="gap-2 grid sm:grid-cols-2 mt-4">
              {matches.map((row) => {
                const active = selected?.id === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className={cn(
                        "flex items-start gap-3 w-full rounded-xl border px-3.5 py-3 text-start transition-all",
                        active
                          ? "border-primary/40 bg-primary/[0.06] shadow-[var(--shadow-subtle)]"
                          : "border-border/50 bg-background hover:border-primary/25 hover:bg-muted/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex justify-center items-center rounded-xl w-9 h-9 shrink-0",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <UserRound className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {row.name_en || row.name_ar || t("Unnamed")}
                        </p>
                        <p
                          className="mt-0.5 text-muted-foreground text-xs truncate"
                          dir="ltr"
                        >
                          {row.phone}
                          {row.countryOrCode ? ` · ${row.countryOrCode}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {selected ? (
          <section className="space-y-4 bg-background p-4 sm:p-5 border border-primary/15 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 text-primary">
                <KeyRound className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-outfit font-semibold text-foreground text-sm tracking-tight">
                  {t("identity_apply_section")}
                </h3>
                <p className="text-muted-foreground text-xs truncate">
                  {selected.name_en || selected.name_ar || t("Unnamed")}
                </p>
              </div>
            </div>

            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">
                  {t("identity_field")}
                </Label>
                <Select value={fieldName} onValueChange={setFieldName}>
                  <SelectTrigger className="bg-background border-border/60 rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">
                  {t("identity_new_value")}
                </Label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="bg-background border-border/60 rounded-xl h-11"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">
                  {t("identity_reason")}
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder={t("identity_reason_placeholder")}
                  className="bg-background border-border/60 rounded-xl min-h-[4.5rem]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">
                  {t("identity_requester")}
                </Label>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder={t("identity_requester_placeholder")}
                  className="bg-background border-border/60 rounded-xl h-11"
                />
                <Button
                  type="button"
                  onClick={handleCorrect}
                  disabled={correctMutation.isPending}
                  className="rounded-xl w-full sm:w-auto h-10 font-semibold"
                >
                  {correctMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      {t("identity_apply")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <div className="flex items-center gap-2 mb-3.5">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-outfit font-semibold text-foreground text-sm tracking-tight">
              {t("identity_recent_audit")}
            </h3>
          </div>

          {auditLoading ? (
            <div className="space-y-2">
              <div className="bg-muted/40 rounded-xl h-16 animate-pulse" />
              <div className="bg-muted/40 rounded-xl h-16 animate-pulse" />
            </div>
          ) : auditRows.length === 0 ? (
            <div className="flex flex-col justify-center items-center gap-2 bg-muted/20 px-4 py-10 border border-border/50 border-dashed rounded-2xl text-center">
              <span className="flex justify-center items-center bg-muted rounded-2xl w-12 h-12 text-muted-foreground">
                <ClipboardList className="w-5 h-5" />
              </span>
              <p className="font-medium text-foreground text-sm">
                {t("identity_no_corrections")}
              </p>
              <p className="max-w-sm text-muted-foreground text-xs leading-relaxed">
                {t("identity_no_corrections_hint")}
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
              {auditRows.map((row) => (
                <li
                  key={row.id}
                  className="bg-muted/20 hover:bg-muted/30 p-3.5 sm:p-4 border border-border/50 rounded-xl transition-colors"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 bg-background px-2 py-0.5 border border-border/60 rounded-full font-medium text-foreground text-xs">
                      {row.entity_type === "client" ? t("Client") : t("Owner")}
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono" dir="ltr">
                        {row.field_name}
                      </span>
                    </span>
                    <span
                      className="text-muted-foreground text-[11px] tabular-nums"
                      dir="ltr"
                    >
                      {format(parseISO(row.created_at), "dd MMM yyyy · HH:mm")}
                    </span>
                  </div>
                  <div className="gap-2 grid sm:grid-cols-2 text-xs">
                    <p className="text-muted-foreground" dir="ltr">
                      <span className="font-medium text-foreground/80">
                        {t("identity_old")}:
                      </span>{" "}
                      {row.old_value ?? "—"}
                    </p>
                    <p className="text-muted-foreground" dir="ltr">
                      <span className="font-medium text-foreground/80">
                        {t("identity_new")}:
                      </span>{" "}
                      {row.new_value ?? "—"}
                    </p>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    <span className="font-medium text-foreground/80">
                      {t("identity_reason_label")}:
                    </span>{" "}
                    {row.reason}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    <span className="font-medium text-foreground/80">
                      {t("identity_requester_label")}:
                    </span>{" "}
                    {row.requester_name || "—"}
                    <span className="mx-1.5 text-border">·</span>
                    <span className="font-medium text-foreground/80">
                      {t("identity_performer")}:
                    </span>{" "}
                    {"performer_name" in row && row.performer_name
                      ? String(row.performer_name)
                      : row.performed_by}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
