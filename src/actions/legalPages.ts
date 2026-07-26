"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { LegalPage, LegalPageType } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export async function getLegalPages(): Promise<ActionResult<LegalPage[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("legal_pages").select("*");
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getLegalPage(
  pageType: LegalPageType,
): Promise<ActionResult<LegalPage>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("legal_pages")
    .select("*")
    .eq("page_type", pageType)
    .single();
  if (error) return { error: error.message };
  return { data };
}

export interface UpdateLegalPageInput {
  id: string;
  language: "en" | "ar";
  title: string;
  content: string;
  updatedBy: string | null;
}

export async function updateLegalPage(
  input: UpdateLegalPageInput,
): Promise<ActionResult<LegalPage>> {
  const supabase = await getServerSupabase();
  const payload =
    input.language === "ar"
      ? {
          title_ar: input.title,
          content_ar: input.content,
          updated_by: input.updatedBy,
        }
      : {
          title_en: input.title,
          content_en: input.content,
          updated_by: input.updatedBy,
        };

  const { data, error } = await supabase
    .from("legal_pages")
    .update(payload)
    .eq("id", input.id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}
