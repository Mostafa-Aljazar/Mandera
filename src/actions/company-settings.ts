"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type { Company } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * Ensures the current session may access this company. Uses the admin client
 * to read the caller's profile (profiles RLS historically only allowed
 * selecting your own row).
 */
async function assertCompanyAccess(
  companyId: string,
): Promise<
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string }
> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const admin = getSupabaseAdmin();
  const { data: me, error } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!me) return { ok: false, error: "Unauthorized" };
  if (me.role === "master_admin") {
    return { ok: true, userId: user.id, role: me.role };
  }
  if (!me.company_id || me.company_id !== companyId) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, userId: user.id, role: me.role };
}

async function uploadCompanyLogo(
  companyId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Company logo must be less than 2MB." };
  }

  const admin = getSupabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${companyId}/logo/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

export interface UpdateCompanyGeneralSettingsInput {
  companyId: string;
  companyNameEn: string;
  companyNameAr: string;
  phone: string;
  adminName: string;
  email: string;
  /** New logo file, if the user selected one. */
  logo?: File | null;
  /** True to clear the existing logo when no new file was selected. */
  removeLogo?: boolean;
}

/**
 * Company self-service save for the "General Settings" tab. `companies` RLS
 * only allows master_admin to write, so this bypasses RLS via the admin
 * client after its own role check — do not reuse `updateCompany` from
 * src/actions/companies.ts, which is RLS-bound and master-admin-only.
 * Deliberately never touches notes, company_code, subscription dates,
 * max_employee_count, is_active, or is_frozen — those stay platform-managed.
 */
export async function updateCompanyGeneralSettings(
  input: UpdateCompanyGeneralSettingsInput,
): Promise<ActionResult<Company>> {
  const access = await assertCompanyAccess(input.companyId);
  if (access.ok !== true) return { error: access.error };
  if (access.role !== "company_super_admin" && access.role !== "master_admin") {
    return { error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    company_name_en: input.companyNameEn.trim(),
    company_name_ar: input.companyNameAr.trim(),
    phone: input.phone,
    admin_name: input.adminName.trim(),
    email: input.email.trim(),
  };

  if (input.logo) {
    const upload = await uploadCompanyLogo(input.companyId, input.logo);
    if (upload.error) return { error: upload.error };
    patch.logo_url = upload.url;
  } else if (input.removeLogo) {
    patch.logo_url = null;
  }

  const { data, error } = await admin
    .from("companies")
    .update(patch)
    .eq("id", input.companyId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Company };
}
