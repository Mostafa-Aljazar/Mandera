import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

const JOB_TITLES = ["sales_agent", "admin", "manager"] as const;

export const EmployeeSchema = (t: TFunction, isEditing: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, t("Name, email, and role are required.")),
      email: z.string().trim().email(t("Name, email, and role are required.")),
      phone: z
        .string()
        .min(1, t("Invalid phone number format. Please use format like +974 1234 5678"))
        .refine(
          (value) => isValidPhoneNumber(value),
          t("Invalid phone number format. Please use format like +974 1234 5678"),
        ),
      job_title: z.enum(JOB_TITLES, {
        message: t("Please select a valid job title."),
      }),
      role: z.string().min(1, t("Name, email, and role are required.")),
      password: z.string().default(""),
    })
    .superRefine((data, ctx) => {
      if (!isEditing && !data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: t("Password is required for new employees."),
        });
      }
    });

export type TEmployeeSchema = z.input<ReturnType<typeof EmployeeSchema>>;
