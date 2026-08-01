"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  Pencil,
  ShieldAlert,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { canViewRevenue } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  revenueAgentAvatarUrl,
  revenueAgentLabel,
  revenueClientAvatarUrl,
  revenueClientLabel,
  revenueOwnerLabel,
} from "@/lib/revenueLabels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import {
  useApproveCommission,
  useApproveRevenue,
  useMarkCommissionPaid,
  useRejectCommission,
  useRejectRevenue,
  useRevenue,
  useUpdateRevenue,
} from "@/hooks/queries/useRevenues";
import RevenueChangeLogPanel from "@/components/company/revenue/RevenueChangeLogPanel";
import EditDealDialog from "@/components/company/revenue/EditDealDialog";
import RejectionNoteDialog from "@/components/company/revenue/RejectionNoteDialog";

function statusBadgeClass(status: string) {
  if (status === "approved") {
    return "bg-emerald-500/10 border-emerald-500/25 text-emerald-700";
  }
  if (status === "rejected") {
    return "bg-rose-500/10 border-rose-500/25 text-rose-700";
  }
  return "bg-amber-500/10 border-amber-500/25 text-amber-700";
}

export default function RevenueDetailView({ revenueId }: { revenueId: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const canManage = canViewRevenue(currentUser?.role);

  const {
    data: revenue,
    isLoading,
    isError,
    error,
  } = useRevenue(canManage ? company?.id : undefined, revenueId);

  const approveDealMutation = useApproveRevenue();
  const rejectDealMutation = useRejectRevenue();
  const approveCommissionMutation = useApproveCommission();
  const rejectCommissionMutation = useRejectCommission();
  const paidMutation = useMarkCommissionPaid();
  const updateMutation = useUpdateRevenue();
  const [editDealOpen, setEditDealOpen] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<
    null | "deal" | "commission"
  >(null);

  const isBusy =
    approveDealMutation.isPending ||
    rejectDealMutation.isPending ||
    approveCommissionMutation.isPending ||
    rejectCommissionMutation.isPending ||
    paidMutation.isPending ||
    updateMutation.isPending;

  if (!canManage) {
    return (
      <div className="flex justify-center items-center px-4 py-16">
        <div className="bg-card shadow-[var(--shadow-subtle)] mx-auto p-8 border border-border/60 rounded-2xl max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 w-12 h-12 text-destructive" />
          <h2 className="mb-2 font-outfit font-bold text-foreground text-2xl">
            {t("Access Denied")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t(
              "You do not have permission to view the revenue page. This area is restricted to company managers.",
            )}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl space-y-4">
        <Skeleton className="w-40 h-9" />
        <Skeleton className="w-full h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !revenue || !company?.id) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-16 container max-w-6xl text-center">
        <p className="font-outfit font-semibold text-lg">
          {error instanceof Error
            ? error.message
            : t("Revenue record not found.")}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/company/revenue")}
        >
          {t("Back to Revenue")}
        </Button>
      </div>
    );
  }

  const commission = Number(revenue.commission_value) || 0;
  const location = [revenue.emirate, revenue.area_district]
    .filter(Boolean)
    .join(" · ");
  const dealStatus = revenue.approval_status || "pending";
  const commissionStatus = revenue.commission_approval_status || "pending";
  const dealApproved = dealStatus === "approved";
  const commissionApproved = commissionStatus === "approved";
  const agentName = revenueAgentLabel(revenue, language);
  const clientName = revenueClientLabel(revenue, language);
  const ownerName = revenueOwnerLabel(revenue, language);
  const agentAvatar = revenueAgentAvatarUrl(revenue);
  const clientAvatar = revenueClientAvatarUrl(revenue);

  const run = async (
    action: Promise<{ data?: unknown; error?: string }>,
    message: string,
  ) => {
    const result = await action;
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(message);
  };

  const saveDeal = async (values: {
    commission_value: number;
    notes: string;
  }) => {
    const result = await updateMutation.mutateAsync({
      id: revenue.id,
      companyId: company.id,
      input: {
        commission_value: values.commission_value,
        notes: values.notes || null,
      },
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("Deal updated"));
    setEditDealOpen(false);
  };

  const confirmReject = async (note: string) => {
    if (!rejectTarget) return;
    const result =
      rejectTarget === "deal"
        ? await rejectDealMutation.mutateAsync({
            id: revenue.id,
            companyId: company.id,
            note,
          })
        : await rejectCommissionMutation.mutateAsync({
            id: revenue.id,
            companyId: company.id,
            note,
          });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      rejectTarget === "deal" ? t("Deal rejected") : t("Commission rejected"),
    );
    setRejectTarget(null);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl space-y-6">
      <div>
        <Link href="/company/revenue">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 h-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="me-2 rtl:rotate-180 w-4 h-4" />
            {t("Back to Revenue")}
          </Button>
        </Link>
      </div>

      <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        <div
          className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.08] to-transparent h-28 pointer-events-none"
          aria-hidden
        />
        <div className="relative p-5 sm:p-7 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 font-medium",
                    statusBadgeClass(dealStatus),
                  )}
                >
                  {t("Deal")}: {t(dealStatus)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 font-medium",
                    statusBadgeClass(commissionStatus),
                  )}
                >
                  {t("Commission")}: {t(commissionStatus)}
                </Badge>
                {revenue.commission_paid ? (
                  <Badge
                    variant="outline"
                    className="bg-sky-500/10 border-sky-500/25 text-sky-700 text-[10px] px-1.5 py-0 h-5"
                  >
                    {t("Paid")}
                  </Badge>
                ) : null}
              </div>
              <h1
                className="font-mono font-bold text-primary text-xl sm:text-2xl tracking-wide"
                dir="ltr"
              >
                {revenue.property_code}
              </h1>
              {location ? (
                <p className="flex items-center gap-1.5 mt-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                  <span>{location}</span>
                </p>
              ) : null}
              <p className="flex items-center gap-1.5 mt-2 text-muted-foreground text-sm">
                <CalendarDays className="w-4 h-4 text-primary/70 shrink-0" />
                <span>
                  {format(
                    new Date(revenue.deal_completion_date),
                    "d MMM yyyy",
                    { locale: dateLocale },
                  )}
                </span>
              </p>
            </div>

            <div className="sm:text-end shrink-0">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {t("Commission")}
              </p>
              <p
                className="inline-flex items-center gap-1.5 mt-1 font-outfit font-bold text-primary text-3xl tabular-nums"
                dir="ltr"
              >
                <DirhamIcon className="w-6 h-6" title={t("AED")} />
                {formatAedAmount(commission)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative p-5 sm:p-7 space-y-4">
          <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
            <div className="flex items-center gap-3 bg-muted/30 px-4 py-3.5 border border-border/50 rounded-xl">
              <Avatar className="w-10 h-10 shrink-0 ring-1 ring-primary/15">
                {agentAvatar ? (
                  <AvatarImage src={agentAvatar} alt={agentName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 font-semibold text-primary text-sm">
                  {(agentName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider">
                  {t("Agent")}
                </p>
                <p className="font-semibold text-sm truncate">
                  {agentName || t("Unassigned")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 px-4 py-3.5 border border-border/50 rounded-xl">
              <Avatar className="w-10 h-10 shrink-0">
                {clientAvatar ? (
                  <AvatarImage src={clientAvatar} alt={clientName} />
                ) : null}
                <AvatarFallback className="bg-background border border-border/50 text-primary/70 text-sm font-semibold">
                  {(clientName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider">
                  {t("Client")}
                </p>
                {revenue.client_id ? (
                  <Link
                    href={`/company/clients/${revenue.client_id}`}
                    className="font-semibold text-sm hover:text-primary truncate block transition-colors"
                  >
                    {clientName}
                  </Link>
                ) : (
                  <p className="font-semibold text-sm truncate">{clientName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 px-4 py-3.5 border border-border/50 rounded-xl">
              <span className="flex justify-center items-center bg-background border border-border/50 rounded-lg w-10 h-10 shrink-0">
                <UserRound className="w-4 h-4 text-primary/70" />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wider">
                  {t("Owner")}
                </p>
                <p className="font-semibold text-sm truncate">{ownerName}</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/20 px-4 py-3 border border-border/40 rounded-xl">
            <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1">
              {t("Notes")}
            </p>
            <p className="text-sm leading-relaxed">
              {revenue.notes?.trim() || t("No notes yet.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            {dealStatus === "pending" ? (
              <>
                <Button
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() =>
                    void run(
                      approveDealMutation.mutateAsync({
                        id: revenue.id,
                        companyId: company.id,
                      }),
                      t("Deal approved"),
                    )
                  }
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("Approve deal")}
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() => setRejectTarget("deal")}
                >
                  <X className="w-4 h-4" />
                  {t("Reject deal")}
                </Button>
              </>
            ) : null}

            {dealApproved && commissionStatus === "pending" ? (
              <>
                <Button
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() =>
                    void run(
                      approveCommissionMutation.mutateAsync({
                        id: revenue.id,
                        companyId: company.id,
                      }),
                      t("Commission approved"),
                    )
                  }
                >
                  <Check className="w-4 h-4" />
                  {t("Approve commission")}
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() => setRejectTarget("commission")}
                >
                  <X className="w-4 h-4" />
                  {t("Reject commission")}
                </Button>
              </>
            ) : null}

            {dealApproved && commissionApproved ? (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={isBusy}
                onClick={() =>
                  void run(
                    paidMutation.mutateAsync({
                      id: revenue.id,
                      companyId: company.id,
                      paid: !revenue.commission_paid,
                    }),
                    revenue.commission_paid
                      ? t("Commission marked unpaid")
                      : t("Commission marked paid"),
                  )
                }
              >
                <WalletCards className="w-4 h-4" />
                {revenue.commission_paid ? t("Mark unpaid") : t("Mark paid")}
              </Button>
            ) : null}

            {dealStatus !== "rejected" ? (
              <Button
                variant="ghost"
                className="gap-1.5"
                disabled={isBusy}
                onClick={() => setEditDealOpen(true)}
              >
                <Pencil className="w-4 h-4" />
                {t("Edit deal")}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <EditDealDialog
        open={editDealOpen}
        onOpenChange={setEditDealOpen}
        currentAmount={commission}
        currentNotes={revenue.notes}
        propertyCode={revenue.property_code}
        isSubmitting={updateMutation.isPending}
        onConfirm={(values) => {
          void saveDeal(values);
        }}
      />

      <RejectionNoteDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title={
          rejectTarget === "deal"
            ? t("Reject deal")
            : t("Reject commission")
        }
        description={
          rejectTarget === "deal"
            ? t(
                "This deal will be rejected. Please provide a clear reason for the audit log.",
              )
            : t(
                "This commission will be rejected. Please provide a clear reason for the audit log.",
              )
        }
        confirmLabel={
          rejectTarget === "deal"
            ? t("Reject deal")
            : t("Reject commission")
        }
        propertyCode={revenue.property_code}
        isSubmitting={
          rejectDealMutation.isPending || rejectCommissionMutation.isPending
        }
        onConfirm={(note) => {
          void confirmReject(note);
        }}
      />

      <RevenueChangeLogPanel companyId={company.id} revenueId={revenue.id} />
    </div>
  );
}
