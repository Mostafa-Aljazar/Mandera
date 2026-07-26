import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

/**
 * Schema factory — takes the i18next `t` function so every validation
 * message flows through the app's translation files (`src/locales/*.json`),
 * matching the rest of the codebase's `t('English string')` convention.
 */
export const OwnerSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("Full name is required")),
    phone: z
      .string()
      .min(1, t("Phone number is required"))
      .refine((value) => isValidPhoneNumber(value), t("Enter a valid phone number")),
    country: z.string().trim().min(1, t("Country is required")),
    assigned_employee_id: z.string().min(1, t("Assigned employee is required")),
    marketing_channel: z.string().min(1, t("Marketing channel is required")),
  });

export type TOwnerSchema = z.infer<ReturnType<typeof OwnerSchema>>;
