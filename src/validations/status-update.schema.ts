import { z } from "zod";
import type { TFunction } from "i18next";

export const StatusUpdateSchema = (t: TFunction, entityType: "client" | "owner" | "property") =>
  z
    .object({
      status_id: z.string().default(""),
      status_name: z.string().default(""),
      note: z.string().max(300).default(""),
      follow_up_date: z.date().nullable().default(null),
      follow_up_time: z.string().default(""),
    })
    .superRefine((data, ctx) => {
      if (entityType === "property" && !data.status_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status_name"],
          message: t("Please select a status."),
        });
      }
      if ((entityType === "client" || entityType === "owner") && !data.status_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status_id"],
          message: t("Please select a status."),
        });
      }
    });

export type TStatusUpdateSchema = z.input<ReturnType<typeof StatusUpdateSchema>>;
