import { z } from "zod";
import type { TFunction } from "i18next";

export const LoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().trim().min(1, t("Email is required")).email(t("Enter a valid email address")),
    password: z.string().min(1, t("Password is required")),
  });

export type TLoginSchema = z.infer<ReturnType<typeof LoginSchema>>;
