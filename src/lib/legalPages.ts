import type { LegalPage } from "@/types/supabase-entities.types";

type LegalPageFields = Partial<
  Pick<LegalPage, "title_en" | "title_ar" | "content_en" | "content_ar">
> & {
  title?: string | null;
  content?: string | null;
};

export function getLocalizedLegalPage(page: LegalPageFields, language: string) {
  const isArabic = language === "ar" || language.startsWith("ar");

  const titleEn = page.title_en ?? page.title ?? "";
  const titleAr = page.title_ar ?? page.title ?? "";
  const contentEn = page.content_en ?? page.content ?? "";
  const contentAr = page.content_ar ?? page.content ?? "";

  if (isArabic) {
    return {
      title: titleAr || titleEn,
      content: contentAr || contentEn,
    };
  }

  return {
    title: titleEn || titleAr,
    content: contentEn || contentAr,
  };
}
