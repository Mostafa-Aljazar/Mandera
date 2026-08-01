"use client";

import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEmployeeResponseRates } from "@/hooks/queries/useResponseRates";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ResponseRatesWidget({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data = [], isLoading } = useEmployeeResponseRates(companyId);

  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/60">
        <h3 className="font-outfit font-semibold">{t("Employee Response Rates")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Clients with a status update in the last 30 days.")}
        </p>
      </div>
      {isLoading ? (
        <div className="p-5 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("Employee")}</TableHead>
              <TableHead className="w-[7rem] text-center whitespace-nowrap">
                {t("Responded")}
              </TableHead>
              <TableHead className="w-[7rem] text-center whitespace-nowrap">
                {t("Assigned")}
              </TableHead>
              <TableHead className="w-[8rem] text-center whitespace-nowrap">
                {t("Response Rate")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t("No employee response data available.")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.employee_id}>
                  <TableCell className="font-medium text-start">
                    {employeeDisplayName(row, language, row.name) || t("Unnamed")}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.responded}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.total_assigned}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    <span dir="ltr">{row.rate}%</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
