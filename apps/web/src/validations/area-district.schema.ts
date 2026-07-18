import { z } from "zod";
import type { TFunction } from "i18next";

export const AreaDistrictSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("Area Name is required.")),
    description: z.string().default(""),
  });

export type TAreaDistrictSchema = z.input<ReturnType<typeof AreaDistrictSchema>>;
