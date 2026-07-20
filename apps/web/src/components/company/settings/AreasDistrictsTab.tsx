"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Edit2, Trash2, Plus, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useTranslation } from "react-i18next";
import SettingsSection from "@/components/company/settings/SettingsSection";
import {
  AreaDistrictSchema,
  type TAreaDistrictSchema,
} from "@/validations/area-district.schema";
import type { AreaDistrict } from "@/types/supabase-entities.types";
import {
  useAreasDistricts,
  useCreateAreaDistrict,
  useUpdateAreaDistrict,
  useDeleteAreaDistrict,
} from "@/hooks/queries/useSettings";

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

  const { data: areasData, isLoading } = useAreasDistricts(companyId, selectedEmirate);
  const areas = areasData ?? [];

  const createMutation = useCreateAreaDistrict();
  const updateMutation = useUpdateAreaDistrict();
  const deleteMutation = useDeleteAreaDistrict();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<AreaDistrict | null>(null);

  const form = useForm<TAreaDistrictSchema>({
    resolver: zodResolver(AreaDistrictSchema(t)),
    defaultValues: { name: "", description: "" },
  });

  const handleSave = form.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const name = formData.name.trim();
      const description = formData.description?.trim() || undefined;

      if (editItem) {
        const result = await updateMutation.mutateAsync({ id: editItem.id, name, description });
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

      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred while saving."));
    }
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this area/district?"))) return;
    try {
      const result = await deleteMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Area deleted successfully."));
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. It might be linked to properties."));
    }
  };

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name: "", description: "" });
  };

  const openAdd = () => {
    resetForm();
    setOpenDialog(true);
  };

  const openEdit = (item: AreaDistrict) => {
    setEditItem(item);
    form.reset({
      name: item.name || "",
      description: item.description || "",
    });
    setOpenDialog(true);
  };

  return (
    <SettingsSection
      title={t("Areas & Districts")}
      description={t("Manage localized property areas across the UAE.")}
      icon={MapPin}
      action={
        <div className="flex sm:flex-row flex-col items-center gap-2 w-full sm:w-auto">
          <Select value={selectedEmirate} onValueChange={setSelectedEmirate}>
            <SelectTrigger className="bg-background w-full sm:w-[180px] h-9">
              <SelectValue placeholder={t("Select Emirate")} />
            </SelectTrigger>
            <SelectContent>
              {EMIRATES.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog
            open={openDialog}
            onOpenChange={(open) => {
              setOpenDialog(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={openAdd}
                size="sm"
                className="gap-2 w-full sm:w-auto h-9 shrink-0"
              >
                <Plus className="w-4 h-4" /> {t("Add New Area")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editItem ? t("Edit Area") : t("Add Area")}{" "}
                  {t("in", { emirate: selectedEmirate })}
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
                          {t("Area/District Name")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("e.g. Dubai Marina")}
                            className="bg-background h-10"
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
                      <FormItem>
                        <FormLabel>
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
                            className="bg-background resize-none"
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
                        t("Save Area")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
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
                <TableHead className="w-[30%]">
                  {t("Area/District Name")}
                </TableHead>
                <TableHead>{t("Description")}</TableHead>
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
                    {t("No areas configured for")} {selectedEmirate}{" "}
                    {t("yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-[300px] text-muted-foreground text-sm truncate">
                      {item.description || "-"}
                    </TableCell>
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
