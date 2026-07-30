import { z } from "zod";
import type { TFunction } from "i18next";

const numericString = (t: TFunction) =>
  z
    .union([z.string(), z.number()])
    .refine((value) => value === "" || !Number.isNaN(Number(value)), t("Must be a number"));

const requiredText = (t: TFunction, msg: string) =>
  z.string().trim().min(1, t(msg));

/**
 * Portal-ready property schema.
 * Required fields cover Bayut/dubizzle XML + PropertyFinder AE rules
 * (see docs/portals/portal-integration-plan.md + propertyfinder-api-reference.md
 * AE required set).
 */
export const PropertySchema = (t: TFunction) =>
  z
    .object({
      listing_type: requiredText(t, "Listing type is required"),
      type: requiredText(t, "Property type is required"),
      land_area: numericString(t),
      building_area: z
        .union([z.string(), z.number()])
        .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, t("Building area is required")),
      emirate: requiredText(t, "Emirate is required"),
      area_district: z.string().default(""),
      area: z.string().default(""),
      owner_id: requiredText(t, "Owner is required"),
      price: z
        .union([z.string(), z.number()])
        .refine((value) => Number(value) > 0, t("Price is required")),
      commission_percentage: numericString(t),
      employee_id: requiredText(t, "Assigned employee is required"),
      title: requiredText(t, "Title is required"),
      description: requiredText(t, "Description is required"),
      // Internal bilingual notes — optional, company-only (not portal-published)
      note_en: z.string().trim().default(""),
      note_ar: z.string().trim().default(""),
      status: z.string().default("Available"),
      advertising_permit_number: requiredText(t, "Permit number is required"),
      // Portal / publishing — required for Bayut + PropertyFinder
      title_ar: requiredText(t, "Arabic title is required"),
      description_ar: requiredText(t, "Arabic description is required"),
      bedrooms: requiredText(t, "Bedrooms is required"),
      bathrooms: requiredText(t, "Bathrooms is required"),
      furnishing: requiredText(t, "Furnishing is required"),
      size_unit: z.string().default("SQFT"),
      rent_frequency: z.string().default(""),
      is_off_plan: z.boolean().default(false),
      project_status: z.string().default(""),
      amenities: z.array(z.string()).default([]),
      video_urls: z.array(z.string()).default([]),
      permit_type: requiredText(t, "Permit type is required"),
      issuing_license_number: z.string().default(""),
      city: requiredText(t, "City is required"),
      locality: requiredText(t, "Locality is required"),
      sub_locality: z.string().default(""),
      tower_name: z.string().default(""),
      // Optional at save time — PropertyFinder needs it, but it requires PF API
      // keys just to look up, so it must not block saving a Bayut-only property.
      // Publish-time validation (validate.ts) still requires it for PropertyFinder.
      pf_location_id: z.union([z.string(), z.number()]).default(""),
      offplan_sale_type: z.string().default(""),
      offplan_dld_waiver: numericString(t),
      offplan_original_price: numericString(t),
      offplan_amount_paid: numericString(t),
      available_from: z.string().default(""),
      parking_slots: numericString(t),
    })
    .superRefine((data, ctx) => {
      if (data.listing_type === "Rent" && !String(data.rent_frequency || "").trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["rent_frequency"],
          message: t("Rent frequency is required"),
        });
      }
      if (data.is_off_plan) {
        if (!String(data.offplan_sale_type || "").trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["offplan_sale_type"],
            message: t("Off-plan sale type is required"),
          });
        }
        if (!String(data.project_status || "").trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["project_status"],
            message: t("Project status is required"),
          });
        }
        if (data.offplan_sale_type === "New") {
          const w = data.offplan_dld_waiver;
          if (w === "" || w === null || w === undefined || Number.isNaN(Number(w))) {
            ctx.addIssue({
              code: "custom",
              path: ["offplan_dld_waiver"],
              message: t("DLD waiver is required for off-plan New"),
            });
          }
        }
        if (data.offplan_sale_type === "Resale") {
          if (!data.offplan_original_price || Number(data.offplan_original_price) <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["offplan_original_price"],
              message: t("Original price is required for off-plan Resale"),
            });
          }
          if (!data.offplan_amount_paid || Number(data.offplan_amount_paid) <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["offplan_amount_paid"],
              message: t("Amount paid is required for off-plan Resale"),
            });
          }
        }
      }
    });

export type TPropertySchema = z.input<ReturnType<typeof PropertySchema>>;
