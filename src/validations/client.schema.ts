import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

export const ClientSchema = (t: TFunction) =>
  z.object({
    name_en: z.string().trim().min(1, `${t("Full Name")} (EN)`),
    name_ar: z.string().trim().min(1, `${t("Full Name")} (AR)`),
    phone: z
      .string({
        error: () => ({ message: t("Phone number is required") }),
      })
      .min(1, t("Phone number is required"))
      .refine(
        (value) => isValidPhoneNumber(value),
        t("Enter a valid phone number"),
      ),
    country_code: z.string().trim().min(1, t("Country is required")),
    interest_type: z.string().min(1, t("Interest type is required")),
    interested_properties: z
      .array(z.string())
      .max(4, t("Maximum 4 properties can be selected.")),
    employee_id: z.string().min(1, t("Assigned agent is required")),
    marketing_channel: z.string().min(1, t("Marketing channel is required")),
    campaign: z.string().optional().or(z.literal("")),
    budget: z.string().optional().or(z.literal("")),
    preferred_area: z.string().optional().or(z.literal("")),
    investment_unit: z.string().optional().or(z.literal("")),
  });

export type TClientSchema = z.input<ReturnType<typeof ClientSchema>>;
export type TClientSchemaOutput = z.output<ReturnType<typeof ClientSchema>>;
