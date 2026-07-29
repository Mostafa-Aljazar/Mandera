export interface ParsedImportRow<T> {
  /** 1-based Excel row number, matching what the user sees when reopening the file. */
  row: number;
  data?: T;
  errors?: string[];
}

export interface ClientImportRow {
  name_en: string;
  name_ar: string;
  phone: string;
  country_code: string;
  interest_type: string;
  employee_id: string;
  marketing_channel: string | null;
}

export interface OwnerImportRow {
  name_en: string;
  name_ar: string;
  phone: string;
  country: string;
  assigned_employee_id: string | null;
  marketing_channel: string | null;
  /** Existing property ids resolved from the "Linked Property Code(s)" column. */
  property_ids: string[];
}
