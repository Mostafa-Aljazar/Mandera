"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { usePendingApprovalsCount } from "@/hooks/queries/useNotifications";
import { canApproveProperties } from "@/lib/permissions";

/** Compact banner linking admins to the dedicated Approvals page. */
export default function PendingApprovalsBanner() {
  const { t } = useTranslation();
  const { company, currentUser } = useCompanyAuth();
  const canReview = canApproveProperties(currentUser?.role);
  const { data, isLoading } = usePendingApprovalsCount(
    canReview ? company?.id : undefined,
    canReview,
  );

  if (!canReview || isLoading) return null;
  const total = data?.total ?? 0;
  if (total === 0) return null;

  return (
    <Link
      href="/company/approvals"
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 transition-colors hover:bg-amber-500/[0.1]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700">
          <ClipboardCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {t("Pending Approvals")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("{{count}} items awaiting review", { count: total })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="secondary"
          className="border-amber-500/20 bg-amber-500/15 text-amber-800 tabular-nums"
        >
          {total > 99 ? "99+" : total}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
      </div>
    </Link>
  );
}
