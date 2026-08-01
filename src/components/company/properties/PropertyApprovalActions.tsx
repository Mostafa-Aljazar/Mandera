"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  usePropertyApprovalMutations,
  usePendingChangeRequestForProperty,
  usePropertyReviewFeedback,
} from "@/hooks/queries/usePropertyApprovals";
import {
  canApproveProperties,
  canClassifyProperty,
  canAccessManagerModules,
  canReopenArchivedProperty,
  changeRequestStatusLabel,
  isAdministratorOrAbove,
  isSalesAgent,
} from "@/lib/permissions";
import type { PropertyWithRelations } from "@/types/supabase-entities.types";
import { AlertCircle } from "lucide-react";

type Props = {
  property: PropertyWithRelations & { owner_masked?: boolean };
};

export default function PropertyApprovalActions({ property }: Props) {
  const { t } = useTranslation();
  const { currentUser, company } = useCompanyAuth();
  const companyId = company?.id;
  const role = currentUser?.role;
  const mutations = usePropertyApprovalMutations(companyId);
  const { data: pendingChangeRequest } = usePendingChangeRequestForProperty(
    property.id,
    companyId,
  );
  const [note, setNote] = useState("");
  const [classification, setClassification] = useState<"A" | "B" | "C">(
    (property.classification as "A" | "B" | "C") || "A",
  );
  const [classReason, setClassReason] = useState(
    property.classification_reason || "",
  );
  const [pauseReason, setPauseReason] = useState("");

  const isAgent = isSalesAgent(role);
  const canApprove = canApproveProperties(role);
  const canClassify = canClassifyProperty(role);
  const isManager = canAccessManagerModules(role);
  const canReopen = canReopenArchivedProperty(role);
  const approval = property.approval_status;
  const canCancelPendingChange =
    !!pendingChangeRequest &&
    (pendingChangeRequest.requested_by === currentUser?.id || canApprove);

  const isAssignedAgent =
    isAgent && property.employee_id === currentUser?.id;
  const canSeeReviewFeedback =
    isAdministratorOrAbove(role) || isAssignedAgent;
  const { data: reviewFeedback } = usePropertyReviewFeedback(
    property.id,
    companyId,
    canSeeReviewFeedback,
  );

  const run = async (fn: () => Promise<unknown>, successKey: string) => {
    try {
      await fn();
      toast.success(t(successKey));
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong"));
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t("Approval Status")}:
        </span>
        <span className="text-sm font-semibold capitalize">
          {approval?.replaceAll("_", " ") || "—"}
        </span>
        {property.classification ? (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {t("Class")} {property.classification}
          </span>
        ) : null}
        {property.paused_at ? (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {t("Paused")}
          </span>
        ) : null}
        {property.is_locked ? (
          <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700">
            {t("Locked")}
          </span>
        ) : null}
      </div>

      {canSeeReviewFeedback && reviewFeedback ? (
        <div
          className={
            reviewFeedback.status === "rejected"
              ? "rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-start"
              : "rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3 text-start"
          }
        >
          <p className="flex items-start gap-2 text-sm font-semibold leading-snug">
            <AlertCircle
              className={
                reviewFeedback.status === "rejected"
                  ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  : "mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              }
            />
            <span>
              {reviewFeedback.kind === "listing"
                ? reviewFeedback.status === "rejected"
                  ? t("Listing was not approved")
                  : t("Listing returned for changes")
                : reviewFeedback.status === "rejected"
                  ? t("Edit request was rejected")
                  : t("Edit request was not approved — changes required")}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            <span className="font-medium text-muted-foreground">
              {t("Review note")}:{" "}
            </span>
            {reviewFeedback.note}
          </p>
        </div>
      ) : null}

      {pendingChangeRequest ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              {t("Review request status")}:{" "}
              <span className="font-semibold">
                {t(changeRequestStatusLabel(pendingChangeRequest.status))}
              </span>
              {pendingChangeRequest.changed_fields?.length
                ? ` · ${pendingChangeRequest.changed_fields.join(", ")}`
                : ""}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t(
                "A Pending change request already exists for this property. Cancel it or wait for a decision before submitting a new one.",
              )}
            </p>
          </div>
          {canCancelPendingChange ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutations.cancelChangeRequest.isPending}
              onClick={() =>
                run(
                  () =>
                    mutations.cancelChangeRequest.mutateAsync(
                      pendingChangeRequest.id,
                    ),
                  "Change request cancelled",
                )
              }
            >
              {t("Cancel request")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {isAssignedAgent && (approval === "draft" || approval === "rejected") ? (
        <Button
          size="sm"
          disabled={mutations.submitForReview.isPending}
          onClick={() =>
            run(
              () => mutations.submitForReview.mutateAsync(property.id),
              "Submitted for review",
            )
          }
        >
          {t("Submit for Review")}
        </Button>
      ) : null}

      {isAssignedAgent && approval === "approved" ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Edits to approved properties require a change request and admin review.",
          )}
        </p>
      ) : null}

      {canApprove &&
      (approval === "pending_review" || approval === "draft") ? (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Review note / rejection reason")}
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={mutations.approve.isPending}
              onClick={() =>
                run(
                  () => mutations.approve.mutateAsync(property.id),
                  "Property approved",
                )
              }
            >
              {t("Approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={mutations.returnForChanges.isPending || !note.trim()}
              onClick={() =>
                run(
                  () =>
                    mutations.returnForChanges.mutateAsync({
                      propertyId: property.id,
                      note: note.trim(),
                    }),
                  "Returned for changes",
                )
              }
            >
              {t("Return for Changes")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={mutations.reject.isPending || !note.trim()}
              onClick={() =>
                run(
                  () =>
                    mutations.reject.mutateAsync({
                      propertyId: property.id,
                      note: note.trim(),
                    }),
                  "Property rejected",
                )
              }
            >
              {t("Reject")}
            </Button>
          </div>
        </div>
      ) : null}

      {canClassify ? (
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <div>
            <Label>{t("Classification")}</Label>
            <Select
              value={classification}
              onValueChange={(v) => setClassification(v as "A" | "B" | "C")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("Classification reason")}</Label>
            <Input
              value={classReason}
              onChange={(e) => setClassReason(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              disabled={
                mutations.classify.isPending || !classReason.trim()
              }
              onClick={() =>
                run(
                  () =>
                    mutations.classify.mutateAsync({
                      propertyId: property.id,
                      classification,
                      reason: classReason.trim(),
                    }),
                  "Classification saved",
                )
              }
            >
              {t("Save")}
            </Button>
          </div>
        </div>
      ) : null}

      {canApprove ? (
        <div className="flex flex-wrap items-end gap-2">
          {property.paused_at ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => mutations.unpause.mutateAsync(property.id),
                  "Property resumed",
                )
              }
            >
              {t("Unpause")}
            </Button>
          ) : (
            <>
              <Input
                className="max-w-xs"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder={t("Pause reason")}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!pauseReason.trim()}
                onClick={() =>
                  run(
                    () =>
                      mutations.pause.mutateAsync({
                        propertyId: property.id,
                        reason: pauseReason.trim(),
                      }),
                    "Property paused",
                  )
                }
              >
                {t("Pause Property")}
              </Button>
            </>
          )}
          {isManager ? (
            property.is_locked ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  run(
                    () => mutations.unlock.mutateAsync(property.id),
                    "Record unlocked",
                  )
                }
              >
                {t("Unlock")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  run(
                    () => mutations.lock.mutateAsync(property.id),
                    "Record locked",
                  )
                }
              >
                {t("Lock Record")}
              </Button>
            )
          ) : null}
          {canReopen && property.status === "Archived" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutations.reopenArchived.isPending}
              onClick={() =>
                run(
                  () => mutations.reopenArchived.mutateAsync(property.id),
                  "Property reopened",
                )
              }
            >
              {t("Reopen archived")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
