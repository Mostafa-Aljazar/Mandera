"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  writeWorkbookAndDownload,
  readWorkbookFromFile,
  type ImportEmployeeOption,
} from "@/lib/importExport/shared";
import { buildOwnerImportTemplate } from "@/lib/importExport/ownerTemplate";
import { parseOwnerImportWorkbook } from "@/lib/importExport/ownerImportParser";
import type { OwnerImportRow, ParsedImportRow } from "@/lib/importExport/types";
import { useBulkCreateOwners } from "@/hooks/queries/useOwners";
import { checkExistingOwnerPhones } from "@/actions/owners";
import { getPropertyCodesForCompany, type PropertyCodeOption } from "@/actions/properties";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface ImportOwnersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  employees: ImportEmployeeOption[];
  marketingChannels: string[];
  language: string;
}

type Step = "idle" | "parsing" | "preview" | "submitting";

export default function ImportOwnersDialog({
  isOpen,
  onClose,
  companyId,
  employees,
  marketingChannels,
  language,
}: ImportOwnersDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedImportRow<OwnerImportRow>[]>([]);
  const [propertyCodes, setPropertyCodes] = useState<PropertyCodeOption[]>([]);
  const [isLoadingPropertyCodes, setIsLoadingPropertyCodes] = useState(false);
  const bulkCreate = useBulkCreateOwners();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingPropertyCodes(true);
    getPropertyCodesForCompany(companyId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        toast.error(result.error);
      } else {
        setPropertyCodes(result.data);
      }
      setIsLoadingPropertyCodes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const validRows = rows.filter((r) => r.data).map((r) => r.data as OwnerImportRow);
  const errorRows = rows.filter((r) => r.errors);

  const reset = () => {
    setStep("idle");
    setFileName(null);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const workbook = await buildOwnerImportTemplate({
        employees,
        propertyCodes,
        marketingChannels,
        language,
      });
      await writeWorkbookAndDownload(workbook, "owners_import_template.xlsx");
    } catch (err) {
      console.error(err);
      toast.error(t("Import failed: {{error}}", { error: (err as Error).message }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error(t("Only .xlsx files are supported"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("Only .xlsx files are supported"));
      return;
    }

    setFileName(file.name);
    setStep("parsing");
    try {
      const workbook = await readWorkbookFromFile(file);
      const firstPass = parseOwnerImportWorkbook(workbook, {
        employees,
        propertyCodes,
        language,
        t,
        existingPhones: new Set(),
      });

      const candidatePhones = firstPass
        .filter((r) => r.data)
        .map((r) => (r.data as OwnerImportRow).phone);
      const dupCheck = await checkExistingOwnerPhones(companyId, candidatePhones);
      if (dupCheck.error) throw new Error(dupCheck.error);

      const existingPhones = new Set(dupCheck.data);
      const parsed =
        existingPhones.size > 0
          ? parseOwnerImportWorkbook(workbook, {
              employees,
              propertyCodes,
              language,
              t,
              existingPhones,
            })
          : firstPass;

      setRows(parsed);
      setStep("preview");
    } catch (err) {
      console.error(err);
      toast.error(t("Import failed: {{error}}", { error: (err as Error).message }));
      setStep("idle");
    }
  };

  const handleConfirm = async () => {
    if (validRows.length === 0) return;
    setStep("submitting");
    try {
      const result = await bulkCreate.mutateAsync({ companyId, rows: validRows });
      if (result.error) {
        toast.error(t("Import failed: {{error}}", { error: result.error }));
        setStep("preview");
        return;
      }
      toast.success(
        t("Successfully imported {{count}} owner(s)", {
          count: result.data.inserted,
        }),
      );
      handleClose();
    } catch (err) {
      toast.error(t("Import failed: {{error}}", { error: (err as Error).message }));
      setStep("preview");
    }
  };

  const inputsDisabled = isLoadingPropertyCodes || step === "parsing";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {t("Import Owners")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={isLoadingPropertyCodes}
            className="gap-2 w-full rounded-xl h-10"
          >
            {isLoadingPropertyCodes ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("Download Template")}
          </Button>

          <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-muted/20 px-4">
            <AccordionItem value="how-it-works" className="border-none">
              <AccordionTrigger className="gap-2 text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2 text-start">
                  <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                  {t("How does importing owners work?")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                <div
                  className="portal-help-content rich-text-content"
                  dangerouslySetInnerHTML={{ __html: t("owner_import_help_html") }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={inputsDisabled}
              className="hidden"
              id="import-owners-file"
            />
            <label
              htmlFor="import-owners-file"
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center cursor-pointer hover:bg-muted/40 transition-colors",
                inputsDisabled && "pointer-events-none opacity-60",
              )}
            >
              {step === "parsing" ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {fileName || t("Drag and drop your file here, or click to browse")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Only .xlsx files are supported")}
              </p>
            </label>
          </div>

          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("{{count}} valid row(s) ready to import", { count: validRows.length })}
                </span>
                {errorRows.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("{{count}} row(s) have errors", { count: errorRows.length })}
                  </span>
                )}
              </div>

              {errorRows.length > 0 && (
                <ScrollArea className="h-40 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="space-y-2">
                    {errorRows.map((r) => (
                      <div key={r.row} className="text-xs">
                        <p className="font-medium text-foreground">
                          {t("Row {{row}}", { row: r.row })}
                        </p>
                        <ul className="list-disc ps-4 text-red-700 dark:text-red-300">
                          {r.errors?.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {validRows.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("No valid rows to import")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={step === "submitting"}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={validRows.length === 0 || step === "submitting" || step === "parsing"}
          >
            {step === "submitting" ? (
              <>
                <Loader2 className="me-2 w-4 h-4 animate-spin" />
                {t("Importing...")}
              </>
            ) : (
              t("Confirm Import")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
