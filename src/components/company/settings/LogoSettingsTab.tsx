"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ImageUp, Loader2 } from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import SettingsSection from "@/components/company/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { useUpdateCompanyGeneralSettings } from "@/hooks/queries/useSettings";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export default function LogoSettingsTab() {
  const { t } = useTranslation();
  const { company, refreshCompany } = useCompanyAuth();
  const updateMutation = useUpdateCompanyGeneralSettings();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyLogoFile = (file: File) => {
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      toast.error(t("Please upload a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t("Company logo must be less than 2MB."));
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const clearLogoSelection = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentLogoUrl = removeLogo
    ? null
    : logoPreview || company?.logo_url || null;

  const handleSave = async () => {
    if (!company?.id) return;
    if (!logoFile && !removeLogo) {
      toast.message(t("No changes to save."));
      return;
    }
    try {
      const result = await updateMutation.mutateAsync({
        companyId: company.id,
        companyNameEn: company.company_name_en,
        companyNameAr: company.company_name_ar,
        phone: company.phone ?? "",
        adminName: company.admin_name ?? "",
        email: company.email,
        logo: logoFile,
        removeLogo: removeLogo && !logoFile,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Settings updated successfully."));
      clearLogoSelection();
      setRemoveLogo(false);
      await refreshCompany();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred."));
    }
  };

  return (
    <SettingsSection
      title={t("Logo")}
      description={t("Upload or replace your company logo.")}
      icon={ImageUp}
      action={
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || (!logoFile && !removeLogo)}
          className="gap-2 rounded-xl h-10"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : (
            t("Save Changes")
          )}
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex justify-center items-center bg-muted/30 border border-border/60 rounded-xl w-20 h-20 overflow-hidden shrink-0">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt={t("Company Logo")}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageUp className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) applyLogoFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg h-9"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoFile || company?.logo_url ? t("Change logo") : t("Upload logo")}
            </Button>
            {(logoFile || company?.logo_url) && !removeLogo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg h-9 text-destructive hover:text-destructive"
                onClick={() => {
                  clearLogoSelection();
                  if (company?.logo_url) setRemoveLogo(true);
                }}
              >
                {t("Remove")}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("JPG, PNG, or WebP. Maximum 2MB.")}
        </p>
      </div>
    </SettingsSection>
  );
}
