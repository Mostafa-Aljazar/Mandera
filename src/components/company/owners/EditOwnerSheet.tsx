"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Camera,
  Trash2,
  UploadCloud,
  Save,
  Loader2,
  Megaphone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  canChangeOwnerAssignment,
  canEditIdentityFields,
} from "@/lib/permissions";
import { normalizeCountryValue } from "@/lib/countries";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  useOwner,
  useUpdateOwner,
  useMarketingChannels,
} from "@/hooks/queries/useOwners";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { OwnerSchema, type TOwnerSchema, type TOwnerSchemaOutput } from "@/validations/owner.schema";
import type { Owner } from "@/types/supabase-entities.types";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const DEFAULT_MARKETING_CHANNELS = [
  "Google", "Facebook", "Instagram", "TikTok", "Snapchat", "X",
  "LinkedIn", "Property Finder", "Bayut", "Dubizzle", "Marjan", "OpenSouk", "Website",
];

interface EditOwnerSheetProps {
  ownerId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh. */
  onSaved?: (owner: Owner) => void;
}

export default function EditOwnerSheet({
  ownerId,
  isOpen,
  onClose,
  onSaved,
}: EditOwnerSheetProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { company, currentUser } = useCompanyAuth();
  const identityLocked = !canEditIdentityFields(currentUser?.role);
  const canChangeAssignment = canChangeOwnerAssignment(currentUser?.role);

  const updateOwnerMutation = useUpdateOwner();
  const { data: owner, isLoading } = useOwner(ownerId, company?.id);
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannelOptions =
    marketingChannelsData && marketingChannelsData.length > 0
      ? marketingChannelsData.map((mc) => mc.name)
      : DEFAULT_MARKETING_CHANNELS;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TOwnerSchema, unknown, TOwnerSchemaOutput>({
    resolver: zodResolver(OwnerSchema(t)),
    defaultValues: {
      name_en: "",
      name_ar: "",
      phone: "",
      country: "United Arab Emirates",
      assigned_employee_id: "",
      marketing_channel: "",
    },
  });

  // Populate form when owner loads
  useEffect(() => {
    if (owner) {
      form.reset({
        name_en: owner.name_en || owner.name || "",
        name_ar: owner.name_ar || owner.name || "",
        phone: owner.phone || "",
        country: normalizeCountryValue(owner.country || "United Arab Emirates"),
        assigned_employee_id: owner.assigned_employee_id || "",
        marketing_channel: owner.marketing_channel || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.id]);

  // Reset transient state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setAvatarFile(null);
      setRemoveAvatar(false);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAvatarFile = (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(t("Please upload a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size >= MAX_AVATAR_BYTES) {
      toast.error(t("Owner photo must be less than 2MB."));
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const clearAvatarSelection = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentAvatarUrl = removeAvatar
    ? null
    : avatarPreview || owner?.avatar_url || null;

  const handleSave = form.handleSubmit(async (data) => {
    if (!company?.id) return;
    setIsSubmitting(true);
    try {
      const result = await updateOwnerMutation.mutateAsync({
        id: ownerId,
        companyId: company.id,
        name_en: identityLocked
          ? (owner.name_en ?? data.name_en)
          : data.name_en,
        name_ar: identityLocked
          ? (owner.name_ar ?? data.name_ar)
          : data.name_ar,
        phone: identityLocked ? (owner.phone ?? data.phone) : data.phone,
        country: identityLocked
          ? (owner.country ?? data.country)
          : data.country,
        marketing_channel: data.marketing_channel,
        assigned_employee_id: data.assigned_employee_id,
        avatar: avatarFile,
        removeAvatar: removeAvatar && !avatarFile,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Owner updated successfully."));
      clearAvatarSelection();
      onSaved?.(result.data!);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Error saving owner.");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        className="flex flex-col w-full sm:max-w-xl p-0 gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary shrink-0">
              <User className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-outfit text-base leading-tight">
                {t("Edit Owner")}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5 truncate" dir="auto">
                {isLoading ? "…" : (owner?.name_en || owner?.name || ownerId)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={handleSave} className="space-y-0">

                {/* Avatar section */}
                <div className="px-5 py-5 border-b border-border/50">
                  <p className="font-medium text-foreground text-sm mb-3">{t("Owner Photo")}</p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) applyAvatarFile(file);
                    }}
                    className={cn(
                      "flex sm:flex-row flex-col sm:items-center gap-4 p-4 border-2 border-dashed rounded-2xl transition-colors",
                      isDragOver
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-muted/20 hover:border-primary/35",
                    )}
                  >
                    <Avatar className="bg-amber-500/10 mx-auto sm:mx-0 rounded-2xl w-16 h-16 ring-2 ring-amber-500/20 shrink-0">
                      {currentAvatarUrl && (
                        <AvatarImage src={currentAvatarUrl} alt={t("Owner photo")} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-amber-500/10 rounded-2xl font-outfit font-bold text-amber-800 text-xl">
                        <User className="w-7 h-7 opacity-60" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 min-w-0 text-center sm:text-start">
                      <p className="flex justify-center sm:justify-start items-center gap-1.5 text-muted-foreground text-xs">
                        <UploadCloud className="hidden sm:block w-3.5 h-3.5 shrink-0" />
                        {t("Drag & drop a photo here, or click to upload")}
                      </p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) applyAvatarFile(file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 bg-background rounded-lg h-9"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {avatarFile || currentAvatarUrl ? t("Change photo") : t("Upload photo")}
                        </Button>
                        {(avatarFile || owner?.avatar_url) && !removeAvatar && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-9 text-destructive hover:text-destructive"
                            onClick={() => {
                              clearAvatarSelection();
                              if (owner?.avatar_url) setRemoveAvatar(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t("Remove")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="px-5 py-5 border-b border-border/50 space-y-4">
                  <p className="font-medium text-foreground text-sm">{t("Contact Information")}</p>
                  {identityLocked ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t("Identity fields are locked after create")}
                    </p>
                  ) : null}
                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("Full Name")} (EN) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              dir="ltr"
                              placeholder="e.g. John Doe"
                              className="bg-background h-10"
                              disabled={identityLocked}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("Full Name")} (AR) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              dir="rtl"
                              placeholder="مثال: محمد أحمد"
                              className="bg-background h-10"
                              disabled={identityLocked}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("Phone Number")} *</FormLabel>
                          <FormControl>
                            <PhoneInput
                              {...field}
                              className="flex-1"
                              disabled={identityLocked}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("Country")}</FormLabel>
                          <FormControl>
                            <CountryCombobox
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={t("Select Country")}
                              disabled={identityLocked}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Key info */}
                <div className="px-5 py-5 space-y-4">
                  <p className="font-medium text-foreground text-sm">{t("Key Information")}</p>
                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="marketing_channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t("Marketing Channel")}
                          </FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-background h-10">
                                <SelectValue placeholder={t("Select Channel")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {marketingChannelOptions.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assigned_employee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("Assigned Employee")}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!canChangeAssignment}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background h-10">
                                <SelectValue placeholder={t("Select Employee")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {employeeDisplayName(emp, language, emp.name) || emp.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </form>
            </Form>
          )}
        </div>

        {/* Footer — sticky save/cancel */}
        <div className="shrink-0 flex items-center justify-end gap-2 bg-muted/30 px-5 py-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl h-10"
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || isLoading}
            className="gap-2 rounded-xl h-10 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Saving...")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("Save Changes")}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
