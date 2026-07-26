"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { Revenue } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface RevenueFilters {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getRevenues(
  companyId: string,
  filters: RevenueFilters = {},
): Promise<ActionResult<Revenue[]>> {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("revenues")
    .select("*")
    .eq("company_id", companyId)
    .order("deal_completion_date", { ascending: false });

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.dateFrom) query = query.gte("deal_completion_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("deal_completion_date", filters.dateTo);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export interface CompleteDealInput {
  propertyId: string;
  propertyCode: string;
  emirate: string;
  areaDistrict: string | null;
  companyId: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  ownerName: string;
  commissionValue: number;
  createdBy: string | null;
  createdByName: string;
}

export async function completeDeal(
  input: CompleteDealInput,
): Promise<ActionResult<Revenue>> {
  const supabase = await getServerSupabase();

  const { error: propError } = await supabase
    .from("properties")
    .update({ status: "Deal Completed" })
    .eq("id", input.propertyId);
  if (propError) return { error: propError.message };

  const { data: revenue, error: revError } = await supabase
    .from("revenues")
    .insert({
      property_code: input.propertyCode,
      emirate: input.emirate,
      area_district: input.areaDistrict,
      commission_value: input.commissionValue,
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      deal_completion_date: new Date().toISOString(),
      client_id: input.clientId,
      client_name: input.clientName,
      owner_name: input.ownerName,
      company_id: input.companyId,
    })
    .select()
    .single();
  if (revError) return { error: revError.message };

  await supabase.from("property_status_history").insert({
    property_id: input.propertyId,
    status: "Deal Completed",
    note: `Deal completed with client ${input.clientName}`,
    created_by: input.createdBy,
    created_by_name: input.createdByName,
    company_id: input.companyId,
  });

  return { data: revenue };
}
