import { z } from "zod";
import type { TFunction } from "i18next";

export const DealCompletedSchema = (t: TFunction) =>
  z
    .object({
      employee_id: z.string().default(""),
      client_id: z.string().default(""),
      commission_value: z.string().default(""),
    })
    .superRefine((data, ctx) => {
      if (!data.employee_id || !data.client_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["client_id"],
          message: t("Please select both an employee and a client."),
        });
      }
    });

export type TDealCompletedSchema = z.input<ReturnType<typeof DealCompletedSchema>>;
