import { z } from "zod";
import type { TFunction } from "i18next";

export const EmployeeEditSchema = (t: TFunction) =>
  z.object({
    firstName: z.string().trim().min(1, t("First Name")),
    lastName: z.string().trim().min(1, t("Last Name")),
    email: z.string().trim().email(t("Email")),
  });

export type TEmployeeEditSchema = z.infer<ReturnType<typeof EmployeeEditSchema>>;
