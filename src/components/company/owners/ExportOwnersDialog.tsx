"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Download, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  writeWorkbookAndDownload,
  buildSimpleExportWorkbook,
  type ImportEmployeeOption,
} from "@/lib/importExport/shared";
import {
  OWNER_EXPORT_COLUMNS,
  type OwnerStatusOption,
} from "@/lib/importExport/ownerExportColumns";
import { getOwnerStatusAndCounts } from "@/actions/owners";
import type { Owner } from "@/types/supabase-entities.types";

interface ExportOwnersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rows: Owner[];
  /** How many owners are currently checked in the list — 0 means none, so all filtered owners export. */
  selectedCount: number;
  employees: ImportEmployeeOption[];
  companyId: string;
  language: string;
}

export default function ExportOwnersDialog({
  isOpen,
  onClose,
  rows,
  selectedCount,
  employees,
  companyId,
  language,
}: ExportOwnersDialogProps) {
  const { t } = useTranslation();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(OWNER_EXPORT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key)),
  );
  const [exportLanguage, setExportLanguage] = useState(language === "ar" ? "ar" : "en");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingSupplement, setIsLoadingSupplement] = useState(false);
  const [statusByOwnerId, setStatusByOwnerId] = useState<Map<string, OwnerStatusOption | null>>(
    new Map(),
  );
  const [propertiesCountByOwnerId, setPropertiesCountByOwnerId] = useState<
    Map<string, number>
  >(new Map());

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingSupplement(true);
    getOwnerStatusAndCounts(companyId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        toast.error(result.error);
        setIsLoadingSupplement(false);
        return;
      }
      const statusMap = new Map<string, OwnerStatusOption | null>();
      const countMap = new Map<string, number>();
      result.data.forEach((row) => {
        statusMap.set(row.owner_id, {
          name_en: row.status_name_en,
          name_ar: row.status_name_ar,
        });
        countMap.set(row.owner_id, row.properties_count);
      });
      setStatusByOwnerId(statusMap);
      setPropertiesCountByOwnerId(countMap);
      setIsLoadingSupplement(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const selectedColumns = useMemo(
    () => OWNER_EXPORT_COLUMNS.filter((c) => selectedKeys.has(c.key)),
    [selectedKeys],
  );

  const toggleColumn = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0 || rows.length === 0) return;
    setIsExporting(true);
    try {
      const ctx = {
        language: exportLanguage,
        t,
        employees,
        statusByOwnerId,
        propertiesCountByOwnerId,
      };
      const headers = selectedColumns.map((c) => c.getHeader(ctx));
      const data = rows.map((row) => selectedColumns.map((c) => c.getValue(row, ctx)));

      const workbook = await buildSimpleExportWorkbook(
        "Owners",
        headers,
        data,
        exportLanguage === "ar",
      );
      await writeWorkbookAndDownload(
        workbook,
        `owners_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t("Export failed: {{error}}", { error: (err as Error).message }));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {t("Export Owners")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>
              {selectedCount > 0
                ? t(
                    "{{count}} owner(s) are selected in the list — only those will be exported.",
                    { count: selectedCount },
                  )
                : t(
                    "No owners are selected, so all {{count}} owner(s) currently shown will be exported. Check specific owners in the list first to export just those.",
                    { count: rows.length },
                  )}
            </span>
          </div>

          <div className="space-y-2">
            <Label>{t("Export Language")}</Label>
            <div className="flex gap-2">
              {(["en", "ar"] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => setExportLanguage(lng)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    exportLanguage === lng
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {lng === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Columns")}</Label>
            <ScrollArea className="h-56 rounded-xl border border-border/60 p-3">
              <div className="space-y-2.5">
                {OWNER_EXPORT_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`owner-col-${col.key}`}
                      checked={selectedKeys.has(col.key)}
                      onCheckedChange={(checked) =>
                        toggleColumn(col.key, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`owner-col-${col.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {col.getHeader({
                        language,
                        t,
                        employees,
                        statusByOwnerId,
                        propertiesCountByOwnerId,
                      })}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {isLoadingSupplement && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("Loading...")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              selectedColumns.length === 0 ||
              rows.length === 0 ||
              isExporting ||
              isLoadingSupplement
            }
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("Export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
