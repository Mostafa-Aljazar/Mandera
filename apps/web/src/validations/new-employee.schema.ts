import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";

const JOB_TITLES = ["وكيل مبيعات", "مسؤول", "مدير"] as const;

export const NewEmployeeSchema = (t: TFunction) =>
  z.object({
    firstName: z.string().trim().min(1, t("First Name")),
    lastName: z.string().trim().min(1, t("Last Name")),
    email: z.string().trim().email(t("Email Address")),
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
    password: z
      .string()
      .min(8, t("Minimum 8 characters")),
  });

export type TNewEmployeeSchema = z.infer<ReturnType<typeof NewEmployeeSchema>>;
