"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useAreasDistricts,
  useCreateAreaDistrict,
  useUpdateAreaDistrict,
  useDeleteAreaDistrict,
} from "@/hooks/queries/useSettings";
import {
  AreaDistrictSchema,
  type TAreaDistrictSchema,
} from "@/validations/area-district.schema";
import type { AreaDistrict } from "@/types/supabase-entities.types";
import SettingsSection from "@/components/company/settings/SettingsSection";
import SettingsTableShell from "@/components/company/settings/SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export default function AreasDistrictsTab() {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const [selectedEmirate, setSelectedEmirate] = useState("Dubai");
  const companyId = currentUser?.company_id || company?.id;

  const { data: areasData, isLoading } = useAreasDistricts(
    companyId,
    selectedEmirate,
  );
  const areas = areasData ?? [];

  const createMutation = useCreateAreaDistrict();
  const updateMutation = useUpdateAreaDistrict();
  const deleteMutation = useDeleteAreaDistrict();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<AreaDistrict | null>(null);
  const [deleting, setDeleting] = useState<AreaDistrict | null>(null);

  const form = useForm<TAreaDistrictSchema>({
    resolver: zodResolver(AreaDistrictSchema(t)),
    defaultValues: { name: "", description: "" },
  });

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name: "", description: "" });
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: AreaDistrict) => {
    setEditItem(item);
    form.reset({
      name: item.name || "",
      description: item.description || "",
    });
    setFormOpen(true);
  };

  const openDelete = (item: AreaDistrict) => {
    setDeleting(item);
    setDeleteOpen(true);
  };

  const handleSave = form.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const name = formData.name.trim();
      const description = formData.description?.trim() || undefined;

      if (editItem) {
        const result = await updateMutation.mutateAsync({
          id: editItem.id,
          name,
          description,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Area updated successfully."));
      } else {
        const result = await createMutation.mutateAsync({
          companyId,
          emirate: selectedEmirate,
          name,
          description,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Area created successfully."));
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
      toast.success(t("Area deleted successfully."));
      setDeleteOpen(false);
      setDeleting(null);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. It might be linked to properties."));
    }
  };

  return (
    <>
      <SettingsSection
        title={t("Areas & Districts")}
        description={t("Manage localized property areas across the UAE.")}
        icon={MapPin}
        action={
          <div className="flex sm:flex-row flex-col items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select value={selectedEmirate} onValueChange={setSelectedEmirate}>
              <SelectTrigger className="bg-background w-full sm:w-[180px] h-9">
                <SelectValue placeholder={t("Select Emirate")} />
              </SelectTrigger>
              <SelectContent>
                {EMIRATES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {t(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="gap-2 w-full sm:w-auto h-9 shrink-0"
              onClick={openAdd}
            >
              <Plus className="w-4 h-4" />
              {t("Add New Area")}
            </Button>
          </div>
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
                  <TableHead className="min-w-[140px]">
                    {t("Area/District Name")}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t("Description")}
                  </TableHead>
                  <TableHead className="w-[120px] text-end">
                    {t("Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-12 text-muted-foreground text-center"
                    >
                      <MapPin className="opacity-20 mx-auto mb-3 w-8 h-8" />
                      {t("No areas configured for {{emirate}} yet.", {
                        emirate: t(selectedEmirate),
                      })}
                    </TableCell>
                  </TableRow>
                ) : (
                  areas.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <p>{item.name}</p>
                          {item.description ? (
                            <p className="sm:hidden mt-0.5 text-muted-foreground text-xs line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[300px] text-muted-foreground text-sm truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="inline-flex gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(item)}
                            aria-label={t("Edit Area")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => openDelete(item)}
                            aria-label={t("Delete Area")}
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
                  {editItem
                    ? t("Edit Area in {{emirate}}", {
                        emirate: t(selectedEmirate),
                      })
                    : t("Add Area in {{emirate}}", {
                        emirate: t(selectedEmirate),
                      })}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {editItem
                    ? t("Update the name and optional description for this area.")
                    : t(
                        "Add an area or district used when creating property listings.",
                      )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <Form {...form}>
              <div className="relative space-y-4 mt-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">
                        {t("Area/District Name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("e.g. Dubai Marina")}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">
                        {t("Description")}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({t("Optional")})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t(
                            "Brief details about this location...",
                          )}
                          className="bg-background rounded-xl min-h-[88px] resize-none"
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
              {editItem ? t("Save Changes") : t("Add Area")}
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
                  {t("Delete Area")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "This area will be removed from settings. Properties linked to it may need another area assigned.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            {deleting ? (
              <div className="relative flex items-start gap-3 bg-muted/50 mt-5 p-3 border border-border/60 rounded-xl">
                <span className="flex justify-center items-center bg-background border border-border/50 rounded-xl w-10 h-10 text-muted-foreground shrink-0">
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-medium text-foreground text-sm truncate">
                    {deleting.name}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">
                    {t(selectedEmirate)}
                    {deleting.description
                      ? ` · ${deleting.description}`
                      : ""}
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
              {t("Delete Area")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
