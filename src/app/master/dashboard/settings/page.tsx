"use client";

import { useEffect, useRef, useState } from "react";
import DocumentHead from "@/components/common/DocumentHead";
import MasterAdminHeader from "@/components/master/MasterAdminHeader";
import MobileAppsSettingsTab from "@/components/master/MobileAppsSettingsTab";
import SectionBadge from "@/components/common/SectionBadge";
import { useMasterAuth } from "@/contexts/MasterAuthContext";
import { updateMasterProfile } from "@/actions/masterProfile";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  label,
  showLabel,
  hideLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  label: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pe-11 rounded-xl h-11"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="top-1/2 absolute end-1.5 flex justify-center items-center hover:bg-muted rounded-lg w-8 h-8 text-muted-foreground hover:text-foreground transition-colors -translate-y-1/2"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function AccountSettingsTab() {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser } = useMasterAuth();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    setNameEn(currentUser.name_en || currentUser.name || "");
    setNameAr(currentUser.name_ar || currentUser.name || "");
    setEmail(currentUser.email || "");
    setRemoveAvatar(false);
    setAvatarFile(null);
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const clearAvatarSelection = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickAvatar = (file: File | null) => {
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const currentAvatarUrl = removeAvatar
    ? null
    : avatarPreview || currentUser?.avatar_url || null;

  const initials = (() => {
    const source = nameEn || nameAr || currentUser?.email || "?";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameEn.trim() || !nameAr.trim()) {
      toast.error(t("master_settings_name_required"));
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        toast.error(t("Minimum 8 characters"));
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error(t("master_settings_password_mismatch"));
        return;
      }
      if (!currentPassword) {
        toast.error(t("master_settings_current_password_required"));
        return;
      }
    }

    const emailChanged =
      email.trim().toLowerCase() !== (currentUser?.email || "").toLowerCase();
    if (emailChanged && !currentPassword) {
      toast.error(t("master_settings_current_password_required"));
      return;
    }

    setSaving(true);
    try {
      const result = await updateMasterProfile({
        name_en: nameEn,
        name_ar: nameAr,
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
        avatar: avatarFile,
        removeAvatar: removeAvatar && !avatarFile,
      });

      if (result.error) throw new Error(result.error);

      setCurrentUser(result.data);
      clearAvatarSelection();
      setRemoveAvatar(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("Saved successfully."));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("master_settings_save_failed");
      const mapped =
        message === "Unauthorized"
          ? t("master_settings_unauthorized")
          : message === "Current password is incorrect."
            ? t("master_settings_wrong_password")
            : message === "Please upload a JPG, PNG, or WebP image."
              ? t("Please upload a JPG, PNG, or WebP image.")
              : message === "Profile photo must be less than 2MB."
                ? t("master_settings_photo_too_large")
                : message === "Name is required in both English and Arabic."
                  ? t("master_settings_name_required")
                  : message ===
                      "Current password is required to change email or password."
                    ? t("master_settings_current_password_required")
                    : message === "Password must be at least 8 characters."
                      ? t("Minimum 8 characters")
                      : null;
      toast.error(mapped ?? (message || t("master_settings_save_failed")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="bg-card shadow-[var(--shadow-subtle)] p-5 sm:p-6 border border-border/60 rounded-2xl space-y-5">
        <div className="flex items-center gap-2">
          <UserRound className="w-4 h-4 text-primary" />
          <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
            {t("master_settings_profile_section")}
          </h2>
        </div>

        <div className="flex sm:flex-row flex-col items-start sm:items-center gap-4">
          <Avatar className="border border-border/60 rounded-2xl w-20 h-20">
            {currentAvatarUrl ? (
              <AvatarImage
                src={currentAvatarUrl}
                alt={nameEn || nameAr}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 rounded-2xl font-semibold text-primary text-xl">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
              {avatarFile || currentAvatarUrl
                ? t("Change photo")
                : t("Upload photo")}
            </Button>
            {(avatarFile || currentUser?.avatar_url) && !removeAvatar ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl h-10 text-rose-600 hover:text-rose-700"
                onClick={() => {
                  clearAvatarSelection();
                  if (currentUser?.avatar_url) setRemoveAvatar(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
                {t("master_settings_remove_photo")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="gap-4 grid sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name_en">{t("English")}</Label>
            <Input
              id="name_en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="rounded-xl h-11"
              placeholder={t("master_settings_name_en_placeholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_ar">{t("Arabic")}</Label>
            <Input
              id="name_ar"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="rounded-xl h-11"
              dir="rtl"
              placeholder={t("master_settings_name_ar_placeholder")}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl h-11"
            required
          />
        </div>
      </section>

      <section className="bg-card shadow-[var(--shadow-subtle)] p-5 sm:p-6 border border-border/60 rounded-2xl space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
            {t("master_settings_security_section")}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("master_settings_security_hint")}
        </p>

        <PasswordField
          id="current_password"
          label={t("master_settings_current_password")}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          showLabel={t("Show password")}
          hideLabel={t("Hide password")}
        />

        <div className="gap-4 grid sm:grid-cols-2">
          <PasswordField
            id="new_password"
            label={t("master_settings_new_password")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
          />
          <PasswordField
            id="confirm_password"
            label={t("master_settings_confirm_password")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl h-11 font-semibold min-w-[9rem]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : (
            t("Save changes")
          )}
        </Button>
      </div>
    </form>
  );
}

export default function MasterSettingsPage() {
  const { t } = useTranslation();
  const documentTitle = `${t("platformName")} - ${t("master_nav_settings")}`;

  return (
    <>
      <DocumentHead title={documentTitle} />
      <MasterAdminHeader />

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-6xl">
            <SectionBadge className="mb-3">
              {t("master_nav_settings")}
            </SectionBadge>
            <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight">
              {t("master_settings_title")}
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
              {t("master_settings_page_subtitle")}
            </p>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-6xl">
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="bg-muted/60 p-1 border border-border/60 rounded-xl h-auto w-full sm:w-auto">
              <TabsTrigger
                value="account"
                className="gap-1.5 data-[state=active]:bg-background px-4 rounded-lg h-10"
              >
                <UserRound className="w-4 h-4 shrink-0" />
                {t("master_settings_tab_account")}
              </TabsTrigger>
              <TabsTrigger
                value="mobile-apps"
                className="gap-1.5 data-[state=active]:bg-background px-4 rounded-lg h-10"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                {t("master_settings_tab_mobile_apps")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-0 outline-none">
              <AccountSettingsTab />
            </TabsContent>

            <TabsContent value="mobile-apps" className="mt-0 outline-none">
              <MobileAppsSettingsTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
