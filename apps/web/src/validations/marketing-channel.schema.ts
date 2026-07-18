import { z } from "zod";
import type { TFunction } from "i18next";

export const MarketingChannelSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("Name is required.")),
  });

export type TMarketingChannelSchema = z.infer<ReturnType<typeof MarketingChannelSchema>>;
