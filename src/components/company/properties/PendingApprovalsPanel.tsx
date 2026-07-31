"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  usePendingPropertyApprovals,
  usePropertyApprovalMutations,
} from "@/hooks/queries/usePropertyApprovals";
import { canApproveProperties } from "@/lib/permissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDiffValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function promptRejectionNote(label: string): string | null {
  const note = window.prompt(label);
  if (note == null) return null;
  const trimmed = note.trim();
  if (!trimmed) {
    toast.error(label);
    return null;
  }
  return trimmed;
}

export default function PendingApprovalsPanel() {
  const { t } = useTranslation();
  const { company, currentUser } = useCompanyAuth();
  const canReview = canApproveProperties(currentUser?.role);
  const { data, isLoading } = usePendingPropertyApprovals(
    canReview ? company?.id : undefined,
  );
  const mutations = usePropertyApprovalMutations(company?.id);
  const [acceptedImagesByRequest, setAcceptedImagesByRequest] = useState<
    Record<string, string[]>
  >({});

  if (!canReview) return null;

  const properties = data?.pendingProperties ?? [];
  const changeRequests = data?.changeRequests ?? [];
  const statusRequests = data?.statusChangeRequests ?? [];
  const total =
    properties.length + changeRequests.length + statusRequests.length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        {t("Loading...")}
      </div>
    );
  }

  if (total === 0) return null;

  const acceptedFor = (requestId: string, imagesAdded: string[]) => {
    if (acceptedImagesByRequest[requestId]) {
      return acceptedImagesByRequest[requestId];
    }
    return imagesAdded;
  };

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

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">{t("Pending Approvals")}</h2>
        <Badge variant="secondary">{total}</Badge>
      </div>

      {properties.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("New properties")}
          </p>
          {properties.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2"
            >
              <Link
                href={`/company/properties/${p.id}`}
                className="text-sm font-medium hover:text-primary"
              >
                {p.code} — {p.title}
              </Link>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    mutations.approve.isPending || mutations.reject.isPending
                  }
                  onClick={async () => {
                    try {
                      await mutations.approve.mutateAsync(p.id);
                      toast.success(t("Property approved"));
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : t("Something went wrong"),
                      );
                    }
                  }}
                >
                  {t("Approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={
                    mutations.approve.isPending || mutations.reject.isPending
                  }
                  onClick={async () => {
                    const note = promptRejectionNote(
                      t("Review note / rejection reason"),
                    );
                    if (!note) return;
                    try {
                      await mutations.reject.mutateAsync({
                        propertyId: p.id,
                        note,
                      });
                      toast.success(t("Property rejected"));
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : t("Something went wrong"),
                      );
                    }
                  }}
                >
                  {t("Reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {changeRequests.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Property edit requests")}
          </p>
          {changeRequests.slice(0, 5).map((r) => {
            const fields = (r.changed_fields ?? []).filter(
              (field) => field !== "images",
            );
            const imagesAdded = r.images_added ?? [];
            const imagesRemoved = r.images_removed ?? [];
            const accepted = acceptedFor(r.id, imagesAdded);
            return (
              <div
                key={r.id}
                className="space-y-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/company/properties/${r.property_id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {t("Edit request")} · {r.property_id.slice(0, 8)}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutations.reviewChangeRequest.isPending}
                      onClick={async () => {
                        try {
                          await mutations.reviewChangeRequest.mutateAsync({
                            id: r.id,
                            decision: "approved",
                          });
                          toast.success(t("Change request approved"));
                        } catch (e) {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : t("Something went wrong"),
                          );
                        }
                      }}
                    >
                      {t("Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={mutations.reviewChangeRequest.isPending}
                      onClick={async () => {
                        const note = promptRejectionNote(
                          t("Review note / rejection reason"),
                        );
                        if (!note) return;
                        try {
                          await mutations.reviewChangeRequest.mutateAsync({
                            id: r.id,
                            decision: "changes_requested",
                            note,
                          });
                          toast.success(t("Changes Requested"));
                        } catch (e) {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : t("Something went wrong"),
                          );
                        }
                      }}
                    >
                      {t("Changes Requested")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={mutations.reviewChangeRequest.isPending}
                      onClick={async () => {
                        const note = promptRejectionNote(
                          t("Review note / rejection reason"),
                        );
                        if (!note) return;
                        try {
                          await mutations.reviewChangeRequest.mutateAsync({
                            id: r.id,
                            decision: "rejected",
                            note,
                          });
                          toast.success(t("Change request rejected"));
                        } catch (e) {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : t("Something went wrong"),
                          );
                        }
                      }}
                    >
                      {t("Reject")}
                    </Button>
                  </div>
                </div>
                {fields.length > 0 ? (
                  <ul className="space-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    {fields.map((field) => (
                      <li key={field} className="font-mono break-all">
                        <span className="font-sans font-medium text-foreground/80">
                          {field}
                        </span>
                        {": "}
                        <span className="text-rose-700/90">
                          {formatDiffValue(r.current_data?.[field])}
                        </span>
                        {" → "}
                        <span className="text-emerald-700/90">
                          {formatDiffValue(r.proposed_data?.[field])}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {imagesAdded.length > 0 || imagesRemoved.length > 0 ? (
                  <div className="space-y-2 border-t border-border/40 pt-2">
                    {imagesAdded.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-emerald-800">
                          {t("New photos — approve or reject")} (
                          {imagesAdded.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
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
                                onClick={() =>
                                  toggleImage(r.id, imagesAdded, url)
                                }
                                className={cn(
                                  "relative rounded-md border overflow-hidden",
                                  selected
                                    ? "border-emerald-500 ring-2 ring-emerald-500/40"
                                    : "border-rose-400/50 opacity-50",
                                )}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  className="h-14 w-14 object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {imagesRemoved.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-rose-800">
                          {t("Images to remove")} ({imagesRemoved.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {imagesRemoved.map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url}
                              src={url}
                              alt=""
                              className="h-14 w-14 rounded-md border border-rose-500/30 object-cover opacity-70"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={
                          mutations.reviewChangeRequestImages.isPending ||
                          (accepted.length === 0 && imagesRemoved.length === 0)
                        }
                        onClick={async () => {
                          try {
                            await mutations.reviewChangeRequestImages.mutateAsync(
                              {
                                id: r.id,
                                decision: "approved",
                                acceptedAddedUrls: accepted,
                              },
                            );
                            toast.success(t("Photos approved"));
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : t("Something went wrong"),
                            );
                          }
                        }}
                      >
                        {t("Approve photos")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        disabled={mutations.reviewChangeRequestImages.isPending}
                        onClick={async () => {
                          const note = promptRejectionNote(
                            t("Reason for rejecting photos"),
                          );
                          if (!note) return;
                          try {
                            await mutations.reviewChangeRequestImages.mutateAsync(
                              {
                                id: r.id,
                                decision: "rejected",
                                note,
                              },
                            );
                            toast.success(t("Photos rejected"));
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : t("Something went wrong"),
                            );
                          }
                        }}
                      >
                        {t("Reject photos")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {statusRequests.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Final status requests")}
          </p>
          {statusRequests.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2"
            >
              <Link
                href={`/company/properties/${r.property_id}`}
                className="text-sm font-medium hover:text-primary"
              >
                {r.previous_status} → {r.new_status}
              </Link>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutations.reviewStatusRequest.isPending}
                  onClick={async () => {
                    try {
                      await mutations.reviewStatusRequest.mutateAsync({
                        id: r.id,
                        decision: "approved",
                      });
                      toast.success(t("Status change approved"));
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : t("Something went wrong"),
                      );
                    }
                  }}
                >
                  {t("Approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={mutations.reviewStatusRequest.isPending}
                  onClick={async () => {
                    const note = promptRejectionNote(
                      t("Review note / rejection reason"),
                    );
                    if (!note) return;
                    try {
                      await mutations.reviewStatusRequest.mutateAsync({
                        id: r.id,
                        decision: "rejected",
                        note,
                      });
                      toast.success(t("Status change rejected"));
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : t("Something went wrong"),
                      );
                    }
                  }}
                >
                  {t("Reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
