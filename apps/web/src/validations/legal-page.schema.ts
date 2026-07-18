import { z } from "zod";
import type { TFunction } from "i18next";

export const LegalPageSchema = (t: TFunction) =>
  z.object({
    title: z.string().trim().min(1, t("Title and content are required.")),
    content: z.string().trim().min(1, t("Title and content are required.")),
  });

export type TLegalPageSchema = z.infer<ReturnType<typeof LegalPageSchema>>;
