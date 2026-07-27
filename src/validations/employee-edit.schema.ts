import { z } from "zod";
import type { TFunction } from "i18next";

export const EmployeeEditSchema = (t: TFunction) =>
  z.object({
    firstNameEn: z.string().trim().min(1, `${t("First Name")} (EN)`),
    firstNameAr: z.string().trim().min(1, `${t("First Name")} (AR)`),
    lastNameEn: z.string().trim().min(1, `${t("Last Name")} (EN)`),
    lastNameAr: z.string().trim().min(1, `${t("Last Name")} (AR)`),
    email: z.string().trim().email(t("Email")),
  });

export type TEmployeeEditSchema = z.infer<ReturnType<typeof EmployeeEditSchema>>;
