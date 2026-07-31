"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { updatePropertyStatus } from "@/actions/properties";
import { assertCompanyMember } from "@/actions/_access";
import {
  canAssignRecords,
  isManager,
  isMasterAdmin,
  isSalesAgent,
} from "@/lib/permissions";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export type StatusUpdateEntityType = "owner" | "property" | "client";

export interface StatusUpdatePayload {
  note?: string;
  status_id?: string;
  status_name?: string;
  follow_up_date?: string;
  follow_up_time?: string;
  employee_id?: string;
}

export interface UpdateEntityStatusInput {
  entityType: StatusUpdateEntityType;
  entityId: string;
  companyId: string;
  createdByUserId: string;
  createdByName: string;
  payload: StatusUpdatePayload;
}

export async function updateEntityStatus(
  input: UpdateEntityStatusInput,
): Promise<ActionResult<null>> {
  const { entityType, entityId, companyId, createdByUserId, createdByName, payload } =
    input;

  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }

  const supabase = await getServerSupabase();

  // Property statuses go through the Phase 5 matrix (operational vs final).
  if (entityType === "property" && payload.status_name) {
    const result = await updatePropertyStatus(
      entityId,
      companyId,
      payload.status_name,
      createdByUserId,
      createdByName,
      payload.note || "Status update",
    );
    if (result.error) return { error: result.error };
    return { data: null };
  }

  if (entityType === "client") {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, employee_id, editing_locked")
      .eq("id", entityId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (clientError) return { error: clientError.message };
    if (!client) return { error: "Client not found" };
    if (
      isSalesAgent(access.data.role) &&
      client.employee_id !== access.data.userId
    ) {
      return { error: "Access denied" };
    }
    if (
      client.editing_locked &&
      !isManager(access.data.role) &&
      !isMasterAdmin(access.data.role)
    ) {
      return { error: "This record is locked and cannot be edited." };
    }
  }

  if (entityType === "owner") {
    const { data: owner, error: ownerError } = await supabase
      .from("owners")
      .select("id, assigned_employee_id, editing_locked")
      .eq("id", entityId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (ownerError) return { error: ownerError.message };
    if (!owner) return { error: "Owner not found" };
    if (
      isSalesAgent(access.data.role) &&
      owner.assigned_employee_id !== access.data.userId
    ) {
      return { error: "Access denied" };
    }
    // PDF: Sales Agent cannot view or change owner pipeline status.
    if (isSalesAgent(access.data.role) && payload.status_id) {
      return { error: "Sales agents cannot update owner status." };
    }
    if (
      owner.editing_locked &&
      !isManager(access.data.role) &&
      !isMasterAdmin(access.data.role)
    ) {
      return { error: "This record is locked and cannot be edited." };
    }
  }

  if (entityType === "client" && payload.status_id) {
    const clientUpdate: Record<string, unknown> = {
      status_id: payload.status_id,
    };
    if (payload.follow_up_date) {
      clientUpdate.follow_up_date = payload.follow_up_date;
      clientUpdate.follow_up_time = payload.follow_up_time || null;
    }

    const { error } = await supabase
      .from("clients")
      .update(clientUpdate)
      .eq("id", entityId)
      .eq("company_id", companyId);
    if (error) return { error: error.message };
  } else if (entityType === "client" && payload.follow_up_date) {
    const { error } = await supabase
      .from("clients")
      .update({
        follow_up_date: payload.follow_up_date,
        follow_up_time: payload.follow_up_time || null,
      })
      .eq("id", entityId)
      .eq("company_id", companyId);
    if (error) return { error: error.message };
  } else if (
    entityType === "owner" &&
    (payload.follow_up_date || payload.status_id || payload.note)
  ) {
    const ownerUpdate: Record<string, unknown> = {};
    if (payload.follow_up_date) {
      ownerUpdate.follow_up_date = payload.follow_up_date;
      ownerUpdate.follow_up_time = payload.follow_up_time || null;
    }
    if (Object.keys(ownerUpdate).length > 0) {
      const { error } = await supabase
        .from("owners")
        .update(ownerUpdate)
        .eq("id", entityId)
        .eq("company_id", companyId);
      if (error) return { error: error.message };
    }
  }

  // Sales agents cannot reassign via status history employee_id.
  const historyEmployeeId =
    canAssignRecords(access.data.role) || isMasterAdmin(access.data.role)
      ? payload.employee_id
      : undefined;

  const historyTable = `${entityType}_status_history`;
  const historyPayload: Record<string, unknown> = {
    note: payload.note || "",
    created_by: createdByUserId,
    created_by_name: createdByName,
    company_id: companyId,
  };

  if (entityType === "owner") {
    historyPayload.owner_id = entityId;
    historyPayload.status_id = payload.status_id || null;
  } else if (entityType === "client") {
    historyPayload.client_id = entityId;
    historyPayload.status_id = payload.status_id;
    historyPayload.status = payload.status_name;
    if (payload.follow_up_date) {
      historyPayload.follow_up_date = payload.follow_up_date;
    }
    if (historyEmployeeId) historyPayload.employee_id = historyEmployeeId;
  }

  const { error: historyError } = await supabase
    .from(historyTable)
    .insert(historyPayload);
  if (historyError) return { error: historyError.message };

  return { data: null };
}
