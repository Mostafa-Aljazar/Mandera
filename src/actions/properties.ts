"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import {
  companyRolesFilter,
  canEditApprovedPropertyDirectly,
  canLockRecords,
  canViewRevenue,
  stripPropertyCommissionUnlessManager,
  isAdministratorOrAbove,
  isFinalPropertyStatus,
  isOperationalPropertyStatus,
  isSalesAgent,
} from "@/lib/permissions";
import {
  assertCompanyMember,
} from "@/actions/_access";
import {
  maskOwnerName,
  maskPhone,
} from "@/lib/identity";
import { notifyCompanyAdministrators, bilingualActorNotifyLabel } from "@/actions/notifications";
import {
  formatNotifyAgentLine,
  formatNotifyPropertyLine,
  formatNotifyTitleLine,
} from "@/lib/notificationCopy";
import type {
  Property,
  PropertyWithRelations,
} from "@/types/supabase-entities.types";
import {
  resolveRange,
  sanitizeSearchTerm,
  type PaginatedList,
} from "@/lib/listQuery";

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

function isInvestmentUnitProperty(
  property: Pick<PropertyWithRelations, "property_type">,
): boolean {
  const en = (property.property_type?.name_en || "").toLowerCase();
  const ar = property.property_type?.name_ar || "";
  return (
    en.includes("investment") ||
    ar.includes("استثمار") ||
    en.includes("invest")
  );
}

/**
 * PDF: detailed map/address fields only for Investment Units (agents).
 * Admin/Manager keep full address. Assigned agent's own listings also keep full address.
 */
function maskDetailedAddressForAgent(
  property: PropertyWithRelations,
  callerId: string,
): PropertyWithRelations {
  if (property.employee_id === callerId) return property;
  if (isInvestmentUnitProperty(property)) return property;
  return {
    ...property,
    city: null,
    locality: null,
    sub_locality: null,
    tower_name: null,
    pf_location_id: null,
  };
}

function maskPropertyOwner(
  property: PropertyWithRelations,
  callerId: string,
): PropertyWithRelations {
  let next = property;
  if (property.employee_id !== callerId) {
    const owner = property.owner;
    next = {
      ...property,
      owner_masked: true,
      note_en: null,
      note_ar: null,
      // PDF: hide owner docs/files for unassigned agents.
      document_urls: [],
      owner: owner
        ? {
            // Strip id so the client cannot navigate to /owners/:id.
            id: "",
            name: maskOwnerName(owner.name),
            name_en: owner.name_en ? maskOwnerName(owner.name_en) : null,
            name_ar: owner.name_ar ? maskOwnerName(owner.name_ar) : null,
            phone: maskPhone(owner.phone),
            email: null,
          }
        : owner,
    };
  } else {
    next = { ...property, owner_masked: false };
  }

  return maskDetailedAddressForAgent(next, callerId);
}

type OwnerContactRow = {
  id: string;
  name: string | null;
  name_en: string | null;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
};

/**
 * Owner RLS only lets sales agents read owners assigned to them, so the
 * properties→owners embed is often null for someone else's listing.
 * Re-attach owner via admin (after caller auth), then mask in app code (PDF).
 */
