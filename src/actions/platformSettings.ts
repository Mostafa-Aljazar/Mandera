"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { PlatformSettings } from "@/types/supabase-entities.types";

type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

async function assertMasterAdmin(): Promise<
  ActionResult<{ userId: string }>
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
  return { data: { userId: user.id } };
}

function normalizeStoreUrl(
  value: string | null | undefined,
  comingSoon: boolean,
): { url: string | null; error?: string } {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "#") {
    return { url: comingSoon ? null : "#" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: null, error: "Enter a valid store URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { url: null, error: "Store URLs must start with http:// or https://." };
  }

  return { url: parsed.toString() };
}

export async function getPlatformSettings(): Promise<
  ActionResult<PlatformSettings>
> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("key", "default")
    .single();

  if (error) return { error: error.message };
  return { data: data as PlatformSettings };
}

export interface UpdatePlatformSettingsInput {
  google_play_url: string | null;
  app_store_url: string | null;
  google_play_coming_soon: boolean;
  app_store_coming_soon: boolean;
}

export async function updatePlatformSettings(
  input: UpdatePlatformSettingsInput,
): Promise<ActionResult<PlatformSettings>> {
  const access = await assertMasterAdmin();
  if (access.error) return { error: access.error };

  const googlePlay = normalizeStoreUrl(
    input.google_play_url,
    input.google_play_coming_soon,
  );
  if (googlePlay.error) return { error: googlePlay.error };

  const appStore = normalizeStoreUrl(
    input.app_store_url,
    input.app_store_coming_soon,
  );
  if (appStore.error) return { error: appStore.error };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("platform_settings")
    .update({
      google_play_url: googlePlay.url,
      app_store_url: appStore.url,
      google_play_coming_soon: input.google_play_coming_soon,
      app_store_coming_soon: input.app_store_coming_soon,
      updated_by: access.data.userId,
    })
    .eq("key", "default")
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { data: data as PlatformSettings };
}
