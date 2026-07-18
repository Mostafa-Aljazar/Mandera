import { z } from "zod";
import type { TFunction } from "i18next";

/**
 * Shared shape for the settings page's PropertyType / ClientStatus dialog.
 * `priority_order` is only required when saving to the `client_statuses`
 * collection — validated conditionally via `requiresPriorityOrder`.
 */
export const SettingsEntitySchema = (t: TFunction, requiresPriorityOrder: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, t("Name is required.")),
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
    });

export type TSettingsEntitySchema = z.infer<ReturnType<typeof SettingsEntitySchema>>;