async function attachOwnersForSalesAgent(
  properties: PropertyWithRelations[],
): Promise<PropertyWithRelations[]> {
  const ownerIds = [
    ...new Set(
      properties
        .map((p) => p.owner_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ownerIds.length === 0) return properties;

  const admin = await getSupabaseAdmin();
  const { data, error } = await admin
    .from("owners")
    .select("id, name, name_en, name_ar, phone, email")
    .in("id", ownerIds);
  if (error) {
    console.warn("[properties] attachOwnersForSalesAgent:", error.message);
    return properties;
  }

  const byId = new Map(
    ((data ?? []) as OwnerContactRow[]).map((row) => [row.id, row]),
  );

  return properties.map((property) => {
    if (!property.owner_id) return property;
    const owner = byId.get(property.owner_id);
    if (!owner) return property;
    return {
      ...property,
      owner: {
        id: owner.id,
        name: owner.name,
        name_en: owner.name_en,
        name_ar: owner.name_ar,
        phone: owner.phone,
        email: owner.email,
      },
    };
  });
}

function stripCommissionIfNeeded<T extends { commission_percentage?: number | null }>(
  property: T,
  role: string | null | undefined,
): T {
  return stripPropertyCommissionUnlessManager(property, role);
}

function resolveWritablePropertyStatus(
  requested: string | null | undefined,
  role: string | null | undefined,
): string {
  const status = requested || "Available";
  if (!isSalesAgent(role)) return status;
  // Agents may only set operational statuses directly; finals go via status requests.
  if (isFinalPropertyStatus(status)) return "Available";
  if (isOperationalPropertyStatus(status)) return status;
  return "Available";
}

function canSalesAgentViewApproval(
  property: Pick<Property, "approval_status" | "employee_id">,
  callerId: string,
): boolean {
  if (property.approval_status === "approved") return true;
  return property.employee_id === callerId;
}

export interface PropertyFilters {
  employeeId?: string;
  status?: string;
  areaDistrictIds?: string[];
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  propertyTypeId?: string;
  classification?: string;
  ownerId?: string;
  /** Resolved via property_status_history's "Initial property creation" row — properties has no created_by column. */
  createdBy?: string;
  search?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Active inventory tabs: approved or legacy-null only. */
  approvedOnly?: boolean;
  /** Agent drafts strip: non-approved rows for a specific employee. */
  draftsForEmployeeId?: string;
  page?: number;
  pageSize?: number;
  includeCounts?: boolean;
}

export interface PropertyListCounts {
  total: number;
  rent: number;
  sale: number;
  available: number;
}

export type PropertiesListResult = PaginatedList<PropertyWithRelations> & {
  counts?: PropertyListCounts;
  drafts?: PropertyWithRelations[];
};

const PROPERTIES_SELECT = `
  *,
  property_type:property_types(id, name_en, name_ar),
  owner:owners(id, name, name_en, name_ar, phone, email),
  area_district_ref:areas_districts(id, name),
  employee:profiles!properties_employee_id_fkey(
    id,
    name,
    employee_record:employees!profiles_employee_id_fkey(
      phone,
      email,
      avatar_url,
      first_name_en,
      first_name_ar,
      last_name_en,
      last_name_ar
    )
  )
`;

export interface PropertyCodeOption {
  id: string;
  code: string;
}

/** Lightweight code->id lookup, used to link imported owners to their existing properties. */
export async function getPropertyCodesForCompany(
  companyId: string,
): Promise<ActionResult<PropertyCodeOption[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("id, code")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getProperties(
  companyId: string,
  filters: PropertyFilters = {},
): Promise<ActionResult<PropertyWithRelations[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  let query = supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.employeeId === "unassigned") {
    query = query.is("employee_id", null);
  } else if (filters.employeeId) {
    query = query.eq("employee_id", filters.employeeId);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.areaDistrictIds?.length) {
    query = query.in("area_district", filters.areaDistrictIds);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);
  if (filters.propertyTypeId) query = query.eq("type", filters.propertyTypeId);
  if (filters.classification) query = query.eq("classification", filters.classification);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);

  // `properties` has no created_by column — the creator is only recorded on the
  // "Initial property creation" row written to property_status_history at insert time.
  if (filters.createdBy) {
    const { data: creationRows, error: creationError } = await supabase
      .from("property_status_history")
      .select("property_id")
      .eq("company_id", companyId)
      .eq("note", "Initial property creation")
      .eq("created_by", filters.createdBy);
    if (creationError) return { error: creationError.message };

    const createdPropertyIds = (creationRows ?? []).map((r) => r.property_id);
    if (createdPropertyIds.length === 0) return { data: [] };
    query = query.in("id", createdPropertyIds);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  let properties = (data ?? []) as PropertyWithRelations[];

  if (isSalesAgent(access.data.role)) {
    const callerId = access.data.userId;
    properties = await attachOwnersForSalesAgent(properties);
    properties = properties
      .filter((p) => canSalesAgentViewApproval(p, callerId))
      .map((p) => maskPropertyOwner(p, callerId));
  }

  properties = properties.map((p) =>
    stripCommissionIfNeeded(p, access.data!.role),
  );

  return { data: properties };
}

/**
 * Paginated properties list for the Properties page.
 * Keeps getProperties() intact for dropdowns / employee detail / deal form.
 */
export async function getPropertiesPage(
  companyId: string,
  filters: PropertyFilters = {},
): Promise<ActionResult<PropertiesListResult>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : 9;
  const range = resolveRange(page, pageSize)!;
  const role = access.data.role;
  const callerId = access.data.userId;
  const agent = isSalesAgent(role);

  const supabase = await getServerSupabase();

  let createdPropertyIds: string[] | null = null;
  if (filters.createdBy) {
    const { data: creationRows, error: creationError } = await supabase
      .from("property_status_history")
      .select("property_id")
      .eq("company_id", companyId)
      .eq("note", "Initial property creation")
      .eq("created_by", filters.createdBy);
    if (creationError) return { error: creationError.message };
    createdPropertyIds = (creationRows ?? []).map((r) => r.property_id);
    if (createdPropertyIds.length === 0) {
      return {
        data: {
          items: [],
          total: 0,
          counts: filters.includeCounts
            ? { total: 0, rent: 0, sale: 0, available: 0 }
            : undefined,
          drafts: [],
        },
      };
    }
  }

  let query = supabase
    .from("properties")
    .select(PROPERTIES_SELECT, { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  query = applyPropertyFilters(query, filters, {
    agent,
    callerId,
    createdPropertyIds,
  });

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  let properties = (data ?? []) as PropertyWithRelations[];

  if (agent) {
    properties = await attachOwnersForSalesAgent(properties);
    properties = properties.map((p) => maskPropertyOwner(p, callerId));
  }

  properties = properties.map((p) => stripCommissionIfNeeded(p, role));

  const result: PropertiesListResult = {
    items: properties,
    total: count ?? 0,
  };

  if (filters.includeCounts) {
    const counts = await getPropertyListCounts(supabase, companyId, filters, {
      agent,
      callerId,
      createdPropertyIds,
    });
    if (counts.error) return { error: counts.error };
    result.counts = counts.data;
  }

  if (agent) {
    const drafts = await fetchAgentDrafts(supabase, companyId, callerId);
    if (drafts.error) return { error: drafts.error };
    let draftRows = drafts.data ?? [];
    draftRows = await attachOwnersForSalesAgent(draftRows);
    result.drafts = draftRows
      .map((p) => maskPropertyOwner(p, callerId))
      .map((p) => stripCommissionIfNeeded(p, role));
  }

  return { data: result };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPropertyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: PropertyFilters,
  ctx: {
    agent: boolean;
    callerId: string;
    createdPropertyIds: string[] | null;
  },
) {
  if (filters.employeeId === "unassigned") {
    query = query.is("employee_id", null);
  } else if (filters.employeeId) {
    query = query.eq("employee_id", filters.employeeId);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.areaDistrictIds?.length) {
    query = query.in("area_district", filters.areaDistrictIds);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);
  if (filters.propertyTypeId) query = query.eq("type", filters.propertyTypeId);
  if (filters.classification) {
    query = query.eq("classification", filters.classification);
  }
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.listingType) query = query.eq("listing_type", filters.listingType);
  if (typeof filters.minPrice === "number" && filters.minPrice > 0) {
    query = query.gte("price", filters.minPrice);
  }
  if (typeof filters.maxPrice === "number" && filters.maxPrice > 0) {
    query = query.lte("price", filters.maxPrice);
  }
  if (ctx.createdPropertyIds) {
    query = query.in("id", ctx.createdPropertyIds);
  }

  // Active inventory: hide drafts/pending/rejected.
  if (filters.approvedOnly) {
    query = query.or("approval_status.eq.approved,approval_status.is.null");
  }

  // Sales agents: approved inventory for everyone + own non-approved drafts.
  // When approvedOnly is set (main tabs), drafts are excluded above — correct.
  if (ctx.agent && !filters.approvedOnly && !filters.draftsForEmployeeId) {
    query = query.or(
      `approval_status.eq.approved,approval_status.is.null,employee_id.eq.${ctx.callerId}`,
    );
  }

  if (filters.draftsForEmployeeId) {
    query = query
      .eq("employee_id", filters.draftsForEmployeeId)
      .not("approval_status", "is", null)
      .neq("approval_status", "approved");
  }

  const search = filters.search ? sanitizeSearchTerm(filters.search) : "";
  if (search) {
    query = query.or(
      [
        `code.ilike.%${search}%`,
        `title.ilike.%${search}%`,
        `title_ar.ilike.%${search}%`,
        `note_en.ilike.%${search}%`,
        `note_ar.ilike.%${search}%`,
      ].join(","),
    );
  }

  return query;
}

async function getPropertyListCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  filters: PropertyFilters,
  ctx: {
    agent: boolean;
    callerId: string;
    createdPropertyIds: string[] | null;
  },
): Promise<ActionResult<PropertyListCounts>> {
  const base: PropertyFilters = {
    ...filters,
    listingType: undefined,
    page: undefined,
    pageSize: undefined,
    includeCounts: undefined,
    approvedOnly: true,
  };

  const headCount = async (extra?: Partial<PropertyFilters>) => {
    let q = supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    q = applyPropertyFilters(q, { ...base, ...extra }, ctx);
    const { count, error } = await q;
    if (error) return { error: error.message as string };
    return { data: count ?? 0 };
  };

  const [total, rent, sale, available] = await Promise.all([
    headCount(),
    headCount({ listingType: "Rent" }),
    headCount({ listingType: "Sale" }),
    headCount({ status: "Available" }),
  ]);

  if (total.error) return { error: total.error };
  if (rent.error) return { error: rent.error };
  if (sale.error) return { error: sale.error };
  if (available.error) return { error: available.error };

  return {
    data: {
      total: total.data ?? 0,
      rent: rent.data ?? 0,
      sale: sale.data ?? 0,
      available: available.data ?? 0,
    },
  };
}

async function fetchAgentDrafts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  employeeId: string,
): Promise<ActionResult<PropertyWithRelations[]>> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .not("approval_status", "is", null)
    .neq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) return { error: error.message };
  return { data: (data ?? []) as PropertyWithRelations[] };
}

