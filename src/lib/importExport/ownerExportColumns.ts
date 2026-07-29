import type { TFunction } from "i18next";
import { format } from "date-fns";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { countryLabel } from "@/lib/countries";
import type { Owner } from "@/types/supabase-entities.types";
import type { ImportEmployeeOption } from "@/lib/importExport/shared";
import type { ExportColumnDef } from "@/lib/importExport/exportColumnTypes";

export interface OwnerStatusOption {
  name_en?: string | null;
  name_ar?: string | null;
}

export interface OwnerExportContext {
  language: string;
  t: TFunction;
  employees: ImportEmployeeOption[];
  statusByOwnerId: Map<string, OwnerStatusOption | null>;
  propertiesCountByOwnerId: Map<string, number>;
}

function safeDate(value: string | null): string {
  if (!value) return "";
  try {
    return format(new Date(value), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export const OWNER_EXPORT_COLUMNS: ExportColumnDef<Owner, OwnerExportContext>[] = [
  {
    key: "name_en",
    getHeader: (ctx) => `${ctx.t("Full Name", { lng: ctx.language })} (EN)`,
    defaultSelected: true,
    getValue: (row) => row.name_en || "",
  },
  {
    key: "name_ar",
    getHeader: (ctx) => `${ctx.t("Full Name", { lng: ctx.language })} (AR)`,
    defaultSelected: true,
    getValue: (row) => row.name_ar || "",
  },
  {
    key: "phone",
    getHeader: (ctx) => ctx.t("Phone", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row) => row.phone || "",
  },
  {
    key: "country",
    getHeader: (ctx) => ctx.t("Country", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) => countryLabel(row.country, ctx.language),
  },
  {
    key: "employee",
    getHeader: (ctx) => ctx.t("Assigned Employee", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) => {
      if (!row.assigned_employee_id) return "";
      const emp = ctx.employees.find((e) => e.id === row.assigned_employee_id);
      return emp ? employeeDisplayName(emp, ctx.language, emp.name) : "";
    },
  },
  {
    key: "marketing_channel",
    getHeader: (ctx) => ctx.t("Marketing Channel", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row) => row.marketing_channel || "",
  },
  {
    key: "status",
    getHeader: (ctx) => ctx.t("Status", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) => {
      const status = ctx.statusByOwnerId.get(row.id);
      return status ? bilingualLabel(status, ctx.language) : "";
    },
  },
  {
    key: "properties_count",
    getHeader: (ctx) => ctx.t("Properties Count", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) => String(ctx.propertiesCountByOwnerId.get(row.id) ?? 0),
  },
  {
    key: "created_at",
    getHeader: (ctx) => ctx.t("Created At", { lng: ctx.language }),
    defaultSelected: false,
    getValue: (row) => safeDate(row.created_at),
  },
];
