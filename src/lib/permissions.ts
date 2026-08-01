import type { UserRole } from "@/types/supabase-entities.types";

export const COMPANY_ROLES = [
  "sales_agent",
  "administrator",
  "manager",
] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const OPERATIONAL_PROPERTY_STATUSES = [
  "Available",
  "Viewing Scheduled",
  "Under Offer",
  "Reserved",
  "Follow-up Required",
] as const;

export const FINAL_PROPERTY_STATUSES = [
  "Sold",
  "Rented",
  "Unavailable",
  "Archived",
  "Cancelled",
] as const;

/** Legacy values kept readable until fully migrated. */
const LEGACY_OPERATIONAL_STATUSES = ["Hold"] as const;
const LEGACY_FINAL_STATUSES = ["Deal Completed"] as const;

export const PROPERTY_STATUS_OPTIONS = [
  ...OPERATIONAL_PROPERTY_STATUSES,
  ...FINAL_PROPERTY_STATUSES,
] as const;

export function isOperationalPropertyStatus(status: string): boolean {
  return (
    (OPERATIONAL_PROPERTY_STATUSES as readonly string[]).includes(status) ||
    (LEGACY_OPERATIONAL_STATUSES as readonly string[]).includes(status)
  );
}

export function isFinalPropertyStatus(status: string): boolean {
  return (
    (FINAL_PROPERTY_STATUSES as readonly string[]).includes(status) ||
    (LEGACY_FINAL_STATUSES as readonly string[]).includes(status)
  );
}

export const PROPERTY_APPROVAL_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
] as const;

/** Review request statuses — exact PDF set for property change requests. */
export const CHANGE_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "cancelled",
] as const;

export type ChangeRequestStatusValue =
  (typeof CHANGE_REQUEST_STATUSES)[number];

/** Display labels matching the PDF: Pending / Approved / Rejected / Changes Requested / Cancelled. */
export const CHANGE_REQUEST_STATUS_LABELS: Record<
  ChangeRequestStatusValue,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
  cancelled: "Cancelled",
};

export function changeRequestStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return "—";
  if (status in CHANGE_REQUEST_STATUS_LABELS) {
    return CHANGE_REQUEST_STATUS_LABELS[status as ChangeRequestStatusValue];
  }
  return status;
}

export function isCompanyRole(
  role: string | null | undefined,
): role is CompanyRole {
  return (
    role === "sales_agent" ||
    role === "administrator" ||
    role === "manager"
  );
}

export function isManager(role: string | null | undefined): boolean {
  return role === "manager";
}

export function isAdministrator(role: string | null | undefined): boolean {
  return role === "administrator";
}

export function isSalesAgent(role: string | null | undefined): boolean {
  return role === "sales_agent";
}

export function isAdministratorOrAbove(
  role: string | null | undefined,
): boolean {
  return role === "administrator" || role === "manager";
}

export function isMasterAdmin(role: string | null | undefined): boolean {
  return role === "master_admin";
}

/** Revenue, Employees, Company Settings — Manager only. */
export function canAccessManagerModules(
  role: string | null | undefined,
): boolean {
  return isManager(role) || isMasterAdmin(role);
}

export function canViewRevenue(role: string | null | undefined): boolean {
  return canAccessManagerModules(role);
}

export function canManageEmployees(role: string | null | undefined): boolean {
  return canAccessManagerModules(role);
}

export function canViewCompanySettings(
  role: string | null | undefined,
): boolean {
  return canAccessManagerModules(role);
}

/** Clients by Source, Team Leaderboard, advanced dashboard insights. */
export function canViewInsights(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canViewAllClients(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canViewAllOwners(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canAssignRecords(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

/**
 * PDF: Sales Agents may transfer an owner to another employee.
 * Client reassignment stays Admin/Manager-only via `canAssignRecords`.
 */
export function canChangeOwnerAssignment(
  role: string | null | undefined,
): boolean {
  return (
    isSalesAgent(role) ||
    isAdministratorOrAbove(role) ||
    isMasterAdmin(role)
  );
}

/** PDF: export when needed — Manager only. */
export function canExportClientsOrOwners(
  role: string | null | undefined,
): boolean {
  return isManager(role) || isMasterAdmin(role);
}

export function canImportClientsOrOwners(
  role: string | null | undefined,
): boolean {
  return isManager(role) || isMasterAdmin(role);
}

export function canDeleteClientOrOwner(
  _role: string | null | undefined,
): boolean {
  return false;
}

/** Identity name/phone fields are locked after create for every role in company UI.
 *  Master Admin corrections happen only via the audited Identity Correction panel.
 */
export function canEditIdentityFields(
  _role: string | null | undefined,
): boolean {
  return false;
}

/** PDF: Sales Agent cannot view owner pipeline status. */
export function canViewOwnerStatus(
  role: string | null | undefined,
): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canApproveProperties(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canEditApprovedPropertyDirectly(
  role: string | null | undefined,
): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canClassifyProperty(role: string | null | undefined): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canApproveFinalStatus(
  role: string | null | undefined,
): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

export function canLockRecords(role: string | null | undefined): boolean {
  return isManager(role) || isMasterAdmin(role);
}

/** PDF: historical activity log is append-only for company roles. */
export function canEditActivityHistory(
  role: string | null | undefined,
): boolean {
  return isMasterAdmin(role);
}

/** PDF: publish / unpublish to portals — Admin/Manager. */
export function canPublishToPortals(
  role: string | null | undefined,
): boolean {
  return isAdministratorOrAbove(role) || isMasterAdmin(role);
}

/** PDF: reopen archived listings — Manager only. */
export function canReopenArchivedProperty(
  role: string | null | undefined,
): boolean {
  return isManager(role) || isMasterAdmin(role);
}

export function jobTitleForRole(role: CompanyRole): string {
  if (role === "manager") return "manager";
  if (role === "administrator") return "administrator";
  return "sales_agent";
}

export function roleFromJobTitle(
  jobTitle: string | null | undefined,
): CompanyRole {
  if (jobTitle === "manager") return "manager";
  if (jobTitle === "administrator") return "administrator";
  return "sales_agent";
}

export function companyRolesFilter(): UserRole[] {
  return [...COMPANY_ROLES];
}
