import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

export const CompanySchema = (t: TFunction) =>
  z
    .object({
      companyName: z.string().trim().min(1, t("Company name")),
      phone: z
        .string()
        .min(1, t("Phone number is required"))
        .refine(
          (value) => isValidPhoneNumber(value),
          t("Enter a valid phone number"),
        ),
      adminName: z.string().trim().min(1, t("Admin name")),
      email: z.string().trim().email(t("Email")),
      subscriptionStartDate: z.string().min(1, t("Subscription start date")),
      subscriptionEndDate: z.string().min(1, t("Subscription end date")),
      maxEmployeeCount: z
        .union([z.string(), z.number()])
        .transform((value) => Number(value))
        .refine((value) => value >= 1, t("Maximum employee count")),
      notes: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.subscriptionStartDate &&
        data.subscriptionEndDate &&
        data.subscriptionEndDate < data.subscriptionStartDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscriptionEndDate"],
          message: t("Subscription end date"),
        });
      }
    });

export type TCompanySchema = z.input<ReturnType<typeof CompanySchema>>;
