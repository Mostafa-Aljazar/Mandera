"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2, Trash2, Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  MarketingChannelSchema,
  type TMarketingChannelSchema,
} from "@/validations/marketing-channel.schema";
import type { MarketingChannelRecord } from "@/types/supabase-entities.types";
import {
  useMarketingChannelsSettings,
  useCreateMarketingChannel,
  useUpdateMarketingChannel,
  useDeleteMarketingChannel,
} from "@/hooks/queries/useSettings";

const MarketingChannelsTab = () => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();

  const { data: channelsData } = useMarketingChannelsSettings(company?.id);
  const channels = channelsData ?? [];

  const createMutation = useCreateMarketingChannel();
  const updateMutation = useUpdateMarketingChannel();
  const deleteMutation = useDeleteMarketingChannel();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketingChannelRecord | null>(null);

  const form = useForm<TMarketingChannelSchema>({
    resolver: zodResolver(MarketingChannelSchema(t)),
    defaultValues: { name: "" },
  });

  const handleSave = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    try {
      const name = formData.name.trim();

      if (editItem) {
        const result = await updateMutation.mutateAsync({ id: editItem.id, name });
        if (result.error) throw new Error(result.error);
        toast.success(t("Marketing channel updated successfully."));
      } else {
        const result = await createMutation.mutateAsync({ companyId: company.id, name });
        if (result.error) throw new Error(result.error);
        toast.success(t("Marketing channel created successfully."));
      }

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred."));
    }
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this channel?"))) return;

    try {
      const result = await deleteMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Channel deleted successfully."));
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete. This channel might be in use."));
    }
  };

  const resetForm = () => {
    setEditItem(null);
    form.reset({ name: "" });
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />{" "}
            {t("Marketing Channels")}
          </CardTitle>
          <CardDescription>
            {t("Manage marketing sources for clients and owners.")}
          </CardDescription>
        </div>
        <Dialog
          open={open}
          onOpenChange={(val) => {
            setOpen(val);
            if (!val) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="w-4 h-4" /> {t("Add New Channel")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? t("Edit Channel") : t("Add Channel")}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("e.g. Google Ads")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
            <DialogFooter>
              <Button disabled={isSubmitting} onClick={handleSave}>
                {isSubmitting ? t("Saving...") : t("Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead className="w-[150px] text-right">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-muted-foreground text-center"
                  >
                    {t("No marketing channels configured yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditItem(item);
                            form.reset({ name: item.name });
                            setOpen(true);
                          }}
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
      </CardContent>
    </Card>
  );
};

export default MarketingChannelsTab;
