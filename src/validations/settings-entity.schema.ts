import { z } from "zod";
import type { TFunction } from "i18next";

/**
 * Shared shape for the settings page's PropertyType / ClientStatus dialog.
 * Both use bilingual `name_en` + `name_ar`.
 * `priority_order` is required only for client statuses.
 */
export const SettingsEntitySchema = (
  t: TFunction,
  requiresPriorityOrder: boolean,
) =>
  z
    .object({
      name_en: z.string().trim().optional(),
      name_ar: z.string().trim().optional(),
      priority_order: z.union([z.string(), z.number()]).optional(),
    })
    .superRefine((data, ctx) => {
      if (requiresPriorityOrder && Number(data.priority_order) < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priority_order"],
          message: t("Priority order must be a positive number."),
        });
      }
      if (!data.name_en?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name_en"],
          message: t("English name is required."),
        });
      }
      if (!data.name_ar?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name_ar"],
          message: t("Arabic name is required."),
        });
      }
    });

export type TSettingsEntitySchema = z.infer<ReturnType<typeof SettingsEntitySchema>>;
