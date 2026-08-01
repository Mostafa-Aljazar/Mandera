"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Check,
  ClipboardCheck,
  FileEdit,
  FilePenLine,
  Home,
  ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  usePendingPropertyApprovals,
  usePropertyApprovalMutations,
} from "@/hooks/queries/usePropertyApprovals";
import {
  useAreasDistrictsLookup,
  usePropertyTypes,
} from "@/hooks/queries/useProperties";
import { bilingualLabel } from "@/lib/bilingualLabel";
import { amenityI18nKey, amenityLabel } from "@/lib/portals/amenities";
import {
  formatPropertyDiffValue,
  propertyFieldLabel,
} from "@/lib/propertyFieldI18n";
import { canApproveProperties } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  PropertyChangeRequestWithProperty,
  PropertyStatusChangeRequestWithProperty,
} from "@/actions/propertyApprovals";
import type { Property } from "@/types/supabase-entities.types";

type NoteDialogState = {
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (note: string) => Promise<void>;
} | null;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function propertyHeading(
  code: string | null | undefined,
  title: string | null | undefined,
  fallbackId?: string,
): string {
  if (code && title) return `${code} — ${title}`;
  if (code) return code;
  if (title) return title;
  if (fallbackId) return fallbackId.slice(0, 8);
  return "—";
}

