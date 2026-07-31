"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import {
  isManager,
  isMasterAdmin,
  isSalesAgent,
} from "@/lib/permissions";
import type { ClientAppointment } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function assertClientAccess(
  companyId: string,
  clientId: string,
): Promise<ActionResult<{ userId: string; role: string }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, employee_id, editing_locked")
    .eq("id", clientId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!client) return { error: "Client not found" };
  if (isSalesAgent(access.data.role) && client.employee_id !== access.data.userId) {
    return { error: "Access denied" };
  }
  if (
    client.editing_locked &&
    !isManager(access.data.role) &&
    !isMasterAdmin(access.data.role)
  ) {
    return { error: "This record is locked and cannot be edited." };
  }

  return { data: { userId: access.data.userId, role: access.data.role } };
}

export async function getClientAppointments(
  companyId: string,
  clientId: string,
): Promise<ActionResult<ClientAppointment[]>> {
  const access = await assertClientAccess(companyId, clientId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  let query = supabase
    .from("client_appointments")
    .select("*")
    .eq("company_id", companyId)
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: true });

  // PDF: agent cannot view appointments/notes added by other employees.
  if (isSalesAgent(access.data.role)) {
    query = query.eq("created_by", access.data.userId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: (data ?? []) as ClientAppointment[] };
}

export async function createClientAppointment(input: {
  companyId: string;
  clientId: string;
  propertyId?: string | null;
  kind?: "appointment" | "viewing";
  title: string;
  scheduledAt: string;
  note?: string;
}): Promise<ActionResult<ClientAppointment>> {
  const access = await assertClientAccess(input.companyId, input.clientId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const title = input.title.trim();
  if (!title) return { error: "Appointment title is required." };
  if (!input.scheduledAt) return { error: "Appointment date/time is required." };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_appointments")
    .insert({
      company_id: input.companyId,
      client_id: input.clientId,
      property_id: input.propertyId || null,
      kind: input.kind === "viewing" ? "viewing" : "appointment",
      title,
      scheduled_at: input.scheduledAt,
      note: input.note?.trim() || null,
      created_by: access.data.userId,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as ClientAppointment };
}

export async function deleteClientAppointment(
  id: string,
  companyId: string,
  clientId: string,
): Promise<ActionResult<null>> {
  const access = await assertClientAccess(companyId, clientId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  let query = supabase
    .from("client_appointments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("client_id", clientId);

  if (isSalesAgent(access.data.role)) {
    query = query.eq("created_by", access.data.userId);
  }

  const { error } = await query;
  if (error) return { error: error.message };
  return { data: null };
}
