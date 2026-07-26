import { z } from "zod";
import type { TFunction } from "i18next";

export const SubscriptionRenewalSchema = (t: TFunction) =>
  z.object({
    newEndDate: z.string().min(1, t("New end date is required")),
  });

export type TSubscriptionRenewalSchema = z.infer<ReturnType<typeof SubscriptionRenewalSchema>>;
