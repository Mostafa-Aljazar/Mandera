"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, Trash2, Plus, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useTranslation } from "react-i18next";
import SettingsSection from "@/components/company/settings/SettingsSection";
import {
  OwnerStatusSchema,
  type TOwnerStatusSchema,
} from "@/validations/owner-status.schema";
import type { OwnerStatus } from "@/types/supabase-entities.types";
import {
  useOwnerStatusesSettings,
  useCreateOwnerStatus,
  useUpdateOwnerStatus,
  useDeleteOwnerStatus,
} from "@/hooks/queries/useSettings";

export default function OwnerStatusesTab() {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const companyId = currentUser?.company_id || company?.id;

  const { data: statusesData, isLoading } = useOwnerStatusesSettings(companyId);
  const statuses = statusesData ?? [];

  const createMutation = useCreateOwnerStatus();
  const updateMutation = useUpdateOwnerStatus();
  const deleteMutation = useDeleteOwnerStatus();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<OwnerStatus | null>(null);

  const form = useForm<TOwnerStatusSchema>({
    resolver: zodResolver(OwnerStatusSchema(t)),
    defaultValues: { name: "" },
  });

  const handleSave = form.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const name = formData.name.trim();

      if (editItem) {
        const result = await updateMutation.mutateAsync({ id: editItem.id, name });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner status updated successfully."));
      } else {
        const result = await createMutation.mutateAsync({ companyId, name });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner status created successfully."));
      }

      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred while saving."));
    }
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this status?"))) return;
    try {
      const result = await deleteMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Status deleted successfully."));
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. This status might be in use."));
    }
  };

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name: "" });
  };

  const openAdd = () => {
    resetForm();
    setOpenDialog(true);
  };

  const openEdit = (item: OwnerStatus) => {
    setEditItem(item);
    form.reset({
      name: item.name || "",
    });
    setOpenDialog(true);
  };

  return (
    <SettingsSection
      title={t("Owner Statuses")}
      description={t("Manage status labels for property owners.")}
      icon={UserRound}
      action={
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm" className="gap-2 h-9 shrink-0">
              <Plus className="w-4 h-4" /> {t("Add New Status")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? t("Edit Owner Status") : t("Add Owner Status")}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("Name")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("e.g. VIP Owner")}
                          className="bg-background h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                        {t("Saving...")}
                      </>
                    ) : (
                      t("Save Status")
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{t("Status Name")}</TableHead>
                <TableHead className="w-[120px] text-end">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-12 text-muted-foreground text-center"
                  >
                    {t("No owner statuses configured yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
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
        </div>
      )}
    </SettingsSection>
  );
};
