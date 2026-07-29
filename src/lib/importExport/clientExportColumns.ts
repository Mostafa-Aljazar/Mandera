import type { TFunction } from "i18next";
import { format } from "date-fns";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { countryLabel } from "@/lib/countries";
import type { ClientWithRelations } from "@/types/supabase-entities.types";
import type { ImportEmployeeOption } from "@/lib/importExport/shared";
import type { ExportColumnDef } from "@/lib/importExport/exportColumnTypes";

export interface ClientStatusOption {
  id: string;
  name_en?: string | null;
  name_ar?: string | null;
}

export interface ClientExportContext {
  language: string;
  t: TFunction;
  employees: ImportEmployeeOption[];
  statuses: ClientStatusOption[];
}

function safeDate(value: string | null): string {
  if (!value) return "";
  try {
    return format(new Date(value), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export const CLIENT_EXPORT_COLUMNS: ExportColumnDef<
  ClientWithRelations,
  ClientExportContext
>[] = [
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
    getValue: (row, ctx) => countryLabel(row.country_code, ctx.language),
  },
  {
    key: "interest_type",
    getHeader: (ctx) => ctx.t("Interest Type", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) =>
      row.interest_type ? ctx.t(row.interest_type, { lng: ctx.language }) : "",
  },
  {
    key: "employee",
    getHeader: (ctx) => ctx.t("Assigned Employee", { lng: ctx.language }),
    defaultSelected: true,
    getValue: (row, ctx) => {
      const emp = ctx.employees.find((e) => e.id === row.employee_id);
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
      const status = ctx.statuses.find((s) => s.id === row.status_id);
      return status ? bilingualLabel(status, ctx.language) : "";
    },
  },
  {
    key: "follow_up_date",
    getHeader: (ctx) => ctx.t("Follow-up Date", { lng: ctx.language }),
    defaultSelected: false,
    getValue: (row) => safeDate(row.follow_up_date),
  },
  {
    key: "created_at",
    getHeader: (ctx) => ctx.t("Created At", { lng: ctx.language }),
    defaultSelected: false,
    getValue: (row) => safeDate(row.created_at),
  },
];