export async function getProperty(
  id: string,
): Promise<ActionResult<PropertyWithRelations>> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("id", id)
    .single();

  if (error) return { error: error.message };

  const property = data as PropertyWithRelations;
  const access = await assertCompanyMember(property.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  if (isSalesAgent(access.data.role)) {
    const callerId = access.data.userId;
    if (!canSalesAgentViewApproval(property, callerId)) {
      return { error: "Access denied" };
    }
    const [withOwner] = await attachOwnersForSalesAgent([property]);
    return {
      data: stripCommissionIfNeeded(
        maskPropertyOwner(withOwner, callerId),
        access.data.role,
      ),
    };
  }

  return { data: stripCommissionIfNeeded(property, access.data.role) };
}

export async function getPropertiesForOwner(
  ownerId: string,
): Promise<ActionResult<Property[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", ownerId);
  if (error) return { error: error.message };

  const rows = (data ?? []) as Property[];
  if (rows.length === 0) return { data: [] };

  const companyId = rows[0].company_id;
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  if (isSalesAgent(access.data.role)) {
    const callerId = access.data.userId;
    return {
      data: rows
        .filter((p) => canSalesAgentViewApproval(p, callerId))
        .map((p) => stripCommissionIfNeeded(p, access.data!.role)),
    };
  }

  return {
    data: rows.map((p) => stripCommissionIfNeeded(p, access.data!.role)),
  };
}

