"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { KeyRound, Loader2, Search, ShieldAlert } from "lucide-react";
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

/** PDF field names mapped onto this schema's bilingual full-name + phone columns. */
const CLIENT_FIELDS = [
  { value: "name_en", label: "full_name (EN)" },
  { value: "name_ar", label: "full_name (AR)" },
  { value: "phone", label: "phone_number" },
  { value: "country_code", label: "country_code" },
] as const;

const OWNER_FIELDS = [
  { value: "name_en", label: "full_name (EN)" },
  { value: "name_ar", label: "full_name (AR)" },
  { value: "phone", label: "phone_number" },
  { value: "country", label: "country_code" },
] as const;

type Props = {
  companyId: string;
};

export default function IdentityCorrectionPanel({ companyId }: Props) {
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

  const fieldOptions = entityType === "client" ? CLIENT_FIELDS : OWNER_FIELDS;

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
        toast.message("No matching records found.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    }
  };

  const handleCorrect = async () => {
    if (!selected) {
      toast.error("Select a record first.");
      return;
    }
    if (!newValue.trim() || !reason.trim() || !requesterName.trim()) {
      toast.error("New value, reason, and requester are required.");
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
      toast.success("Identity field corrected and audited.");
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
      toast.error(err instanceof Error ? err.message : "Correction failed.");
    }
  };

  return (
    <div className="bg-card shadow-sm p-5 sm:p-7 border border-border/60 rounded-2xl">
      <div className="flex items-start gap-3 mb-5">
        <span className="flex justify-center items-center bg-amber-500/10 mt-0.5 border border-amber-500/20 rounded-xl w-9 h-9 text-amber-700 shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-outfit font-semibold text-foreground text-base tracking-tight">
            Identity field correction
          </h2>
          <p className="mt-0.5 text-muted-foreground text-sm leading-relaxed">
            After create, name and phone are locked everywhere (UI, API, import,
            bulk). Only Master Admin may correct them here with a full audit log.
          </p>
          <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
            Schema mapping: first/middle/last/full_name → name_en / name_ar ·
            phone_number → phone · country_code → country_code / country
          </p>
        </div>
      </div>

      <div className="gap-3 grid grid-cols-1 sm:grid-cols-[160px_1fr_auto]">
        <div className="space-y-1.5">
          <Label className="text-xs">Record type</Label>
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
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ID or phone</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="UUID or phone fragment"
            className="bg-background border-border/60 rounded-xl h-11"
            dir="ltr"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={handleSearch}
            disabled={findMutation.isPending || !query.trim()}
            className="rounded-xl w-full sm:w-auto h-11"
          >
            {findMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="mr-2 w-4 h-4" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {matches.length > 0 ? (
        <ul className="space-y-2 mt-4">
          {matches.map((row) => {
            const active = selected?.id === row.id;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-start transition-colors ${
                    active
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <p className="font-medium text-sm">
                    {row.name_en || row.name_ar || "Unnamed"}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs" dir="ltr">
                    {row.phone} · {row.countryOrCode} · {row.id}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected ? (
        <div className="space-y-3 mt-5 pt-5 border-border/60 border-t">
          <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Field</Label>
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
              <Label className="text-xs">New value</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="bg-background border-border/60 rounded-xl h-11"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why this correction is needed"
              className="bg-background border-border/60 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Requester (required)</Label>
            <Input
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Who asked for this correction"
              className="bg-background border-border/60 rounded-xl h-11"
            />
          </div>
          <Button
            type="button"
            onClick={handleCorrect}
            disabled={correctMutation.isPending}
            className="rounded-xl h-10"
          >
            {correctMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="mr-2 w-4 h-4" />
                Apply correction
              </>
            )}
          </Button>
        </div>
      ) : null}

      <div className="mt-6 pt-5 border-border/60 border-t">
        <h3 className="mb-3 font-medium text-sm">Recent audit entries</h3>
        {auditLoading ? (
          <div className="bg-muted/40 rounded-xl h-14 animate-pulse" />
        ) : auditRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No corrections yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {auditRows.map((row) => (
              <li
                key={row.id}
                className="bg-muted/25 p-3 border border-border/40 rounded-xl text-xs space-y-1"
              >
                <p className="font-medium text-sm">
                  {row.entity_type} · {row.field_name}
                </p>
                <p className="text-muted-foreground" dir="ltr">
                  Old: {row.old_value ?? "—"}
                </p>
                <p className="text-muted-foreground" dir="ltr">
                  New: {row.new_value ?? "—"}
                </p>
                <p className="text-muted-foreground">Reason: {row.reason}</p>
                <p className="text-muted-foreground">
                  Requester: {row.requester_name || "—"}
                </p>
                <p className="text-muted-foreground">
                  Performer:{" "}
                  {"performer_name" in row && row.performer_name
                    ? String(row.performer_name)
                    : row.performed_by}
                </p>
                <p className="text-muted-foreground">
                  Timestamp:{" "}
                  {format(parseISO(row.created_at), "dd MMM yyyy HH:mm:ss")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
