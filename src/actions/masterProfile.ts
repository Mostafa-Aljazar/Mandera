"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type { AuthUser, Profile } from "@/types/supabase-entities.types";

type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

async function assertMasterAdmin(): Promise<
  ActionResult<{ userId: string; email: string | undefined }>
> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: me, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || me?.role !== "master_admin") return { error: "Unauthorized" };
  return { data: { userId: user.id, email: user.email } };
}

async function uploadMasterAvatar(
  userId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Profile photo must be less than 2MB." };
  }

  const admin = getSupabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `master-admins/${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

async function verifyCurrentPassword(
  email: string,
  password: string,
): Promise<ActionResult<null>> {
  // Isolated client so re-auth does not scramble the request cookie session.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  if (error) return { error: "Current password is incorrect." };
  return { data: null };
}

export async function getMasterProfile(): Promise<ActionResult<AuthUser>> {
  const access = await assertMasterAdmin();
  if (access.error || !access.data) return { error: access.error ?? "Unauthorized" };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", access.data.userId)
    .single();

  if (error) return { error: error.message };
  return {
    data: {
      ...(data as Profile),
      email: access.data.email,
    },
  };
}

export interface UpdateMasterProfileInput {
  name_en: string;
  name_ar: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatar?: File | null;
  removeAvatar?: boolean;
}

export async function updateMasterProfile(
  input: UpdateMasterProfileInput,
): Promise<ActionResult<AuthUser>> {
  const access = await assertMasterAdmin();
  if (access.error || !access.data) return { error: access.error ?? "Unauthorized" };

  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();
  if (!nameEn || !nameAr) {
    return { error: "Name is required in both English and Arabic." };
  }

  const email = input.email?.trim() ?? "";
  const wantsEmailChange =
    !!email && email.toLowerCase() !== (access.data.email ?? "").toLowerCase();
  const wantsPasswordChange = !!input.newPassword?.trim();

  if (wantsEmailChange || wantsPasswordChange) {
    if (!input.currentPassword) {
      return { error: "Current password is required to change email or password." };
    }
    if (!access.data.email) {
      return { error: "Current password is incorrect." };
    }
    const verified = await verifyCurrentPassword(
      access.data.email,
      input.currentPassword,
    );
    if (verified.error) return { error: verified.error };
  }

  if (wantsPasswordChange && input.newPassword!.trim().length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const patch: Record<string, string | null> = {
    name_en: nameEn,
    name_ar: nameAr,
    name: nameEn,
  };

  if (input.avatar instanceof File) {
    const upload = await uploadMasterAvatar(access.data.userId, input.avatar);
    if (upload.error) return { error: upload.error };
    patch.avatar_url = upload.url ?? null;
  } else if (input.removeAvatar) {
    patch.avatar_url = null;
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", access.data.userId)
    .select("*")
    .single();

  if (profileError) return { error: profileError.message };

  if (wantsEmailChange || wantsPasswordChange) {
    const authPatch: { email?: string; password?: string } = {};
    if (wantsEmailChange) authPatch.email = email;
    if (wantsPasswordChange) authPatch.password = input.newPassword!.trim();

    const { error: authError } = await admin.auth.admin.updateUserById(
      access.data.userId,
      authPatch,
    );
    if (authError) return { error: authError.message };
  }

  return {
    data: {
      ...(profile as Profile),
      email: wantsEmailChange ? email : access.data.email,
    },
  };
}
