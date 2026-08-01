import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

export const ClientSchema = (t: TFunction) =>
  z
    .object({
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
      budget_from: z.string().optional().or(z.literal("")),
      budget_to: z.string().optional().or(z.literal("")),
      interests: z.string().optional().or(z.literal("")),
      preferred_area: z.string().optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      const fromRaw = data.budget_from?.trim() || "";
      const toRaw = data.budget_to?.trim() || "";
      if (!fromRaw || !toRaw) return;
      const from = Number(fromRaw);
      const to = Number(toRaw);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return;
      if (from > to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["budget_to"],
          message: t("Budget to must be greater than or equal to budget from"),
        });
      }
    });

export type TClientSchema = z.input<ReturnType<typeof ClientSchema>>;
export type TClientSchemaOutput = z.output<ReturnType<typeof ClientSchema>>;
