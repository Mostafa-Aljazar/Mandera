"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import pb from "@/lib/pocketbaseClient";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useTranslation } from "react-i18next";
import { AreaDistrictSchema, type TAreaDistrictSchema } from "@/validations/area-district.schema";
import type { BaseRecord } from "../types/pocketbase.types";

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

interface AreaDistrict extends BaseRecord {
  name: string;
  emirate: string;
  description?: string;
  company_id: string;
}

const AreasDistrictsTab = () => {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const [selectedEmirate, setSelectedEmirate] = useState("Dubai");
  const [areas, setAreas] = useState<AreaDistrict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<AreaDistrict | null>(null);

  const form = useForm<TAreaDistrictSchema>({
    resolver: zodResolver(AreaDistrictSchema(t)),
    defaultValues: { name: "", description: "" },
  });

  const fetchAreas = async () => {
    const companyId = currentUser?.companyId || company?.id;
    if (!companyId || !selectedEmirate) return;
    setIsLoading(true);
    try {
      const res = await pb.collection("areas_districts").getList(1, 100, {
        filter: `company_id="${companyId}" && emirate="${selectedEmirate}"`,
        $autoCancel: false,
        sort: "-created",
      });
      setAreas(res.items as unknown as AreaDistrict[]);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to load areas & districts."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.companyId, company?.id, selectedEmirate]);

  const handleSave = form.handleSubmit(async (formData) => {
    setIsSubmitting(true);
    try {
      const companyId = currentUser?.companyId || company?.id;

      const payload = {
        name: String(formData.name).trim(),
        emirate: String(selectedEmirate).trim(),
        description: formData.description
          ? String(formData.description).trim()
          : "",
        company_id: String(companyId).trim(),
      };

      console.log("--- DEBUG: EXACT REQUEST START ---");
      console.log("Collection: areas_districts");
      console.log(
        "Endpoint URL:",
        pb.baseUrl + "/api/collections/areas_districts/records",
      );
      console.log(
        "Headers Authorization Token:",
        pb.authStore.token
          ? `Bearer ${pb.authStore.token.substring(0, 15)}...`
          : "No Token Available",
      );
      console.log("Payload Data:", JSON.stringify(payload, null, 2));
      console.log("--- DEBUG: EXACT REQUEST END ---");

      let response;
      if (editItem) {
        response = await pb
          .collection("areas_districts")
          .update(String(editItem.id), payload, { $autoCancel: false });
        console.log("--- DEBUG: UPDATE RESPONSE ---", response);
        toast.success(t("Area updated successfully."));
      } else {
        response = await pb
          .collection("areas_districts")
          .create(payload, { $autoCancel: false });
        console.log("--- DEBUG: CREATE RESPONSE ---", response);
        toast.success(t("Area created successfully."));
      }

      setOpenDialog(false);
      resetForm();
      fetchAreas();
    } catch (err) {
      const error = err as {
        status?: number;
        message?: string;
        response?: { message?: string; data?: Record<string, unknown> };
      };
      console.error("--- DEBUG: ERROR START ---");
      console.error("Error Status:", error.status);
      console.error("Error Message:", error.message);
      console.error(
        "Error Response Data (Validation details):",
        JSON.stringify(error.response?.data, null, 2),
      );
      console.error("Full Error Object:", error);
      console.error("--- DEBUG: ERROR END ---");

      const errorMsg =
        error.response?.message ||
        error.message ||
        t("An error occurred while saving.");
      const validationDetails =
        error.response?.data && Object.keys(error.response.data).length > 0
          ? JSON.stringify(error.response.data)
          : "";

      toast.error(`${errorMsg} ${validationDetails}`.trim());
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(t("Are you sure you want to delete this area/district?"))
    )
      return;
    try {
      await pb
        .collection("areas_districts")
        .delete(String(id), { $autoCancel: false });
      toast.success(t("Area deleted successfully."));
      fetchAreas();
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
    <Card className="shadow-sm border-border/60">
      <CardHeader className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle>{t("Areas & Districts")}</CardTitle>
          <CardDescription>
            {t("Manage localized property areas across the UAE.")}
          </CardDescription>
        </div>

        <div className="flex sm:flex-row flex-col items-center gap-3 w-full sm:w-auto">
          <Select value={selectedEmirate} onValueChange={setSelectedEmirate}>
            <SelectTrigger className="bg-background w-full sm:w-[180px]">
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
                className="gap-2 w-full sm:w-auto shrink-0"
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
                          <Input {...field} placeholder={t("e.g. Dubai Marina")} />
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
                            placeholder={t("Brief details about this location...")}
                            className="resize-none"
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[30%]">
                    {t("Area/District Name")}
                  </TableHead>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead className="w-[120px] text-right">
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
      </CardContent>
    </Card>
  );
};

export default AreasDistrictsTab;