export default function ApprovalsPageContent() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { company, currentUser } = useCompanyAuth();
  const canReview = canApproveProperties(currentUser?.role);
  const { data, isLoading } = usePendingPropertyApprovals(
    canReview ? company?.id : undefined,
  );
  const mutations = usePropertyApprovalMutations(company?.id);
  const { data: propertyTypes = [] } = usePropertyTypes(company?.id);
  const { data: areas = [] } = useAreasDistrictsLookup(company?.id);
  const [acceptedImagesByRequest, setAcceptedImagesByRequest] = useState<
    Record<string, string[]>
  >({});
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of propertyTypes) {
      map.set(row.id, bilingualLabel(row, language) || row.id);
    }
    return map;
  }, [propertyTypes, language]);

  const areaNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of areas) {
      if (row.id) map.set(row.id, row.name || row.id);
    }
    return map;
  }, [areas]);

  const formatDiff = (field: string, value: unknown): string => {
    if (field === "type" && typeof value === "string" && value) {
      return typeNameById.get(value) ?? `${value.slice(0, 8)}…`;
    }
    if (field === "area_district" && typeof value === "string" && value) {
      return areaNameById.get(value) ?? `${value.slice(0, 8)}…`;
    }
    if (field === "amenities" && Array.isArray(value)) {
      const labels = asStringArray(value).map((slug) => {
        const key = amenityI18nKey(slug);
        return i18n.exists(key) ? t(key) : amenityLabel(slug);
      });
      return labels.length ? labels.join(language.startsWith("ar") ? "، " : ", ") : "—";
    }
    return formatPropertyDiffValue(value, t, i18n);
  };

  const amenityDiff = (before: unknown, after: unknown) => {
    const oldSet = new Set(asStringArray(before));
    const newSet = new Set(asStringArray(after));
    const removed = [...oldSet].filter((x) => !newSet.has(x));
    const added = [...newSet].filter((x) => !oldSet.has(x));
    return { removed, added };
  };

  const labelAmenity = (slug: string) => {
    const key = amenityI18nKey(slug);
    return i18n.exists(key) ? t(key) : amenityLabel(slug);
  };

  if (!canReview) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
        {t("Access denied")}
      </div>
    );
  }

  const properties = data?.pendingProperties ?? [];
  const draftProperties = data?.draftProperties ?? [];
  const staleDraftDays = data?.staleDraftDays ?? 3;
  const changeRequests = data?.changeRequests ?? [];
  const statusRequests = data?.statusChangeRequests ?? [];
  const total =
    properties.length +
    draftProperties.length +
    changeRequests.length +
    statusRequests.length;

  const tabFromUrl = searchParams.get("tab");
  const defaultTab =
    tabFromUrl === "drafts" ||
    tabFromUrl === "listings" ||
    tabFromUrl === "edits" ||
    tabFromUrl === "status"
      ? tabFromUrl
      : draftProperties.length
        ? "drafts"
        : properties.length
          ? "listings"
          : changeRequests.length
            ? "edits"
            : "status";

  const acceptedFor = (requestId: string, imagesAdded: string[]) =>
    acceptedImagesByRequest[requestId] ?? imagesAdded;

  const toggleImage = (
    requestId: string,
    imagesAdded: string[],
    url: string,
  ) => {
    const current = acceptedFor(requestId, imagesAdded);
    const next = current.includes(url)
      ? current.filter((item) => item !== url)
      : [...current, url];
    setAcceptedImagesByRequest((prev) => ({ ...prev, [requestId]: next }));
  };

  const openNoteDialog = (state: Exclude<NoteDialogState, null>) => {
    setNoteText("");
    setNoteDialog(state);
  };

  const submitNoteDialog = async () => {
    if (!noteDialog) return;
    const trimmed = noteText.trim();
    if (!trimmed) {
      toast.error(t("Review note / rejection reason"));
      return;
    }
    setNoteSubmitting(true);
    try {
      await noteDialog.onConfirm(trimmed);
      setNoteDialog(null);
      setNoteText("");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("Something went wrong"),
      );
    } finally {
      setNoteSubmitting(false);
    }
  };

  const runAction = async (fn: () => Promise<unknown>, successKey: string) => {
    try {
      await fn();
      toast.success(t(successKey));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("Something went wrong"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card px-6 py-14 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <ClipboardCheck className="h-6 w-6" />
        </span>
        <h2 className="font-outfit text-lg font-semibold tracking-tight">
          {t("All caught up")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("No pending approvals right now.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-outfit text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("Approvals")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Review drafts, new listings, change requests, and status changes.",
            )}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="h-7 border-amber-500/20 bg-amber-500/10 px-2.5 text-amber-800 tabular-nums"
        >
          {t("{{count}} pending", { count: total })}
        </Badge>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 sm:w-auto">
          <TabsTrigger value="drafts" className="gap-1.5">
            <FilePenLine className="h-3.5 w-3.5" />
            {t("Drafts")}
            <CountPill count={draftProperties.length} />
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5">
            <Home className="h-3.5 w-3.5" />
            {t("New listings")}
            <CountPill count={properties.length} />
          </TabsTrigger>
          <TabsTrigger value="edits" className="gap-1.5">
            <FileEdit className="h-3.5 w-3.5" />
            {t("Edit requests")}
            <CountPill count={changeRequests.length} />
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("Status changes")}
            <CountPill count={statusRequests.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="mt-4 space-y-3">
          {draftProperties.length === 0 ? (
            <EmptyTab message={t("No draft listings awaiting attention.")} />
          ) : (
            draftProperties.map((p) => (
              <DraftCard
                key={p.id}
                property={p}
                staleDraftDays={staleDraftDays}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="listings" className="mt-4 space-y-3">
          {properties.length === 0 ? (
            <EmptyTab message={t("No new listings pending review.")} />
          ) : (
            properties.map((p) => (
              <ListingCard
                key={p.id}
                property={p}
                busy={mutations.approve.isPending || mutations.reject.isPending}
                onApprove={() =>
                  runAction(
                    () => mutations.approve.mutateAsync(p.id),
                    "Property approved",
                  )
                }
                onReject={() =>
                  openNoteDialog({
                    title: t("Reject listing"),
                    description: t("Review note / rejection reason"),
                    confirmLabel: t("Reject"),
                    destructive: true,
                    onConfirm: async (note) => {
                      await mutations.reject.mutateAsync({
                        propertyId: p.id,
                        note,
                      });
                      toast.success(t("Property rejected"));
                    },
                  })
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="edits" className="mt-4 space-y-4">
          {changeRequests.length === 0 ? (
            <EmptyTab message={t("No edit requests pending review.")} />
          ) : (
            changeRequests.map((r) => (
              <EditRequestCard
                key={r.id}
                request={r}
                formatDiff={formatDiff}
                amenityDiff={amenityDiff}
                labelAmenity={labelAmenity}
                accepted={acceptedFor(r.id, r.images_added ?? [])}
                onToggleImage={(url) =>
                  toggleImage(r.id, r.images_added ?? [], url)
                }
                busy={
                  mutations.reviewChangeRequest.isPending ||
                  mutations.reviewChangeRequestImages.isPending ||
                  mutations.cancelChangeRequest.isPending
                }
                onApprove={() =>
                  runAction(
                    () =>
                      mutations.reviewChangeRequest.mutateAsync({
                        id: r.id,
                        decision: "approved",
                      }),
                    "Change request approved",
                  )
                }
                onChangesRequested={() =>
                  openNoteDialog({
                    title: t("Changes Requested"),
                    description: t("Review note / rejection reason"),
                    confirmLabel: t("Changes Requested"),
                    onConfirm: async (note) => {
                      await mutations.reviewChangeRequest.mutateAsync({
                        id: r.id,
                        decision: "changes_requested",
                        note,
                      });
                      toast.success(t("Changes Requested"));
                    },
                  })
                }
                onReject={() =>
                  openNoteDialog({
                    title: t("Reject change request"),
                    description: t("Review note / rejection reason"),
                    confirmLabel: t("Reject"),
                    destructive: true,
                    onConfirm: async (note) => {
                      await mutations.reviewChangeRequest.mutateAsync({
                        id: r.id,
                        decision: "rejected",
                        note,
                      });
                      toast.success(t("Change request rejected"));
                    },
                  })
                }
                onDelete={() =>
                  runAction(
                    () => mutations.cancelChangeRequest.mutateAsync(r.id),
                    "Change request deleted",
                  )
                }
                onApprovePhotos={() =>
                  runAction(
                    () =>
                      mutations.reviewChangeRequestImages.mutateAsync({
                        id: r.id,
                        decision: "approved",
                        acceptedAddedUrls: acceptedFor(
                          r.id,
                          r.images_added ?? [],
                        ),
                      }),
                    "Photos approved",
                  )
                }
                onRejectPhotos={() =>
                  openNoteDialog({
                    title: t("Reject photos"),
                    description: t("Reason for rejecting photos"),
                    confirmLabel: t("Reject photos"),
                    destructive: true,
                    onConfirm: async (note) => {
                      await mutations.reviewChangeRequestImages.mutateAsync({
                        id: r.id,
                        decision: "rejected",
                        note,
                      });
                      toast.success(t("Photos rejected"));
                    },
                  })
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="status" className="mt-4 space-y-3">
          {statusRequests.length === 0 ? (
            <EmptyTab message={t("No status changes pending review.")} />
          ) : (
            statusRequests.map((r) => (
              <StatusRequestCard
                key={r.id}
                request={r}
                busy={mutations.reviewStatusRequest.isPending}
                onApprove={() =>
                  runAction(
                    () =>
                      mutations.reviewStatusRequest.mutateAsync({
                        id: r.id,
                        decision: "approved",
                      }),
                    "Status change approved",
                  )
                }
                onReject={() =>
                  openNoteDialog({
                    title: t("Reject status change"),
                    description: t("Review note / rejection reason"),
                    confirmLabel: t("Reject"),
                    destructive: true,
                    onConfirm: async (note) => {
                      await mutations.reviewStatusRequest.mutateAsync({
                        id: r.id,
                        decision: "rejected",
                        note,
                      });
                      toast.success(t("Status change rejected"));
                    },
                  })
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(noteDialog)}
        onOpenChange={(open) => {
          if (!open && !noteSubmitting) {
            setNoteDialog(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{noteDialog?.title}</DialogTitle>
            {noteDialog?.description ? (
              <DialogDescription>{noteDialog.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder={t("Review note / rejection reason")}
            disabled={noteSubmitting}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={noteSubmitting}
              onClick={() => {
                setNoteDialog(null);
                setNoteText("");
              }}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant={noteDialog?.destructive ? "destructive" : "default"}
              disabled={noteSubmitting || !noteText.trim()}
              onClick={() => void submitNoteDialog()}
            >
              {noteSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                noteDialog?.confirmLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        count > 0
          ? "bg-amber-500/15 text-amber-800"
          : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function DraftCard({
  property,
  staleDraftDays,
}: {
  property: Property & { is_stale: boolean };
  staleDraftDays: number;
}) {
  const { t } = useTranslation();
  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-[var(--shadow-subtle)] sm:p-5",
        property.is_stale
          ? "border-amber-500/40 bg-amber-500/[0.03]"
          : "border-border/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Draft listing")}
            </p>
            {property.is_stale ? (
              <Badge
                variant="secondary"
                className="border-amber-500/25 bg-amber-500/15 text-amber-800"
              >
                {t("Unreviewed for {{count}}+ days", { count: staleDraftDays })}
              </Badge>
            ) : null}
          </div>
          <Link
            href={`/company/properties/${property.id}`}
            className="font-outfit text-base font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {propertyHeading(property.code, property.title, property.id)}
          </Link>
          <p className="text-sm text-muted-foreground">
            {[property.listing_type, property.emirate, property.city]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Agent has not submitted this listing for review yet.")}
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/company/properties/${property.id}`}>
            {t("Open property")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

function ListingCard({
  property,
  busy,
  onApprove,
  onReject,
}: {
  property: Property;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-subtle)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("New listing")}
          </p>
          <Link
            href={`/company/properties/${property.id}`}
            className="font-outfit text-base font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {propertyHeading(property.code, property.title, property.id)}
          </Link>
          <p className="text-sm text-muted-foreground">
            {[property.listing_type, property.emirate, property.city]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check className="h-4 w-4" />
            {t("Approve")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={onReject}
          >
            <X className="h-4 w-4" />
            {t("Reject")}
          </Button>
        </div>
      </div>
    </article>
  );
}

function EditRequestCard({
  request,
  formatDiff,
  amenityDiff,
  labelAmenity,
  accepted,
  onToggleImage,
  busy,
  onApprove,
  onChangesRequested,
  onReject,
  onDelete,
  onApprovePhotos,
  onRejectPhotos,
}: {
  request: PropertyChangeRequestWithProperty;
  formatDiff: (field: string, value: unknown) => string;
  amenityDiff: (
    before: unknown,
    after: unknown,
  ) => { removed: string[]; added: string[] };
  labelAmenity: (slug: string) => string;
  accepted: string[];
  onToggleImage: (url: string) => void;
  busy: boolean;
  onApprove: () => void;
  onChangesRequested: () => void;
  onReject: () => void;
  onDelete: () => void;
  onApprovePhotos: () => void;
  onRejectPhotos: () => void;
}) {
  const { t, i18n } = useTranslation();
  const fields = (request.changed_fields ?? []).filter(
    (field) => field !== "images",
  );
  const imagesAdded = request.images_added ?? [];
  const imagesRemoved = request.images_removed ?? [];
  const awaitingAgentFixes = request.status === "changes_requested";

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-subtle)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Edit request")}
            </p>
            {awaitingAgentFixes ? (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {t("Changes Requested")}
              </span>
            ) : (
              <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                {t("Pending")}
              </span>
            )}
          </div>
          <Link
            href={`/company/properties/${request.property_id}`}
            className="font-outfit text-base font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {propertyHeading(
              request.property_code,
              request.property_title,
              request.property_id,
            )}
          </Link>
          <p className="text-xs text-muted-foreground">
            {t("{{count}} field changes", { count: fields.length })}
            {imagesAdded.length || imagesRemoved.length
              ? ` · ${t("Photo updates")}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {awaitingAgentFixes ? (
            <>
              <Button size="sm" disabled={busy} onClick={onApprove}>
                <Check className="h-4 w-4" />
                {t("Approve")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={onDelete}
              >
                <X className="h-4 w-4" />
                {t("Delete request")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" disabled={busy} onClick={onApprove}>
                <Check className="h-4 w-4" />
                {t("Approve")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={onChangesRequested}
              >
                {t("Changes Requested")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={onReject}
              >
                <X className="h-4 w-4" />
                {t("Reject")}
              </Button>
            </>
          )}
        </div>
      </div>

      {awaitingAgentFixes && request.review_note ? (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-amber-950">
            {t("Edit request was not approved — changes required")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            <span className="font-medium text-muted-foreground">
              {t("Review note")}:{" "}
            </span>
            {request.review_note}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "You can still approve these edits, or delete the request when done.",
            )}
          </p>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <ul className="divide-y divide-border/40">
          {fields.map((field) => {
            const before = request.current_data?.[field];
            const after = request.proposed_data?.[field];
            if (field === "amenities") {
              const { removed, added } = amenityDiff(before, after);
              return (
                <li key={field} className="px-4 py-3 sm:px-5">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {propertyFieldLabel(field, t, i18n)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {removed.map((slug) => (
                      <span
                        key={`rm-${slug}`}
                        className="inline-flex items-center rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-800 line-through"
                      >
                        {labelAmenity(slug)}
                      </span>
                    ))}
                    {added.map((slug) => (
                      <span
                        key={`add-${slug}`}
                        className="inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-800"
                      >
                        {labelAmenity(slug)}
                      </span>
                    ))}
                    {removed.length === 0 && added.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </li>
              );
            }

            return (
              <li
                key={field}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:px-5"
              >
                <p className="text-sm font-medium text-foreground">
                  {propertyFieldLabel(field, t, i18n)}
                </p>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="break-words text-rose-700/90 line-through decoration-rose-700/40">
                    {formatDiff(field, before)}
                  </span>
                  <span
                    className="inline-block text-muted-foreground rtl:rotate-180"
                    aria-hidden
                  >
                    →
                  </span>
                  <span className="break-words font-medium text-emerald-800">
                    {formatDiff(field, after)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {imagesAdded.length > 0 || imagesRemoved.length > 0 ? (
        <div className="space-y-3 border-t border-border/50 px-4 py-4 sm:px-5">
          {imagesAdded.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                {t("New photos — approve or reject")} ({imagesAdded.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {imagesAdded.map((url) => {
                  const selected = accepted.includes(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      title={
                        selected
                          ? t("Selected for approval")
                          : t("Click to exclude")
                      }
                      onClick={() => onToggleImage(url)}
                      className={cn(
                        "relative overflow-hidden rounded-lg border",
                        selected
                          ? "border-emerald-500 ring-2 ring-emerald-500/35"
                          : "border-rose-400/50 opacity-50",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {imagesRemoved.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-rose-800">
                {t("Images to remove")} ({imagesRemoved.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {imagesRemoved.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-rose-500/30 object-cover opacity-70 sm:h-20 sm:w-20"
                  />
                ))}
              </div>
            </div>
          ) : null}
          {!awaitingAgentFixes ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busy ||
                  (accepted.length === 0 && imagesRemoved.length === 0)
                }
                onClick={onApprovePhotos}
              >
                {t("Approve photos")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={onRejectPhotos}
              >
                {t("Reject photos")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StatusRequestCard({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: PropertyStatusChangeRequestWithProperty;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-subtle)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("Final status request")}
          </p>
          <Link
            href={`/company/properties/${request.property_id}`}
            className="font-outfit text-base font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {propertyHeading(
              request.property_code,
              request.property_title,
              request.property_id,
            )}
          </Link>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-800 line-through">
              {i18n.exists(request.previous_status)
                ? t(request.previous_status)
                : request.previous_status}
            </span>
            <span className="inline-block text-muted-foreground rtl:rotate-180" aria-hidden>
              →
            </span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-800">
              {i18n.exists(request.new_status)
                ? t(request.new_status)
                : request.new_status}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check className="h-4 w-4" />
            {t("Approve")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={onReject}
          >
            <X className="h-4 w-4" />
            {t("Reject")}
          </Button>
        </div>
      </div>
    </article>
  );
}
