"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import pb from "@/lib/pocketbaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Company } from "../types/pocketbase.types";
import {
  SubscriptionRenewalSchema,
  type TSubscriptionRenewalSchema,
} from "@/validations/subscription-renewal.schema";

interface SubscriptionRenewalFormProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SubscriptionRenewalForm = ({
  company,
  open,
  onOpenChange,
  onSuccess,
}: SubscriptionRenewalFormProps) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const form = useForm<TSubscriptionRenewalSchema>({
    resolver: zodResolver(SubscriptionRenewalSchema(t)),
    defaultValues: { newEndDate: "" },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      await pb.collection("companies").update(
        company!.id,
        {
          subscriptionEndDate: formData.newEndDate,
        },
        { $autoCancel: false },
      );

      toast("Subscription renewed successfully");
      onSuccess();
      onOpenChange(false);
      form.reset({ newEndDate: "" });
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast("Failed to renew subscription");
    } finally {
      setLoading(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Renew subscription for {company?.companyName}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentEndDate">Current end date</Label>
                <Input
                  id="currentEndDate"
                  type="date"
                  value={company?.subscriptionEndDate || ""}
                  disabled
                />
              </div>
              <FormField
                control={form.control}
                name="newEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New end date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={company?.subscriptionEndDate}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Renewing..." : "Renew subscription"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionRenewalForm;