// --- Read-only lookups the Properties page's form dropdowns need. Full CRUD
// for these entities lives in their own modules (Settings, Owners,
// Employees) once each is migrated — these are intentionally minimal.

export async function getPropertyTypesForCompany(companyId: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .select("id, name_en, name_ar, company_id, created_at, updated_at")
    .eq("company_id", companyId)
    .order("name_en", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getOwnersForCompany(companyId: string) {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  let query = supabase
    .from("owners")
    .select(
      "id, name, name_en, name_ar, phone, country, avatar_url, company_id, marketing_channel, assigned_employee_id, created_at, updated_at",
    )
    .eq("company_id", companyId);

  // Agents only pick from owners assigned to them (Phase 3/4).
  if (isSalesAgent(access.data.role)) {
    query = query.eq("assigned_employee_id", access.data.userId);
  }

  const { data, error } = await query.order("name_en", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getCompanyEmployeesForCompany(companyId: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = getSupabaseAdmin();
  const { data: me } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (
    !me ||
    (me.role !== "master_admin" && me.company_id !== companyId)
  ) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, role, company_id, employee_id, name, employee:employees!profiles_employee_id_fkey(avatar_url, first_name_en, first_name_ar, last_name_en, last_name_ar)",
    )
    .eq("company_id", companyId)
    .in("role", companyRolesFilter());
  if (error) return { error: error.message };

  type EmpJoin = {
    avatar_url?: string | null;
    first_name_en?: string | null;
    first_name_ar?: string | null;
    last_name_en?: string | null;
    last_name_ar?: string | null;
  } | null;

  const rows = (data ?? []).map((row) => {
    const employee = row.employee as EmpJoin;
    return {
      id: row.id,
      role: row.role,
      company_id: row.company_id,
      employee_id: row.employee_id,
      name: row.name,
      avatar_url: employee?.avatar_url ?? null,
      first_name_en: employee?.first_name_en ?? null,
      first_name_ar: employee?.first_name_ar ?? null,
      last_name_en: employee?.last_name_en ?? null,
      last_name_ar: employee?.last_name_ar ?? null,
    };
  });

  return { data: rows };
}

export async function getAreasDistrictsForCompany(companyId: string, emirate?: string) {
  const supabase = await getServerSupabase();
  let query = supabase
    .from("areas_districts")
    .select("id, name, emirate, description, company_id, created_at, updated_at")
    .eq("company_id", companyId)
    .order("name");
  if (emirate) query = query.eq("emirate", emirate);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export interface CompanyDashboardCounts {
  propertiesRent: number;
  propertiesSale: number;
  clients: number;
  owners: number;
  employees: number;
}

export async function getCompanyOperationsStats(
  companyId: string,
): Promise<ActionResult<CompanyDashboardCounts>> {
  const supabase = await getServerSupabase();

  const [propRent, propSale, clients, owners, employees] = await Promise.all([
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("listing_type", "Rent"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("listing_type", "Sale"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("owners")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("role", companyRolesFilter()),
  ]);

  const firstError =
    propRent.error || propSale.error || clients.error || owners.error || employees.error;
  if (firstError) return { error: firstError.message };

  return {
    data: {
      propertiesRent: propRent.count ?? 0,
      propertiesSale: propSale.count ?? 0,
      clients: clients.count ?? 0,
      owners: owners.count ?? 0,
      employees: employees.count ?? 0,
    },
  };
}

async function uploadPropertyImages(
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

/** Floor plan images (Bayut's <Floor_Plans>) reuse the same public bucket, under its own prefix. */
async function uploadPropertyFloorPlans(
  companyId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = await getServerSupabase();
  const urls: string[] = [];

  for (const file of files) {
    const path = `${companyId}/floor-plans/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("property-images")
      .upload(path, file, { contentType: file.type });

    if (error) throw new Error(`Floor plan upload failed: ${error.message}`);

    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

// --- Direct-to-storage uploads --------------------------------------------
//
// Posting the image files themselves through a Server Action caps a property
// at whatever the platform allows in one request body (4.5 MB on Vercel), and
// blew up as a bare 413 once agents started attaching phone photos. Instead the
// browser asks for a short-lived signed URL per file and PUTs straight to
// Supabase Storage, so the bytes never traverse our server at all. The
// per-file ceiling becomes the bucket's own 20 MB and the number of files stops
// mattering.
//
// The browser still holds no Supabase client — a signed URL is an ordinary
// `fetch` target — so the "only src/actions talks to Supabase" rule holds.

/** Mirrors the property-images bucket allowlist, minus GIF: the bucket accepts
 *  it, but PropertyFinder only takes JPEG/PNG/WebP, and every image here is
 *  portal-bound. */
const PROPERTY_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The bucket's own per-file limit (20 MB); rejecting here just gives a better
 *  message than storage's raw error. */
const PROPERTY_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/** Guards against a malformed client flooding storage with signed URLs. */
const MAX_UPLOAD_TICKETS = 32;

export interface PropertyUploadRequest {
  name: string;
  type: string;
  size: number;
  kind: "image" | "floor_plan";
}

export interface PropertyUploadTicket {
  /** Short-lived URL the browser PUTs the file to. */
  signedUrl: string;
  /** Public URL to persist on the property once the upload succeeds. */
  publicUrl: string;
  path: string;
}

/** Strip anything that could climb out of the company's folder. */
function safeFileName(name: string): string {
  return (
    name
      .replace(/[/\\]/g, "-")
      .replace(/[^\w.\-؀-ۿ]/g, "_")
      .slice(-120) || "file"
  );
}

/**
 * Issue one signed upload URL per file, after checking the caller may write to
 * this company. Returns the public URL alongside so the caller can persist it
 * without a second round trip.
 */
export async function createPropertyUploadTickets(
  companyId: string,
  files: PropertyUploadRequest[],
): Promise<ActionResult<PropertyUploadTicket[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  if (files.length === 0) return { data: [] };
  if (files.length > MAX_UPLOAD_TICKETS) {
    return { error: `Too many files in one request (max ${MAX_UPLOAD_TICKETS}).` };
  }

  for (const file of files) {
    if (!PROPERTY_IMAGE_MIME_TYPES.includes(file.type)) {
      return {
        error: `"${file.name}" is not a supported image type. Use JPG, PNG or WebP.`,
      };
    }
    if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
      return {
        error: `"${file.name}" is larger than ${PROPERTY_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`,
      };
    }
  }

  const supabase = await getServerSupabase();
  const tickets: PropertyUploadTicket[] = [];

  for (const file of files) {
    const prefix = file.kind === "floor_plan" ? `${companyId}/floor-plans` : companyId;
    const path = `${prefix}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { data, error } = await supabase.storage
      .from("property-images")
      .createSignedUploadUrl(path);
    if (error) return { error: `Could not start upload: ${error.message}` };

    const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
    tickets.push({ signedUrl: data.signedUrl, publicUrl: pub.publicUrl, path });
  }

  return { data: tickets };
}

/**
 * Remove files uploaded for a property save that then failed — without this,
 * an abandoned or rejected submit leaves orphans in the bucket. Best-effort:
 * the caller is already handling an error and must not be handed a second one.
 */
export async function discardPropertyUploads(
  companyId: string,
  paths: string[],
): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  // Never let a caller delete outside its own company's prefix.
  const owned = paths.filter((p) => p.startsWith(`${companyId}/`));
  if (owned.length === 0) return { data: null };

  const supabase = await getServerSupabase();
  await supabase.storage.from("property-images").remove(owned);
  return { data: null };
}

async function generatePropertyCode(
  companyId: string,
  companyCode: string,
  listingType: string,
): Promise<string> {
  const supabase = await getServerSupabase();
  const typePrefix = listingType === "Sale" ? "S" : "R";
  const prefix = `${companyCode}-${typePrefix}-`;

  const { data, error } = await supabase
    .from("properties")
    .select("code")
    .eq("company_id", companyId)
    .like("code", `${prefix}%`)
    .order("code", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return `${prefix}0001`;

  const lastNum = parseInt(data[0].code.split("-").pop() || "0", 10);
  return `${prefix}${(lastNum + 1).toString().padStart(4, "0")}`;
}

/** Portal/publishing listing fields shared by create & update. */
export interface PropertyPortalFields {
  title_ar?: string | null;
  description_ar?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  furnishing?: string | null;
  size_unit?: string | null;
  rent_frequency?: string | null;
  is_off_plan?: boolean | null;
  project_status?: string | null;
  amenities?: string[] | null;
  permit_type?: string | null;
  issuing_license_number?: string | null;
  city?: string | null;
  locality?: string | null;
  sub_locality?: string | null;
  tower_name?: string | null;
  pf_location_id?: number | null;
  offplan_sale_type?: string | null;
  offplan_dld_waiver?: number | null;
  offplan_original_price?: number | null;
  offplan_amount_paid?: number | null;
  available_from?: string | null;
  parking_slots?: number | null;
  video_urls?: string[] | null;
}

/** Build the DB column subset for the portal fields, skipping `undefined`. */
function portalColumns(input: PropertyPortalFields): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  const assign = <K extends keyof PropertyPortalFields>(key: K) => {
    if (input[key] !== undefined) cols[key as string] = input[key];
  };
  assign("title_ar");
  assign("description_ar");
  assign("bedrooms");
  assign("bathrooms");
  assign("furnishing");
  assign("size_unit");
  assign("rent_frequency");
  assign("is_off_plan");
  assign("project_status");
  assign("amenities");
  assign("permit_type");
  assign("issuing_license_number");
  assign("city");
  assign("locality");
  assign("sub_locality");
  assign("tower_name");
  assign("pf_location_id");
  assign("offplan_sale_type");
  assign("offplan_dld_waiver");
  assign("offplan_original_price");
  assign("offplan_amount_paid");
  assign("available_from");
  assign("parking_slots");
  assign("video_urls");
  return cols;
}

export interface CreatePropertyInput extends PropertyPortalFields {
  companyId: string;
  companyCode: string;
  createdByUserId: string;
  createdByName: string;
  listing_type: string;
  type: string;
  land_area?: number | null;
  building_area?: number | null;
  emirate: string;
  area_district?: string | null;
  area?: string | null;
  owner_id: string;
  price: number;
  commission_percentage?: number | null;
  employee_id: string;
  title: string;
  description?: string | null;
  note_en?: string | null;
  note_ar?: string | null;
  status?: string | null;
  advertising_permit_number?: string | null;
  /** Agents may only create as draft (PDF matrix). Submit for review is a separate action. */
  approval_status?: "draft" | "pending_review" | "approved" | "rejected";
  /** Public URLs of files the browser already uploaded via a signed URL —
   *  the normal path. `images`/`floor_plans` remain for callers that still
   *  hand over the files themselves, subject to the request body limit. */
  image_urls?: string[];
  floor_plan_urls?: string[];
  images?: File[];
  floor_plans?: File[];
}

export async function createProperty(
  input: CreatePropertyInput,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const isAgent = isSalesAgent(access.data.role);
  const requested = input.approval_status;
  // PDF final matrix: Sales Agent "إضافة عقار" = Draft only.
  const approvalStatus = isAgent
    ? "draft"
    : requested === "draft" ||
        requested === "pending_review" ||
        requested === "approved"
      ? requested
      : "approved";
  const employeeId = isAgent ? access.data.userId : input.employee_id;
  const propertyStatus = resolveWritablePropertyStatus(
    input.status,
    access.data.role,
  );

  try {
    const code = await generatePropertyCode(
      input.companyId,
      input.companyCode,
      input.listing_type,
    );
    const imageUrls = [
      ...(input.image_urls ?? []),
      ...(await uploadPropertyImages(input.companyId, input.images ?? [])),
    ];
    const floorPlanUrls = [
      ...(input.floor_plan_urls ?? []),
      ...(await uploadPropertyFloorPlans(input.companyId, input.floor_plans ?? [])),
    ];

    const { data, error } = await supabase
      .from("properties")
      .insert({
        code,
        company_id: input.companyId,
        listing_type: input.listing_type,
        type: input.type,
        land_area: input.land_area ?? null,
        building_area: input.building_area ?? null,
        emirate: input.emirate,
        area_district: input.area_district || null,
        area: input.area || "",
        owner_id: input.owner_id,
        price: input.price,
        commission_percentage: canViewRevenue(access.data.role)
          ? (input.commission_percentage ?? null)
          : null,
        employee_id: employeeId,
        title: input.title,
        description: input.description || "",
        note_en: input.note_en || "",
        note_ar: input.note_ar || "",
        images: imageUrls,
        floor_plan_urls: floorPlanUrls,
        status: propertyStatus,
        advertising_permit_number: input.advertising_permit_number || "",
        approval_status: approvalStatus,
        ...portalColumns(input),
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase.from("property_status_history").insert({
      property_id: data.id,
      status: propertyStatus,
      note: "Initial property creation",
      created_by: input.createdByUserId,
      created_by_name: input.createdByName,
      company_id: input.companyId,
    });

    if (isAgent) {
      const agentLabel = await bilingualActorNotifyLabel(
        access.data.userId,
        input.createdByName,
      );
      const agentLine = formatNotifyAgentLine(null, null, agentLabel);
      await notifyCompanyAdministrators({
        companyId: input.companyId,
        type: "property_created",
        title: "New Property Added",
        body: `${formatNotifyPropertyLine(data.code, data.title, data.title_ar)}${agentLine ? `\n${agentLine}` : ""}\nStatus: Draft\nDate: ${formatNotificationDate()}`,
        link: `/company/properties/${data.id}`,
        entityType: "property",
        entityId: data.id,
      });
    }

    return {
      data: stripCommissionIfNeeded(data as Property, access.data.role),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export interface UpdatePropertyInput extends PropertyPortalFields {
  id: string;
  companyId: string;
  listing_type: string;
  type: string;
  land_area?: number | null;
  building_area?: number | null;
  emirate: string;
  area_district?: string | null;
  area?: string | null;
  owner_id: string;
  price: number;
  commission_percentage?: number | null;
  employee_id: string;
  title: string;
  description?: string | null;
  note_en?: string | null;
  note_ar?: string | null;
  status?: string | null;
  advertising_permit_number?: string | null;
  /** Public URLs of newly added files already uploaded via a signed URL. */
  image_urls?: string[];
  floor_plan_urls?: string[];
  images?: File[];
  /** Remaining existing image URLs after client-side removals. */
  keepImages?: string[];
  floor_plans?: File[];
  /** Remaining existing floor-plan URLs after client-side removals. */
  keepFloorPlans?: string[];
}

export async function updateProperty(
  input: UpdatePropertyInput,
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("properties")
      .select("employee_id, images, floor_plan_urls, approval_status, is_locked, company_id, commission_percentage")
      .eq("id", input.id)
      .eq("company_id", input.companyId)
      .single();

    if (fetchError) return { error: fetchError.message };

    if (existing.is_locked && !canLockRecords(access.data.role)) {
      return { error: "This property is locked and cannot be edited." };
    }

    if (isSalesAgent(access.data.role)) {
      if (existing.employee_id !== access.data.userId) {
        return { error: "Access denied" };
      }
      if (existing.approval_status === "approved") {
        return {
          error:
            "Approved properties cannot be edited directly. Submit a change request instead (createPropertyChangeRequest).",
        };
      }
      if (existing.approval_status === "pending_review") {
        return {
          error:
            "This property is pending review and cannot be edited until a decision is made.",
        };
      }
      if (
        existing.approval_status !== "draft" &&
        existing.approval_status !== "rejected"
      ) {
        return { error: "Access denied" };
      }
    } else if (!canEditApprovedPropertyDirectly(access.data.role)) {
      return { error: "Access denied" };
    }

    const newImageUrls = [
      ...(input.image_urls ?? []),
      ...(await uploadPropertyImages(input.companyId, input.images ?? [])),
    ];
    const keptImages = input.keepImages ?? ((existing.images as string[] | null) ?? []);
    const images = [...keptImages, ...newImageUrls];

    const newFloorPlanUrls = [
      ...(input.floor_plan_urls ?? []),
      ...(await uploadPropertyFloorPlans(input.companyId, input.floor_plans ?? [])),
    ];
    const keptFloorPlans =
      input.keepFloorPlans ?? ((existing.floor_plan_urls as string[] | null) ?? []);
    const floorPlanUrls = [...keptFloorPlans, ...newFloorPlanUrls];

    const employeeId = isSalesAgent(access.data.role)
      ? existing.employee_id
      : input.employee_id;

    const propertyStatus = resolveWritablePropertyStatus(
      input.status,
      access.data.role,
    );

    const { data, error } = await supabase
      .from("properties")
      .update({
        listing_type: input.listing_type,
        type: input.type,
        land_area: input.land_area ?? null,
        building_area: input.building_area ?? null,
        emirate: input.emirate,
        area_district: input.area_district || null,
        area: input.area || "",
        owner_id: input.owner_id,
        price: input.price,
        commission_percentage: canViewRevenue(access.data.role)
          ? (input.commission_percentage ?? null)
          : existing.commission_percentage,
        employee_id: employeeId,
        title: input.title,
        description: input.description || "",
        note_en: input.note_en || "",
        note_ar: input.note_ar || "",
        images,
        floor_plan_urls: floorPlanUrls,
        status: propertyStatus,
        advertising_permit_number: input.advertising_permit_number || "",
        ...portalColumns(input),
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) return { error: error.message };

    // TODO: send assignment-change notification email if employee_id changed
    // (deferred per user decision — see project_supabase_migration memory).
    if (existing.employee_id !== employeeId) {
      // Intentionally not implemented yet.
    }

    // Administrator notifications: Agent edits property data / adds photos / removes photos.
    if (isSalesAgent(access.data.role)) {
      const prop = data as Property;
      const propLine = formatNotifyPropertyLine(prop.code, prop.title, prop.title_ar);
      const dateLine = `Date: ${formatNotificationDate()}`;
      const link = `/company/properties/${input.id}`;
      const existingImages = (existing.images as string[] | null) ?? [];
      const removedImageCount = Math.max(
        0,
        existingImages.length - keptImages.length,
      );

      await notifyCompanyAdministrators({
        companyId: input.companyId,
        type: "property_change_request",
        title: "Property Data Edited",
        body: `${propLine}\nStatus: ${existing.approval_status}\n${dateLine}`,
        link,
        entityType: "property",
        entityId: input.id,
      });

      if (newImageUrls.length > 0) {
        await notifyCompanyAdministrators({
          companyId: input.companyId,
          type: "property_images_added",
          title: "Property Images Added",
          body: `${propLine}\nImages added: ${newImageUrls.length}\n${dateLine}`,
          link,
          entityType: "property",
          entityId: input.id,
        });
      }

      if (removedImageCount > 0) {
        await notifyCompanyAdministrators({
          companyId: input.companyId,
          type: "property_images_removal_request",
          title: "Property Image Deletion Requested",
          body: `${propLine}\nImages removed: ${removedImageCount}\n${dateLine}`,
          link,
          entityType: "property",
          entityId: input.id,
        });
      }
    }

    return {
      data: stripCommissionIfNeeded(data as Property, access.data.role),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function uploadPropertyDocuments(
  companyId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = await getServerSupabase();
  const urls: string[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_");
    const path = `${companyId}/documents/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("property-images")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });

    if (error) throw new Error(`Document upload failed: ${error.message}`);

    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

/** Admin/Manager: replace document_urls (keep existing + upload new files). */
export async function updatePropertyDocuments(
  propertyId: string,
  companyId: string,
  keepUrls: string[],
  newFiles: File[] = [],
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canEditApprovedPropertyDirectly(access.data.role)) {
    return { error: "Only administrators and managers can manage property documents." };
  }

  const supabase = await getServerSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("properties")
    .select("id, is_locked, document_urls")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Property not found" };

  if (existing.is_locked && !canLockRecords(access.data.role)) {
    return { error: "This property is locked and cannot be edited." };
  }

  try {
    const uploaded = await uploadPropertyDocuments(companyId, newFiles);
    const documentUrls = [...keepUrls, ...uploaded];
    const { data, error } = await supabase
      .from("properties")
      .update({ document_urls: documentUrls })
      .eq("id", propertyId)
      .eq("company_id", companyId)
      .select()
      .single();
    if (error) return { error: error.message };
    return {
      data: stripCommissionIfNeeded(data as Property, access.data.role),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteProperty(id: string): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("properties")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Property not found" };

  const access = await assertCompanyMember(existing.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isAdministratorOrAbove(access.data.role) && access.data.role !== "master_admin") {
    return { error: "Only administrators or managers can delete properties." };
  }

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function updatePropertyStatus(
  propertyId: string,
  companyId: string,
  newStatus: string,
  createdByUserId: string,
  createdByName: string,
  note = "Quick status update from list view",
): Promise<ActionResult<Property>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("company_id", companyId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Property not found" };

  if (existing.is_locked && !canLockRecords(access.data.role)) {
    return { error: "This property is locked and cannot be edited." };
  }

  const previousStatus = existing.status || "Available";
  const isAgent = isSalesAgent(access.data.role);
  const isAdminPlus =
    isAdministratorOrAbove(access.data.role) || access.data.role === "master_admin";

  if (isAgent && existing.employee_id !== access.data.userId) {
    return { error: "Access denied" };
  }

  // Final statuses: sales agents must create a change request; admin+ apply directly.
  if (isFinalPropertyStatus(newStatus) && isAgent) {
    const { data: request, error: reqError } = await supabase
      .from("property_status_change_requests")
      .insert({
        company_id: companyId,
        property_id: propertyId,
        requested_by: access.data.userId,
        previous_status: previousStatus,
        new_status: newStatus,
        status: "pending",
      })
      .select()
      .single();

    if (reqError) return { error: reqError.message };

    await notifyCompanyAdministrators({
      companyId,
      type: "property_status_change_request",
      title: "Property Status Change Requested",
      body: [
        formatNotifyPropertyLine(existing.code, existing.title, existing.title_ar),
        formatNotifyTitleLine(existing.title, existing.title_ar),
        formatNotifyAgentLine(
          null,
          null,
          await bilingualActorNotifyLabel(createdByUserId, createdByName),
        ),
        `Previous Status: ${previousStatus}`,
        `New Status: ${newStatus}`,
        `Date: ${formatNotificationDate()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      link: `/company/properties/${propertyId}`,
      entityType: "property_status_change_request",
      entityId: request.id,
    });

    return {
      data: stripCommissionIfNeeded(existing as Property, access.data.role),
    };
  }

  if (!isAdminPlus && !isOperationalPropertyStatus(newStatus) && !isFinalPropertyStatus(newStatus)) {
    return { error: `Unknown property status: ${newStatus}` };
  }

  const { data, error } = await supabase
    .from("properties")
    .update({ status: newStatus })
    .eq("id", propertyId)
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("property_status_history").insert({
    property_id: propertyId,
    status: newStatus,
    note,
    created_by: createdByUserId,
    created_by_name: createdByName,
    company_id: companyId,
  });

  // Agent operational status changes notify administrators (PDF format).
  if (isAgent) {
    await notifyCompanyAdministrators({
      companyId,
      type: "property_status_changed",
      title: "Property Status Changed",
      body: [
        formatNotifyPropertyLine(data.code, data.title, data.title_ar),
        formatNotifyTitleLine(data.title, data.title_ar),
        formatNotifyAgentLine(
          null,
          null,
          await bilingualActorNotifyLabel(createdByUserId, createdByName),
        ),
        `Previous Status: ${previousStatus}`,
        `New Status: ${newStatus}`,
        `Date: ${formatNotificationDate()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      link: `/company/properties/${propertyId}`,
      entityType: "property",
      entityId: propertyId,
    });
  }

  return {
    data: stripCommissionIfNeeded(data as Property, access.data.role),
  };
}
