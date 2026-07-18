import { z } from "zod";
import type { TFunction } from "i18next";

const numericString = (t: TFunction) =>
  z
    .union([z.string(), z.number()])
    .refine((value) => value === "" || !Number.isNaN(Number(value)), t("Must be a number"));

export const PropertySchema = (t: TFunction) =>
  z.object({
    listing_type: z.string().min(1, t("Listing type is required")),
    type: z.string().min(1, t("Property type is required")),
    land_area: numericString(t),
    building_area: numericString(t),
    emirate: z.string().min(1, t("Emirate is required")),
    area_district: z.string().default(""),
    area: z.string().default(""),
    owner_id: z.string().min(1, t("Owner is required")),
    price: z
      .union([z.string(), z.number()])
      .refine((value) => Number(value) > 0, t("Price is required")),
    commission_percentage: numericString(t),
    employee_id: z.string().min(1, t("Assigned employee is required")),
    title: z.string().trim().min(1, t("Title is required")),
    description: z.string().default(""),
    status: z.string().default("Available"),
    advertising_permit_number: z.string().default(""),
  });

export type TPropertySchema = z.input<ReturnType<typeof PropertySchema>>;
