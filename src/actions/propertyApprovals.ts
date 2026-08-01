"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import {
  notifyCompanyAdministrators,
  notifyUser,
} from "@/actions/notifications";
import {
  formatNotifyPropertyLine,
} from "@/lib/notificationCopy";
import {
  canApproveFinalStatus,
  canApproveProperties,
  canClassifyProperty,
  canEditApprovedPropertyDirectly,
  canLockRecords,
  canViewInsights,
  isAdministratorOrAbove,
  isManager,
  isMasterAdmin,
  isSalesAgent,
  stripPropertyCommissionUnlessManager,
} from "@/lib/permissions";
import type {
  Property,
  PropertyChangeRequest,
  PropertyClassification,
  PropertyStatusChangeRequest,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

function formatNotificationDate(date = new Date()): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Notify listing agent + requester (unique) with property context in the body. */
async function notifyPropertyReviewAgents(input: {
  companyId: string;
  propertyId: string;
  requestedBy?: string | null;
  type: string;
  title: string;
  note?: string | null;
  extraLines?: string[];
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: property } = await supabase
    .from("properties")
    .select("code, title, title_ar, employee_id")
    .eq("id", input.propertyId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  const recipients = new Set<string>();
  if (property?.employee_id) recipients.add(property.employee_id);
  if (input.requestedBy) recipients.add(input.requestedBy);
  if (recipients.size === 0) return;

  const lines: string[] = [];
  // Put the review reason first so it stays visible under line-clamp in the bell.
  if (input.note?.trim()) lines.push(`Note: ${input.note.trim()}`);
  if (property) {
    lines.push(
      formatNotifyPropertyLine(property.code, property.title, property.title_ar),
    );
  }
  for (const line of input.extraLines ?? []) {
    if (line.trim()) lines.push(line.trim());
  }
  lines.push(`Date: ${formatNotificationDate()}`);
  const body = lines.join("\n");

  await Promise.all(
    [...recipients].map((recipientId) =>
      notifyUser({
        companyId: input.companyId,
        recipientId,
        type: input.type,
        title: input.title,
        body,
        link: `/company/properties/${input.propertyId}`,
        entityType: input.entityType,
        entityId: input.entityId,
      }),
    ),
  );
}

async function loadProperty(
  propertyId: string,
  companyId: string,
  role?: string | null,
): Promise<ActionResult<Property>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Property not found" };
  return {
    data: stripPropertyCommissionUnlessManager(data as Property, role),
  };
}

/** Draft → Pending Review (assigned agent or admin+). */
export async function submitPropertyForReview(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const loaded = await loadProperty(propertyId, companyId, access.data.role);
  if (loaded.error || !loaded.data) return { error: loaded.error || "Property not found" };
  const property = loaded.data;

  const isAgent = isSalesAgent(access.data.role);
  if (isAgent && property.employee_id !== access.data.userId) {
    return { error: "Access denied" };
  }
  if (!isAgent && !canApproveProperties(access.data.role)) {
    return { error: "Access denied" };
  }
  if (property.approval_status !== "draft" && property.approval_status !== "rejected") {
    return { error: "Only draft or rejected properties can be submitted for review." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      approval_status: "pending_review",
      approval_note: null,
    })
    .eq("id", propertyId)
    .select()
    .single();

  if (error) return { error: error.message };

  const isResubmit = property.approval_status === "rejected";
  await notifyCompanyAdministrators({
    companyId,
    type: isResubmit ? "property_resubmitted" : "property_pending_review",
    title: isResubmit ? "Rejected Property Resubmitted" : "Property Pending Review",
    body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nDate: ${formatNotificationDate()}`,
    link: `/company/properties/${propertyId}`,
    entityType: "property",
    entityId: propertyId,
  });

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function approveProperty(
  propertyId: string,
  companyId: string,
  note?: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  const loaded = await loadProperty(propertyId, companyId, access.data.role);
  if (loaded.error || !loaded.data) return { error: loaded.error || "Property not found" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      approval_status: "approved",
      approval_note: note?.trim() || null,
    })
    .eq("id", propertyId)
    .select()
    .single();

  if (error) return { error: error.message };

  if (loaded.data.employee_id) {
    await notifyUser({
      companyId,
      recipientId: loaded.data.employee_id,
      type: "property_approved",
      title: "Property Approved",
      body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function rejectProperty(
  propertyId: string,
  companyId: string,
  note: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  const trimmed = note.trim();
  if (!trimmed) return { error: "A rejection note is required." };

  const loaded = await loadProperty(propertyId, companyId, access.data.role);
  if (loaded.error || !loaded.data) return { error: loaded.error || "Property not found" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      approval_status: "rejected",
      approval_note: trimmed,
    })
    .eq("id", propertyId)
    .select()
    .single();

  if (error) return { error: error.message };

  if (loaded.data.employee_id) {
    await notifyUser({
      companyId,
      recipientId: loaded.data.employee_id,
      type: "property_rejected",
      title: "Property Rejected",
      body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nNote: ${trimmed}\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

/** Return to agent as draft with mandatory note. */
export async function returnPropertyForChanges(
  propertyId: string,
  companyId: string,
  note: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  const trimmed = note.trim();
  if (!trimmed) return { error: "A note is required when returning for changes." };

  const loaded = await loadProperty(propertyId, companyId, access.data.role);
  if (loaded.error || !loaded.data) return { error: loaded.error || "Property not found" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      approval_status: "draft",
      approval_note: trimmed,
    })
    .eq("id", propertyId)
    .select()
    .single();

  if (error) return { error: error.message };

  if (loaded.data.employee_id) {
    await notifyUser({
      companyId,
      recipientId: loaded.data.employee_id,
      type: "property_returned",
      title: "Property Returned for Changes",
      body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nNote: ${trimmed}\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export interface CreatePropertyChangeRequestInput {
  propertyId: string;
  companyId: string;
  proposedData: Record<string, unknown>;
  changedFields: string[];
  imagesAdded?: string[];
  imagesRemoved?: string[];
  /** New image files to upload and attach to the change request. */
  imageFiles?: File[];
}

async function uploadChangeRequestImages(
  companyId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = await getServerSupabase();
  const urls: string[] = [];
  for (const file of files) {
    const path = `${companyId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("property-images")
      .upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function createPropertyChangeRequest(
  input: CreatePropertyChangeRequestInput,
): Promise<ActionResult<PropertyChangeRequest>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const loaded = await loadProperty(input.propertyId, input.companyId, access.data.role);
  if (loaded.error || !loaded.data) return { error: loaded.error || "Property not found" };
  const property = loaded.data;

  if (property.is_locked && !canLockRecords(access.data.role)) {
    return { error: "This property is locked and cannot be edited." };
  }

  if (isSalesAgent(access.data.role)) {
    if (property.employee_id !== access.data.userId) {
      return { error: "Access denied" };
    }
    if (property.approval_status !== "approved") {
      return { error: "Change requests are only for approved properties." };
    }
  } else if (!canEditApprovedPropertyDirectly(access.data.role)) {
    return { error: "Access denied" };
  }

  if (input.changedFields.length === 0) {
    return { error: "No changed fields specified." };
  }

  const supabase = await getServerSupabase();

  // PDF rule: agent cannot open a new change request while one is still Pending.
  const { data: existingPending, error: pendingLookupError } = await supabase
    .from("property_change_requests")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("property_id", input.propertyId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingLookupError) return { error: pendingLookupError.message };
  if (existingPending) {
    return {
      error:
        "A Pending change request already exists for this property. Cancel it or wait until it is Approved, Rejected, or Changes Requested before submitting a new one.",
    };
  }

  let imagesAdded = input.imagesAdded ?? [];
  try {
    if (input.imageFiles && input.imageFiles.length > 0) {
      const uploaded = await uploadChangeRequestImages(
        input.companyId,
        input.imageFiles,
      );
      imagesAdded = [...imagesAdded, ...uploaded];
    }
  } catch (err) {
    return { error: (err as Error).message };
  }

  const currentData: Record<string, unknown> = {};
  const propertyRecord = property as unknown as Record<string, unknown>;
  for (const field of input.changedFields) {
    currentData[field] = propertyRecord[field] ?? null;
  }

  const { data, error } = await supabase
    .from("property_change_requests")
    .insert({
      company_id: input.companyId,
      property_id: input.propertyId,
      requested_by: access.data.userId,
      status: "pending",
      current_data: currentData,
      proposed_data: input.proposedData,
      changed_fields: input.changedFields,
      images_added: imagesAdded,
      images_removed: input.imagesRemoved ?? [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("one_pending")) {
      return {
        error:
          "A Pending change request already exists for this property. Cancel it or wait until it is Approved, Rejected, or Changes Requested before submitting a new one.",
      };
    }
    return { error: error.message };
  }

  // Emit one notification per PDF Administrator event (edit / add photos / delete photos),
  // not a single combined type when multiple apply on the same change request.
  const imagesRemoved = input.imagesRemoved ?? [];
  const hasImageAdds = imagesAdded.length > 0;
  const hasImageRemoves = imagesRemoved.length > 0;
  const nonImageFields = input.changedFields.filter((f) => f !== "images");
  const hasFieldEdits = nonImageFields.length > 0;
  const propLine = formatNotifyPropertyLine(
    property.code,
    property.title,
    property.title_ar,
  );
  const dateLine = `Date: ${formatNotificationDate()}`;
  const link = `/company/properties/${input.propertyId}`;

  if (hasFieldEdits) {
    await notifyCompanyAdministrators({
      companyId: input.companyId,
      type: "property_change_request",
      title: "Property Change Request",
      body: `${propLine}\nFields: ${nonImageFields.join(", ")}\n${dateLine}`,
      link,
      entityType: "property_change_request",
      entityId: data.id,
    });
  }
  if (hasImageAdds) {
    await notifyCompanyAdministrators({
      companyId: input.companyId,
      type: "property_images_added",
      title: "Property Images Added",
      body: `${propLine}\nImages added: ${imagesAdded.length}\n${dateLine}`,
      link,
      entityType: "property_change_request",
      entityId: data.id,
    });
  }
  if (hasImageRemoves) {
    await notifyCompanyAdministrators({
      companyId: input.companyId,
      type: "property_images_removal_request",
      title: "Property Image Deletion Requested",
      body: `${propLine}\nImages removed: ${imagesRemoved.length}\n${dateLine}`,
      link,
      entityType: "property_change_request",
      entityId: data.id,
    });
  }
  if (!hasFieldEdits && !hasImageAdds && !hasImageRemoves) {
    await notifyCompanyAdministrators({
      companyId: input.companyId,
      type: "property_change_request",
      title: "Property Change Request",
      body: `${propLine}\nFields: ${input.changedFields.join(", ")}\n${dateLine}`,
      link,
      entityType: "property_change_request",
      entityId: data.id,
    });
  }

  return { data: data as PropertyChangeRequest };
}

export async function reviewPropertyChangeRequest(
  id: string,
  decision: "approved" | "rejected" | "changes_requested",
  note?: string,
): Promise<ActionResult<PropertyChangeRequest>> {
  const supabase = await getServerSupabase();
  const { data: request, error: fetchError } = await supabase
    .from("property_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!request) return { error: "Change request not found" };

  const access = await assertCompanyMember(request.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  if (request.status !== "pending" && request.status !== "changes_requested") {
    return { error: "Only pending or changes-requested items can be reviewed." };
  }

  // From "changes_requested", admins may still approve the original proposed edits
  // (or leave/delete the item). Reject / request-changes again only from pending.
  if (request.status === "changes_requested" && decision !== "approved") {
    return {
      error:
        "This request already asked for changes. Approve the edits or delete the request.",
    };
  }

  const trimmed = note?.trim() || null;
  if ((decision === "rejected" || decision === "changes_requested") && !trimmed) {
    return { error: "A note is required for this decision." };
  }

  if (decision === "approved") {
    const proposed = (request.proposed_data ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const field of request.changed_fields ?? []) {
      if (field in proposed) patch[field] = proposed[field];
    }

    // Apply image list mutations when present on the request.
    if (
      (request.images_added?.length ?? 0) > 0 ||
      (request.images_removed?.length ?? 0) > 0
    ) {
      const { data: property } = await supabase
        .from("properties")
        .select("images")
        .eq("id", request.property_id)
        .single();
      const currentImages = (property?.images as string[] | null) ?? [];
      const removed = new Set(request.images_removed ?? []);
      const nextImages = [
        ...currentImages.filter((url) => !removed.has(url)),
        ...(request.images_added ?? []),
      ];
      patch.images = nextImages;
    }

    if (Object.keys(patch).length > 0) {
      const { error: applyError } = await supabase
        .from("properties")
        .update(patch)
        .eq("id", request.property_id);
      if (applyError) return { error: applyError.message };
    }
  }

  const { data, error } = await supabase
    .from("property_change_requests")
    .update({
      status: decision,
      review_note: trimmed,
      reviewer_id: access.data.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  const title =
    decision === "approved"
      ? "Change Request Approved"
      : decision === "rejected"
        ? "Change Request Rejected"
        : "Changes Requested on Property Edit";

  await notifyPropertyReviewAgents({
    companyId: request.company_id,
    propertyId: request.property_id,
    requestedBy: request.requested_by,
    type: `property_change_${decision}`,
    title,
    note: trimmed,
    entityType: "property_change_request",
    entityId: id,
  });

  return { data: data as PropertyChangeRequest };
}

/**
 * PDF: Admin may approve or reject new photos independently of field edits.
 * Approved: apply selected/all added images (and removals) to the property.
 * Rejected: drop image mutations from the pending request without applying them.
 * Field changes stay pending unless this request had no field changes left.
 */
export async function reviewPropertyChangeRequestImages(
  id: string,
  decision: "approved" | "rejected",
  options?: {
    acceptedAddedUrls?: string[];
    note?: string;
  },
): Promise<ActionResult<PropertyChangeRequest>> {
  const supabase = await getServerSupabase();
  const { data: request, error: fetchError } = await supabase
    .from("property_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!request) return { error: "Change request not found" };

  const access = await assertCompanyMember(request.company_id);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canApproveProperties(access.data.role)) {
    return { error: "Access denied" };
  }
  if (request.status !== "pending") {
    return { error: "Only pending change requests can be reviewed." };
  }

  const imagesAdded = (request.images_added ?? []) as string[];
  const imagesRemoved = (request.images_removed ?? []) as string[];
  if (imagesAdded.length === 0 && imagesRemoved.length === 0) {
    return { error: "This change request has no image changes to review." };
  }

  const trimmed = options?.note?.trim() || null;
  if (decision === "rejected" && !trimmed) {
    return { error: "A note is required when rejecting photos." };
  }

  if (decision === "approved") {
    const acceptedSet = options?.acceptedAddedUrls
      ? new Set(options.acceptedAddedUrls)
      : null;
    const acceptedAdded = acceptedSet
      ? imagesAdded.filter((url) => acceptedSet.has(url))
      : imagesAdded;

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("images")
      .eq("id", request.property_id)
      .single();
    if (propertyError) return { error: propertyError.message };

    const currentImages = (property?.images as string[] | null) ?? [];
    const removed = new Set(imagesRemoved);
    const nextImages = [
      ...currentImages.filter((url) => !removed.has(url)),
      ...acceptedAdded,
    ];
    const { error: applyError } = await supabase
      .from("properties")
      .update({ images: nextImages })
      .eq("id", request.property_id);
    if (applyError) return { error: applyError.message };
  }

  const fieldChanges = (request.changed_fields ?? []).filter(
    (field: string) => field !== "images",
  );
  const hasFieldChanges = fieldChanges.length > 0;

  // Clear image mutations from the request (applied or discarded).
  const imageClearedPatch: Record<string, unknown> = {
    images_added: [],
    images_removed: [],
    changed_fields: fieldChanges,
  };

  if (!hasFieldChanges) {
    // Image-only request: close it with the image decision.
    const { data, error } = await supabase
      .from("property_change_requests")
      .update({
        ...imageClearedPatch,
        status: decision,
        review_note: trimmed,
        reviewer_id: access.data.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return { error: error.message };

    await notifyPropertyReviewAgents({
      companyId: request.company_id,
      propertyId: request.property_id,
      requestedBy: request.requested_by,
      type:
        decision === "approved"
          ? "property_images_approved"
          : "property_images_rejected",
      title:
        decision === "approved" ? "Photos Approved" : "Photos Rejected",
      note: trimmed,
      entityType: "property_change_request",
      entityId: id,
    });

    return { data: data as PropertyChangeRequest };
  }

  const { data, error } = await supabase
    .from("property_change_requests")
    .update(imageClearedPatch)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };

  await notifyPropertyReviewAgents({
    companyId: request.company_id,
    propertyId: request.property_id,
    requestedBy: request.requested_by,
    type:
      decision === "approved"
        ? "property_images_approved"
        : "property_images_rejected",
    title:
      decision === "approved"
        ? "Photos Approved (fields still pending)"
        : "Photos Rejected (fields still pending)",
    note: trimmed,
    entityType: "property_change_request",
    entityId: id,
  });

  return { data: data as PropertyChangeRequest };
}

export async function reviewPropertyStatusChangeRequest(
  id: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<ActionResult<PropertyStatusChangeRequest>> {
  const supabase = await getServerSupabase();
  const { data: request, error: fetchError } = await supabase
    .from("property_status_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!request) return { error: "Status change request not found" };

  const access = await assertCompanyMember(request.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveFinalStatus(access.data.role)) return { error: "Access denied" };

  if (request.status !== "pending") {
    return { error: "Only pending status change requests can be reviewed." };
  }

  const trimmed = note?.trim() || null;
  if (decision === "rejected" && !trimmed) {
    return { error: "A rejection note is required." };
  }

  if (decision === "approved") {
    const { error: applyError } = await supabase
      .from("properties")
      .update({ status: request.new_status })
      .eq("id", request.property_id);
    if (applyError) return { error: applyError.message };

    await supabase.from("property_status_history").insert({
      property_id: request.property_id,
      status: request.new_status,
      note: trimmed || `Approved final status change to ${request.new_status}`,
      created_by: access.data.userId,
      created_by_name: null,
      company_id: request.company_id,
    });
  }

  const { data, error } = await supabase
    .from("property_status_change_requests")
    .update({
      status: decision,
      review_note: trimmed,
      reviewer_id: access.data.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await notifyPropertyReviewAgents({
    companyId: request.company_id,
    propertyId: request.property_id,
    requestedBy: request.requested_by,
    type: `property_status_change_${decision}`,
    title:
      decision === "approved"
        ? "Final Status Change Approved"
        : "Final Status Change Rejected",
    note: trimmed,
    extraLines: [
      `Previous Status: ${request.previous_status}`,
      `New Status: ${request.new_status}`,
    ],
    entityType: "property_status_change_request",
    entityId: id,
  });

  return { data: data as PropertyStatusChangeRequest };
}

export type PropertyChangeRequestWithProperty = PropertyChangeRequest & {
  property_code: string | null;
  property_title: string | null;
  property_employee_id: string | null;
};

export type PropertyStatusChangeRequestWithProperty =
  PropertyStatusChangeRequest & {
    property_code: string | null;
    property_title: string | null;
    property_employee_id: string | null;
  };

export interface PendingPropertyApprovals {
  pendingProperties: Property[];
  draftProperties: Array<Property & { is_stale: boolean }>;
  staleDraftDays: number;
  changeRequests: PropertyChangeRequestWithProperty[];
  statusChangeRequests: PropertyStatusChangeRequestWithProperty[];
}

export async function listPendingPropertyApprovals(
  companyId: string,
): Promise<ActionResult<PendingPropertyApprovals>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) {
    return {
      data: {
        pendingProperties: [],
        draftProperties: [],
        staleDraftDays: 3,
        changeRequests: [],
        statusChangeRequests: [],
      },
    };
  }

  const supabase = await getServerSupabase();

  const { data: company } = await supabase
    .from("companies")
    .select("notification_settings")
    .eq("id", companyId)
    .maybeSingle();
  const settings =
    (company?.notification_settings as Record<string, unknown> | null) ?? {};
  const configuredDays = Number(settings.draft_stale_days);
  const staleDraftDays =
    Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 3;
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - staleDraftDays);
  const staleCutoffIso = staleCutoff.toISOString();

  const [props, drafts, changes, statuses] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("company_id", companyId)
      .eq("approval_status", "pending_review")
      .order("updated_at", { ascending: false }),
    supabase
      .from("properties")
      .select("*")
      .eq("company_id", companyId)
      .eq("approval_status", "draft")
      .order("updated_at", { ascending: true }),
    supabase
      .from("property_change_requests")
      .select("*")
      .eq("company_id", companyId)
      .in("status", ["pending", "changes_requested"])
      .order("created_at", { ascending: false }),
    supabase
      .from("property_status_change_requests")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (props.error) return { error: props.error.message };
  if (drafts.error) return { error: drafts.error.message };
  if (changes.error) return { error: changes.error.message };
  if (statuses.error) return { error: statuses.error.message };

  const changeRows = (changes.data ?? []) as PropertyChangeRequest[];
  const statusRows = (statuses.data ?? []) as PropertyStatusChangeRequest[];
  const relatedIds = [
    ...new Set([
      ...changeRows.map((r) => r.property_id),
      ...statusRows.map((r) => r.property_id),
    ]),
  ];

  const metaById = new Map<
    string,
    { code: string | null; title: string | null; employee_id: string | null }
  >();
  if (relatedIds.length > 0) {
    const { data: metaRows } = await supabase
      .from("properties")
      .select("id, code, title, employee_id")
      .eq("company_id", companyId)
      .in("id", relatedIds);
    for (const row of metaRows ?? []) {
      metaById.set(row.id, {
        code: row.code ?? null,
        title: row.title ?? null,
        employee_id: row.employee_id ?? null,
      });
    }
  }

  const enrich = <T extends { property_id: string }>(row: T) => {
    const meta = metaById.get(row.property_id);
    return {
      ...row,
      property_code: meta?.code ?? null,
      property_title: meta?.title ?? null,
      property_employee_id: meta?.employee_id ?? null,
    };
  };

  const draftProperties = ((drafts.data ?? []) as Property[]).map((p) => ({
    ...stripPropertyCommissionUnlessManager(p, access.data.role),
    is_stale: Boolean(p.updated_at && p.updated_at < staleCutoffIso),
  }));

  return {
    data: {
      pendingProperties: ((props.data ?? []) as Property[]).map((p) =>
        stripPropertyCommissionUnlessManager(p, access.data.role),
      ),
      draftProperties,
      staleDraftDays,
      changeRequests: changeRows.map(enrich),
      statusChangeRequests: statusRows.map(enrich),
    },
  };
}

export interface RecentPropertyStatusChange {
  id: string;
  property_id: string;
  property_code: string | null;
  property_title: string | null;
  property_title_ar: string | null;
  status: string;
  note: string | null;
  created_at: string;
  created_by_name: string | null;
  created_by_name_en: string | null;
  created_by_name_ar: string | null;
}

/** PDF Dashboard: properties whose status changed (completed history, not pending queue). */
export async function getRecentPropertyStatusChanges(
  companyId: string,
  days = 14,
): Promise<ActionResult<RecentPropertyStatusChange[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewInsights(access.data.role) && !canApproveProperties(access.data.role)) {
    return { error: "Access denied" };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_status_history")
    .select(
      "id, property_id, status, note, created_at, created_by, created_by_name, property:properties!property_status_history_property_id_fkey(code, title, title_ar)",
    )
    .eq("company_id", companyId)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return { error: error.message };

  const creatorIds = [
    ...new Set(
      (data ?? [])
        .map((row: { created_by?: string | null }) => row.created_by)
        .filter(Boolean) as string[],
    ),
  ];

  const creatorMap = new Map<
    string,
    { name_en: string; name_ar: string; fallback: string | null }
  >();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        "id, name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
      )
      .in("id", creatorIds);

    for (const row of profiles ?? []) {
      const empRaw = (row as { employee?: unknown }).employee;
      const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;
      const empRec = emp as {
        first_name_en?: string | null;
        first_name_ar?: string | null;
        last_name_en?: string | null;
        last_name_ar?: string | null;
      } | null;
      const empEn = empRec
        ? [empRec.first_name_en, empRec.last_name_en].filter(Boolean).join(" ").trim()
        : "";
      const empAr = empRec
        ? [empRec.first_name_ar, empRec.last_name_ar].filter(Boolean).join(" ").trim()
        : "";
      creatorMap.set(row.id, {
        name_en: empEn || (row.name_en || "").trim() || row.name || "",
        name_ar: empAr || (row.name_ar || "").trim() || "",
        fallback: row.name,
      });
    }
  }

  return {
    data: (data ?? []).map((row: any) => {
      const property = Array.isArray(row.property) ? row.property[0] : row.property;
      const creator = row.created_by ? creatorMap.get(row.created_by) : undefined;
      return {
        id: row.id,
        property_id: row.property_id,
        property_code: property?.code ?? null,
        property_title: property?.title ?? null,
        property_title_ar: property?.title_ar ?? null,
        status: row.status,
        note: row.note,
        created_at: row.created_at,
        created_by_name: row.created_by_name,
        created_by_name_en: creator?.name_en || row.created_by_name || null,
        created_by_name_ar: creator?.name_ar || null,
      };
    }),
  };
}

export async function classifyProperty(
  propertyId: string,
  companyId: string,
  classification: PropertyClassification,
  reason: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canClassifyProperty(access.data.role)) return { error: "Access denied" };

  const trimmed = reason.trim();
  if (!trimmed) return { error: "A classification reason is required." };
  if (!["A", "B", "C"].includes(classification)) {
    return { error: "Classification must be A, B, or C." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      classification,
      classification_reason: trimmed,
    })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function pauseProperty(
  propertyId: string,
  companyId: string,
  reason: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  const trimmed = reason.trim();
  if (!trimmed) return { error: "A pause reason is required." };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      paused_at: new Date().toISOString(),
      pause_reason: trimmed,
    })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };

  const admin = getSupabaseAdmin();
  const { data: company } = await admin
    .from("companies")
    .select("publish_settings")
    .eq("id", companyId)
    .maybeSingle();
  const publishSettings =
    (company?.publish_settings as Record<string, unknown> | null) ?? {};

  if (publishSettings.auto_unpublish_on_pause === true) {
    const { unpublishAllPortalsForProperty } = await import(
      "@/actions/portalPublishing"
    );
    await unpublishAllPortalsForProperty(propertyId, companyId);
  }

  if (data.employee_id) {
    await notifyUser({
      companyId,
      recipientId: data.employee_id,
      type: "property_paused",
      title: "Property Paused",
      body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nReason: ${trimmed}\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function unpauseProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) return { error: "Access denied" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({
      paused_at: null,
      pause_reason: null,
    })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };

  if (data.employee_id) {
    await notifyUser({
      companyId,
      recipientId: data.employee_id,
      type: "property_unpaused",
      title: "Property Resumed",
      body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

/** Manager-only: move an archived listing back to Available. */
export async function reopenArchivedProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can reopen archived properties." };
  }

  const supabase = await getServerSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("properties")
    .select("id, status")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Property not found" };
  if (existing.status !== "Archived") {
    return { error: "Only archived properties can be reopened." };
  }

  const { data, error } = await supabase
    .from("properties")
    .update({ status: "Available" })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function lockProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can lock properties." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({ is_locked: true })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function unlockProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can unlock properties." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update({ is_locked: false })
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: stripPropertyCommissionUnlessManager(data as Property, access.data.role) };
}

export async function cancelPropertyChangeRequest(
  id: string,
  companyId: string,
): Promise<ActionResult<PropertyChangeRequest>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: request, error: fetchError } = await supabase
    .from("property_change_requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!request) return { error: "Change request not found" };

  const isAdmin = canApproveProperties(access.data.role);
  const isOwner = request.requested_by === access.data.userId;

  // Agents may cancel their own pending request; admins may dismiss pending
  // or changes_requested items from the Approvals queue.
  if (request.status === "pending") {
    if (!isOwner && !isAdmin) return { error: "Access denied" };
  } else if (request.status === "changes_requested") {
    if (!isAdmin) return { error: "Access denied" };
  } else {
    return { error: "Only pending or changes-requested items can be removed." };
  }

  const { data, error } = await supabase
    .from("property_change_requests")
    .update({
      status: "cancelled",
      reviewer_id: access.data.userId,
      reviewed_at: new Date().toISOString(),
      review_note:
        request.status === "changes_requested"
          ? request.review_note || "Dismissed from approvals"
          : "Cancelled",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as PropertyChangeRequest };
}

export async function getPendingChangeRequestForProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<PropertyChangeRequest | null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_change_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: (data as PropertyChangeRequest) ?? null };
}

export async function getPendingStatusChangeRequestForProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<PropertyStatusChangeRequest | null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }

  const supabase = await getServerSupabase();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, employee_id")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (propertyError) return { error: propertyError.message };
  if (!property) return { error: "Property not found" };

  const role = access.data.role;
  const isAssignedAgent =
    isSalesAgent(role) && property.employee_id === access.data.userId;
  if (
    !isAdministratorOrAbove(role) &&
    !isMasterAdmin(role) &&
    !isAssignedAgent
  ) {
    return { data: null };
  }

  const { data, error } = await supabase
    .from("property_status_change_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: (data as PropertyStatusChangeRequest) ?? null };
}

export type PropertyReviewFeedback = {
  kind: "listing" | "change_request";
  status: string;
  note: string;
  reviewed_at: string | null;
};

/**
 * Latest review feedback for the property page banner:
 * - listing reject / return-for-changes note on the property itself
 * - or the latest change-request decision of changes_requested / rejected
 *   (hidden once a later change request was approved)
 */
export async function getPropertyReviewFeedback(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<PropertyReviewFeedback | null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }

  const supabase = await getServerSupabase();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, employee_id, approval_status, approval_note, updated_at")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (propertyError) return { error: propertyError.message };
  if (!property) return { error: "Property not found" };

  const role = access.data.role;
  const isAssignedAgent =
    isSalesAgent(role) && property.employee_id === access.data.userId;
  const canSee =
    isAdministratorOrAbove(role) || isMasterAdmin(role) || isAssignedAgent;
  if (!canSee) return { data: null };

  const listingNote = property.approval_note?.trim() || null;
  if (
    listingNote &&
    (property.approval_status === "rejected" ||
      property.approval_status === "draft")
  ) {
    return {
      data: {
        kind: "listing",
        status: property.approval_status,
        note: listingNote,
        reviewed_at: property.updated_at ?? null,
      },
    };
  }

  const { data: latestFeedback, error: feedbackError } = await supabase
    .from("property_change_requests")
    .select("id, status, review_note, reviewed_at")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .in("status", ["changes_requested", "rejected"])
    .not("review_note", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (feedbackError) return { error: feedbackError.message };
  if (!latestFeedback?.review_note?.trim()) return { data: null };

  if (latestFeedback.reviewed_at) {
    const { data: laterApproved } = await supabase
      .from("property_change_requests")
      .select("id")
      .eq("company_id", companyId)
      .eq("property_id", propertyId)
      .eq("status", "approved")
      .gt("reviewed_at", latestFeedback.reviewed_at)
      .limit(1)
      .maybeSingle();
    if (laterApproved) return { data: null };
  }

  return {
    data: {
      kind: "change_request",
      status: latestFeedback.status,
      note: latestFeedback.review_note.trim(),
      reviewed_at: latestFeedback.reviewed_at,
    },
  };
}

/** Notify administrators about drafts not reviewed within a configured period.
 *  Dedupes: skips drafts that already have a stale-draft notification in the last 7 days.
 *  `staleDays` defaults to company `notification_settings.draft_stale_days` (or 3).
 */
export async function notifyStaleDraftProperties(
  companyId: string,
  staleDays?: number,
): Promise<ActionResult<{ notified: number }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canApproveProperties(access.data.role)) {
    return { error: "Access denied" };
  }

  const admin = getSupabaseAdmin();
  const { data: company } = await admin
    .from("companies")
    .select("notification_settings")
    .eq("id", companyId)
    .maybeSingle();
  const settings =
    (company?.notification_settings as Record<string, unknown> | null) ?? {};
  const configuredDays = Number(settings.draft_stale_days);
  const days =
    staleDays ??
    (Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 3);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const supabase = await getServerSupabase();
  const { data: drafts, error } = await supabase
    .from("properties")
    .select("id, code, title, title_ar, updated_at")
    .eq("company_id", companyId)
    .eq("approval_status", "draft")
    .lt("updated_at", cutoff.toISOString());

  if (error) return { error: error.message };
  if (!drafts?.length) return { data: { notified: 0 } };

  const dedupeSince = new Date();
  dedupeSince.setDate(dedupeSince.getDate() - 7);
  const { data: recent } = await admin
    .from("notifications")
    .select("entity_id")
    .eq("company_id", companyId)
    .eq("type", "property_draft_stale")
    .gte("created_at", dedupeSince.toISOString());

  const alreadyNotified = new Set(
    (recent ?? []).map((r) => r.entity_id).filter(Boolean),
  );

  let notified = 0;
  for (const draft of drafts) {
    if (alreadyNotified.has(draft.id)) continue;
    const result = await notifyCompanyAdministrators({
      companyId,
      type: "property_draft_stale",
      title: "Draft property awaiting review",
      body: `${formatNotifyPropertyLine(draft.code, draft.title, draft.title_ar)}\nLast updated: ${draft.updated_at}\nUnreviewed for ${days}+ days\nDate: ${formatNotificationDate()}`,
      link: `/company/properties/${draft.id}`,
      entityType: "property",
      entityId: draft.id,
    });
    if (!result.error) {
      notified += 1;
      alreadyNotified.add(draft.id);
    }
  }

  return { data: { notified } };
}

export async function lockClientRecord(
  clientId: string,
  companyId: string,
): Promise<ActionResult<{ id: string }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can lock records." };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update({ editing_locked: true })
    .eq("id", clientId)
    .eq("company_id", companyId)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { data: data as { id: string } };
}

export async function unlockClientRecord(
  clientId: string,
  companyId: string,
): Promise<ActionResult<{ id: string }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can unlock records." };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update({ editing_locked: false })
    .eq("id", clientId)
    .eq("company_id", companyId)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { data: data as { id: string } };
}

export async function lockOwnerRecord(
  ownerId: string,
  companyId: string,
): Promise<ActionResult<{ id: string }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can lock records." };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .update({ editing_locked: true })
    .eq("id", ownerId)
    .eq("company_id", companyId)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { data: data as { id: string } };
}

export async function unlockOwnerRecord(
  ownerId: string,
  companyId: string,
): Promise<ActionResult<{ id: string }>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isManager(access.data.role) && !isMasterAdmin(access.data.role)) {
    return { error: "Only managers can unlock records." };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .update({ editing_locked: false })
    .eq("id", ownerId)
    .eq("company_id", companyId)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { data: data as { id: string } };
}
