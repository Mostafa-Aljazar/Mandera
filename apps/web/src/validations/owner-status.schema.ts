import { z } from "zod";
import type { TFunction } from "i18next";

export const OwnerStatusSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("Name is required.")),
  });

export type TOwnerStatusSchema = z.infer<ReturnType<typeof OwnerStatusSchema>>;
