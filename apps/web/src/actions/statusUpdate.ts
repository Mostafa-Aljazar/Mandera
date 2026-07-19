"use server";

import { getServerSupabase } from "@/lib/supabase/server";

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
  const supabase = await getServerSupabase();
  const { entityType, entityId, companyId, createdByUserId, createdByName, payload } = input;

  if (entityType === "property" && payload.status_name) {
    const { error } = await supabase
      .from("properties")
      .update({ status: payload.status_name })
      .eq("id", entityId);
    if (error) return { error: error.message };
  }

  if (entityType === "client" && payload.status_id) {
    const clientUpdate: Record<string, unknown> = { status_id: payload.status_id };
    if (payload.follow_up_date) {
      clientUpdate.follow_up_date = payload.follow_up_date;
      clientUpdate.follow_up_time = payload.follow_up_time || null;
    }

    const { error } = await supabase
      .from("clients")
      .update(clientUpdate)
      .eq("id", entityId);
    if (error) return { error: error.message };
  } else if (entityType === "client" && payload.follow_up_date) {
    const { error } = await supabase
      .from("clients")
      .update({
        follow_up_date: payload.follow_up_date,
        follow_up_time: payload.follow_up_time || null,
      })
      .eq("id", entityId);
    if (error) return { error: error.message };
  }

  const historyTable = `${entityType}_status_history`;
  const historyPayload: Record<string, unknown> = {
    note: payload.note || "",
    created_by: createdByUserId,
    created_by_name: createdByName,
    company_id: companyId,
  };

  if (entityType === "owner") {
    historyPayload.owner_id = entityId;
    historyPayload.status_id = payload.status_id;
  } else if (entityType === "property") {
    historyPayload.property_id = entityId;
    historyPayload.status = payload.status_name;
  } else if (entityType === "client") {
    historyPayload.client_id = entityId;
    historyPayload.status_id = payload.status_id;
    historyPayload.status = payload.status_name;
    if (payload.follow_up_date) historyPayload.follow_up_date = payload.follow_up_date;
    if (payload.employee_id) historyPayload.employee_id = payload.employee_id;
  }

  const { error: historyError } = await supabase.from(historyTable).insert(historyPayload);
  if (historyError) return { error: historyError.message };

  return { data: null };
}
