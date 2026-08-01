"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useMarketingChannelsSettings,
  useCreateMarketingChannel,
  useUpdateMarketingChannel,
  useDeleteMarketingChannel,
} from "@/hooks/queries/useSettings";
import {
  MarketingChannelSchema,
  type TMarketingChannelSchema,
} from "@/validations/marketing-channel.schema";
import type { MarketingChannelRecord } from "@/types/supabase-entities.types";
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

export default function MarketingChannelsTab() {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();

  const { data: channelsData, isLoading } = useMarketingChannelsSettings(
    company?.id,
  );
  const channels = channelsData ?? [];

  const createMutation = useCreateMarketingChannel();
  const updateMutation = useUpdateMarketingChannel();
  const deleteMutation = useDeleteMarketingChannel();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketingChannelRecord | null>(null);
  const [deleting, setDeleting] = useState<MarketingChannelRecord | null>(null);

  const form = useForm<TMarketingChannelSchema>({
    resolver: zodResolver(MarketingChannelSchema(t)),
    defaultValues: { name: "" },
  });

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name: "" });
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: MarketingChannelRecord) => {
    setEditItem(item);
    form.reset({ name: item.name });
    setFormOpen(true);
  };

  const openDelete = (item: MarketingChannelRecord) => {
    setDeleting(item);
    setDeleteOpen(true);
  };

  const handleSave = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    try {
      const name = formData.name.trim();

      if (editItem) {
        const result = await updateMutation.mutateAsync({
          id: editItem.id,
          name,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Marketing channel updated successfully."));
      } else {
        const result = await createMutation.mutateAsync({
          companyId: company.id,
          name,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Marketing channel created successfully."));
      }

      setFormOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred."));
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const result = await deleteMutation.mutateAsync(deleting.id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Channel deleted successfully."));
      setDeleteOpen(false);
      setDeleting(null);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. This channel might be in use."));
    }
  };

  return (
    <>
      <SettingsSection
        title={t("Marketing Channels")}
        description={t("Manage marketing sources for clients and owners.")}
        icon={Megaphone}
        action={
          <Button
            size="sm"
            className="gap-2 w-full sm:w-auto h-9"
            onClick={openAdd}
          >
            <Plus className="w-4 h-4" />
            {t("Add New Channel")}
          </Button>
        }
      >
        <SettingsTableShell>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start">{t("Name")}</TableHead>
                <TableHead className="w-[120px] text-end">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-12 text-muted-foreground text-center"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("Loading...")}
                    </span>
                  </TableCell>
                </TableRow>
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-10 text-muted-foreground text-center"
                  >
                    {t("No marketing channels configured yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-start">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(item)}
                          aria-label={t("Edit Channel")}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => openDelete(item)}
                          aria-label={t("Delete Channel")}
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
                  {editItem ? t("Edit Channel") : t("Add Channel")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {editItem
                    ? t("Update the name for this marketing channel.")
                    : t(
                        "Add a marketing source used when tracking clients and owners.",
                      )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <Form {...form}>
              <div className="relative mt-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">{t("Name")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("e.g. Google Ads")}
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
              {editItem ? t("Save Changes") : t("Add Channel")}
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
                  {t("Delete Channel")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "This channel will be removed from settings. Clients or owners using it may need another source assigned.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            {deleting ? (
              <div className="relative flex items-start gap-3 bg-muted/50 mt-5 p-3 border border-border/60 rounded-xl">
                <span className="flex justify-center items-center bg-background border border-border/50 rounded-xl w-10 h-10 text-muted-foreground shrink-0">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-medium text-foreground text-sm truncate">
                    {deleting.name}
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
              {t("Delete Channel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
