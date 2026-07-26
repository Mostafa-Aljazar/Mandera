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
import { useRenewCompanySubscription } from "@/hooks/queries/useCompanies";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Company } from "@/types/supabase-entities.types";
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

export default function SubscriptionRenewalForm({
  company,
  open,
  onOpenChange,
  onSuccess,
}: SubscriptionRenewalFormProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const renewSubscriptionMutation = useRenewCompanySubscription();

  const form = useForm<TSubscriptionRenewalSchema>({
    resolver: zodResolver(SubscriptionRenewalSchema(t)),
    defaultValues: { newEndDate: "" },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const result = await renewSubscriptionMutation.mutateAsync({
        id: company!.id,
        newEndDate: formData.newEndDate,
      });
      if (result.error) throw new Error(result.error);

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
            Renew subscription for {company?.company_name}
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
                  value={company?.subscription_end_date || ""}
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
                        min={company?.subscription_end_date}
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
