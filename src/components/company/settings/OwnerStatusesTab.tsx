"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useOwnerStatusesSettings,
  useCreateOwnerStatus,
  useUpdateOwnerStatus,
  useDeleteOwnerStatus,
} from "@/hooks/queries/useSettings";
import {
  OwnerStatusSchema,
  type TOwnerStatusSchema,
} from "@/validations/owner-status.schema";
import type { OwnerStatus } from "@/types/supabase-entities.types";
import SettingsSection from "@/components/company/settings/SettingsSection";
import SettingsTableShell from "@/components/company/settings/SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OwnerStatusesTab() {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const companyId = currentUser?.company_id || company?.id;

  const { data: statusesData, isLoading } = useOwnerStatusesSettings(companyId);
  const statuses = useMemo(
    () =>
      [...(statusesData ?? [])].sort((a, b) => {
        if (language === "ar") {
          return a.name_ar.localeCompare(b.name_ar, "ar", {
            sensitivity: "base",
          });
        }
        return a.name_en.localeCompare(b.name_en, "en", {
          sensitivity: "base",
        });
      }),
    [statusesData, language],
  );

  const createMutation = useCreateOwnerStatus();
  const updateMutation = useUpdateOwnerStatus();
  const deleteMutation = useDeleteOwnerStatus();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<OwnerStatus | null>(null);
  const [deleting, setDeleting] = useState<OwnerStatus | null>(null);

  const form = useForm<TOwnerStatusSchema>({
    resolver: zodResolver(OwnerStatusSchema(t)),
    defaultValues: { name_en: "", name_ar: "" },
  });

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name_en: "", name_ar: "" });
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: OwnerStatus) => {
    setEditItem(item);
    form.reset({
      name_en: item.name_en || "",
      name_ar: item.name_ar || "",
    });
    setFormOpen(true);
  };

  const openDelete = (item: OwnerStatus) => {
    setDeleting(item);
    setDeleteOpen(true);
  };

  const handleSave = form.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const nameEn = formData.name_en.trim();
      const nameAr = formData.name_ar.trim();

      if (editItem) {
        const result = await updateMutation.mutateAsync({
          id: editItem.id,
          nameEn,
          nameAr,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner status updated successfully."));
      } else {
        const result = await createMutation.mutateAsync({
          companyId,
          nameEn,
          nameAr,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner status created successfully."));
      }

      setFormOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(
        (error as Error).message || t("An error occurred while saving."),
      );
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const result = await deleteMutation.mutateAsync(deleting.id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Status deleted successfully."));
      setDeleteOpen(false);
      setDeleting(null);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. This status might be in use."));
    }
  };

  return (
    <>
      <SettingsSection
        title={t("Owner Statuses")}
        description={t("Manage status labels for property owners.")}
        icon={UserRound}
        action={
          <Button
            size="sm"
            className="gap-2 w-full sm:w-auto h-9"
            onClick={openAdd}
          >
            <Plus className="w-4 h-4" />
            {t("Add New Status")}
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <SettingsTableShell>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-start">
                    {`${t("Name")} (EN)`}
                  </TableHead>
                  <TableHead className="text-start">
                    {`${t("Name")} (AR)`}
                  </TableHead>
                  <TableHead className="w-[120px] text-end">
                    {t("Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-12 text-muted-foreground text-center"
                    >
                      {t("No owner statuses configured yet.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  statuses.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-start">
                        <span dir="ltr" className="inline-block">
                          {item.name_en}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-start">
                        <span dir="rtl" className="inline-block">
                          {item.name_ar}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="inline-flex gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(item)}
                            aria-label={t("Edit Owner Status")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => openDelete(item)}
                            aria-label={t("Delete Owner Status")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SettingsTableShell>
        )}
      </SettingsSection>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return;
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
          <div className="relative px-6 pt-6 pb-4">
            <div
              className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-3">
              <div className="flex justify-center items-center mx-auto bg-primary/10 ring-4 ring-primary/10 rounded-2xl w-12 h-12 text-primary">
                {editItem ? (
                  <Edit2 className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {editItem ? t("Edit Owner Status") : t("Add Owner Status")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {editItem
                    ? t(
                        "Update the English and Arabic names for this owner status.",
                      )
                    : t(
                        "Add a status label used when tracking property owners.",
                      )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <Form {...form}>
              <div className="relative gap-4 grid sm:grid-cols-2 mt-5">
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">
                        {t("English name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          dir="ltr"
                          placeholder="e.g. Available for Marketing"
                          className="bg-background rounded-xl h-11"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">
                        {t("Arabic name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          dir="rtl"
                          placeholder="مثال: متاح للتسويق"
                          className="bg-background rounded-xl h-11"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </div>

          <DialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="rounded-xl"
              onClick={() => setFormOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              className="gap-1.5 rounded-xl"
              onClick={handleSave}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editItem ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editItem ? t("Save Changes") : t("Add Owner Status")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleteMutation.isPending) return;
          setDeleteOpen(open);
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
          <div className="relative px-6 pt-6 pb-4">
            <div
              className="absolute inset-0 bg-gradient-to-b from-destructive/[0.08] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-3">
              <div className="flex justify-center items-center mx-auto bg-destructive/10 ring-4 ring-destructive/10 rounded-2xl w-12 h-12 text-destructive">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {t("Delete Owner Status")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "This status will be removed from settings. Owners currently using it may need another status assigned.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            {deleting ? (
              <div className="relative flex items-start gap-3 bg-muted/50 mt-5 p-3 border border-border/60 rounded-xl">
                <span className="flex justify-center items-center bg-background border border-border/50 rounded-xl w-10 h-10 text-muted-foreground shrink-0">
                  <UserRound className="w-4 h-4" />
                </span>
                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-medium text-foreground text-sm truncate">
                    {language === "ar"
                      ? deleting.name_ar || deleting.name_en
                      : deleting.name_en || deleting.name_ar}
                  </p>
                  <p
                    className="text-muted-foreground text-xs truncate"
                    dir={language === "ar" ? "ltr" : "rtl"}
                  >
                    {language === "ar" ? deleting.name_en : deleting.name_ar}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="gap-1.5 rounded-xl"
              onClick={confirmDelete}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {t("Delete Owner Status")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
