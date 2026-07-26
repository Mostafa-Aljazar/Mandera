"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Users, Home, Loader2, Medal, ChevronDown } from "lucide-react";
import { useEmployeeLeaderboard } from "@/hooks/queries/useEmployeeLeaderboard";
import { cn } from "@/lib/utils";

interface EmployeeLeaderboardProps {
  companyId?: string;
}

export default function EmployeeLeaderboard({
  companyId,
}: EmployeeLeaderboardProps) {
  const { t } = useTranslation();
  const { data: leaderboardData, isLoading } = useEmployeeLeaderboard(companyId);
  const employeesData = leaderboardData ?? [];
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  function toggleRow(id: string) {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-amber-500/[0.07] to-transparent h-20 pointer-events-none"
        aria-hidden
      />

      <div className="relative flex sm:flex-row flex-col sm:justify-between sm:items-start gap-3 p-5 sm:p-6 border-border/60 border-b">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex justify-center items-center bg-amber-500/10 mt-0.5 border border-amber-500/20 rounded-xl w-10 h-10 text-amber-600 shrink-0">
            <Medal className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
              {t("Team Leaderboard")}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {t(
                "Performance metrics for your team members sorted by active clients.",
              )}
            </p>
          </div>
        </div>
        {!isLoading && employeesData.length > 0 ? (
          <span className="inline-flex self-start items-center bg-muted/70 px-2.5 py-1 rounded-full font-medium text-muted-foreground text-xs tabular-nums">
            {employeesData.length} {t("Employees")}
          </span>
        ) : null}
      </div>

      <div className="relative p-4 sm:p-5">
        {isLoading ? (
          <div className="flex justify-center items-center py-14">
            <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
          </div>
        ) : employeesData.length === 0 ? (
          <div className="bg-muted/20 py-12 border border-border border-dashed rounded-xl text-center">
            <Users className="opacity-40 mx-auto mb-3 w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {t("No employees found for this company.")}
            </p>
          </div>
        ) : (
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-center">{t("Rank")}</TableHead>
                  <TableHead>{t("Employee Name")}</TableHead>
                  <TableHead className="text-end">{t("Clients")}</TableHead>
                  <TableHead className="text-end">{t("Properties")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesData.map((emp, index) => {
                  const isTop = index === 0 && emp.clientsCount > 0;
                  const isExpanded = !!expandedRows[emp.id];

                  return (
                    <FragmentRow
                      key={emp.id}
                      emp={emp}
                      index={index}
                      isTop={isTop}
                      isExpanded={isExpanded}
                      onToggle={() => toggleRow(emp.id)}
                      t={t}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  emp,
  index,
  isTop,
  isExpanded,
  onToggle,
  t,
}: {
  emp: {
    id: string;
    name: string;
    clientsCount: number;
    propertiesCount: number;
    statusCounts: Record<string, number>;
  };
  index: number;
  isTop: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <TableRow
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors",
          isTop
            ? "bg-amber-500/[0.06] hover:bg-amber-500/10 border-s-4 border-s-amber-500"
            : "hover:bg-muted/30",
          isExpanded && !isTop && "bg-muted/20",
        )}
      >
        <TableCell className="text-center font-semibold align-middle">
          {isTop ? (
            <div className="flex justify-center">
              <Trophy className="fill-amber-500/20 w-5 h-5 text-amber-500" />
            </div>
          ) : (
            <span className="text-muted-foreground tabular-nums">
              #{index + 1}
            </span>
          )}
        </TableCell>
        <TableCell className="align-middle">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-medium",
                isTop && "font-bold text-amber-700",
              )}
            >
              {emp.name}
            </span>
            {isTop ? (
              <span className="inline-flex items-center bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold text-amber-700 text-xs">
                {t("Top Performer")}
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-end font-medium align-middle">
          <span className="inline-flex justify-end items-center gap-1.5 tabular-nums">
            {emp.clientsCount}
            <Users className="opacity-50 w-3.5 h-3.5 text-muted-foreground" />
          </span>
        </TableCell>
        <TableCell className="text-end font-medium align-middle">
          <span className="inline-flex justify-end items-center gap-1.5 tabular-nums">
            {emp.propertiesCount}
            <Home className="opacity-50 w-3.5 h-3.5 text-muted-foreground" />
          </span>
        </TableCell>
        <TableCell className="text-end align-middle">
          <ChevronDown
            className={cn(
              "ms-auto w-4 h-4 text-muted-foreground transition-transform duration-300",
              isExpanded && "rotate-180",
            )}
          />
        </TableCell>
      </TableRow>

      {isExpanded ? (
        <TableRow
          className={cn(
            "hover:bg-transparent",
            isTop ? "bg-amber-500/[0.04]" : "bg-muted/10",
          )}
        >
          <TableCell colSpan={5} className="p-0 border-b">
            <div className="flex sm:flex-row flex-col sm:items-center gap-3 md:gap-4 px-4 md:px-10 py-4 border-border/50 border-t">
              <span className="font-semibold text-foreground/80 text-sm shrink-0">
                {t("Status Breakdown:")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(emp.statusCounts).length > 0 ? (
                  Object.entries(emp.statusCounts).map(([status, count]) => {
                    const displayName =
                      status === "__NEW__" ? t("New") : status;
                    return (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 border border-primary/15 rounded-full font-medium text-primary text-xs"
                      >
                        {displayName}
                        <span className="inline-flex justify-center items-center bg-primary/15 px-1.5 rounded-full min-w-5 text-[11px] tabular-nums">
                          {count}
                        </span>
                      </span>
                    );
                  })
                ) : (
                  <span className="bg-muted px-3 py-1 border border-border/50 rounded-full text-muted-foreground text-sm">
                    {t("No client data")}
                  </span>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
