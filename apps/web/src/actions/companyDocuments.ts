"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type { CompanyDocument } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function uploadCompanyDocumentFile(
  companyId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  const admin = getSupabaseAdmin();
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_");
  const path = `${companyId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/company-files/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function getCompanyDocuments(
  companyId: string,
): Promise<ActionResult<CompanyDocument[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("company_documents")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as CompanyDocument[] };
}

export async function createCompanyDocument(input: {
  companyId: string;
  title: string;
  note?: string;
  file?: File | null;
}): Promise<ActionResult<CompanyDocument>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;
  let fileMime: string | null = null;

  if (input.file) {
    const upload = await uploadCompanyDocumentFile(input.companyId, input.file);
    if (upload.error) return { error: upload.error };
    fileUrl = upload.url;
    fileName = input.file.name;
    fileSize = input.file.size;
    fileMime = input.file.type || null;
  }

  const { data, error } = await supabase
    .from("company_documents")
    .insert({
      company_id: input.companyId,
      title: input.title.trim(),
      note: input.note?.trim() || null,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_mime: fileMime,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CompanyDocument };
}

export async function deleteCompanyDocument(
  documentId: string,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { data: doc, error: fetchError } = await supabase
    .from("company_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError) return { error: fetchError.message };

  if (doc.file_url) {
    const path = storagePathFromPublicUrl(doc.file_url);
    if (path) {
      const admin = getSupabaseAdmin();
      await admin.storage.from("company-files").remove([path]);
    }
  }

  const { error } = await supabase.from("company_documents").delete().eq("id", documentId);
  if (error) return { error: error.message };
  return { data: null };
}
