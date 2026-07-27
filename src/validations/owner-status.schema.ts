import { z } from "zod";
import type { TFunction } from "i18next";

export const OwnerStatusSchema = (t: TFunction) =>
  z.object({
    name_en: z.string().trim().min(1, t("English name is required.")),
    name_ar: z.string().trim().min(1, t("Arabic name is required.")),
  });

export type TOwnerStatusSchema = z.infer<ReturnType<typeof OwnerStatusSchema>>;
