"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Property,
  PropertyWithRelations,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface PropertyFilters {
  employeeId?: string;
  status?: string;
  areaDistrictIds?: string[];
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

const PROPERTIES_SELECT = `
  *,
  property_type:property_types(id, name),
  owner:owners(id, name, phone),
  area_district_ref:areas_districts(id, name),
  employee:profiles!properties_employee_id_fkey(id, name, employee_record:employees!profiles_employee_id_fkey(phone, email))
`;

export async function getProperties(
  companyId: string,
  filters: PropertyFilters = {},
): Promise<ActionResult<PropertyWithRelations[]>> {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.areaDistrictIds?.length) {
    query = query.in("area_district", filters.areaDistrictIds);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);

  const { data, error } = await query;

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
  return { data: data as PropertyWithRelations };
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
  return { data: data ?? [] };
}

// --- Read-only lookups the Properties page's form dropdowns need. Full CRUD
// for these entities lives in their own modules (Settings, Owners,
// Employees) once each is migrated — these are intentionally minimal.

export async function getPropertyTypesForCompany(companyId: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .select("id, name, company_id, created_at, updated_at")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getOwnersForCompany(companyId: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .select("id, name, phone, country, company_id, marketing_channel, assigned_employee_id, created_at, updated_at")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getCompanyEmployeesForCompany(companyId: string) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, company_id, employee_id, name")
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"]);
  if (error) return { error: error.message };
  return { data: data ?? [] };
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
      .in("role", ["company_super_admin", "company_employee"]),
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

export interface CreatePropertyInput {
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
  status?: string | null;
  advertising_permit_number?: string | null;
  images?: File[];
}

export async function createProperty(
  input: CreatePropertyInput,
): Promise<ActionResult<Property>> {
  const supabase = await getServerSupabase();

  try {
    const code = await generatePropertyCode(
      input.companyId,
      input.companyCode,
      input.listing_type,
    );
    const imageUrls = await uploadPropertyImages(input.companyId, input.images ?? []);

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
        commission_percentage: input.commission_percentage ?? null,
        employee_id: input.employee_id,
        title: input.title,
        description: input.description || "",
        images: imageUrls,
        status: input.status || "Available",
        advertising_permit_number: input.advertising_permit_number || "",
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase.from("property_status_history").insert({
      property_id: data.id,
      status: input.status || "Available",
      note: "Initial property creation",
      created_by: input.createdByUserId,
      created_by_name: input.createdByName,
      company_id: input.companyId,
    });

    return { data: data as Property };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export interface UpdatePropertyInput {
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
  status?: string | null;
  advertising_permit_number?: string | null;
  images?: File[];
}

export async function updateProperty(
  input: UpdatePropertyInput,
): Promise<ActionResult<Property>> {
  const supabase = await getServerSupabase();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("properties")
      .select("employee_id, images")
      .eq("id", input.id)
      .single();

    if (fetchError) return { error: fetchError.message };

    const newImageUrls = await uploadPropertyImages(input.companyId, input.images ?? []);
    const images = newImageUrls.length > 0 ? newImageUrls : existing.images;

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
        commission_percentage: input.commission_percentage ?? null,
        employee_id: input.employee_id,
        title: input.title,
        description: input.description || "",
        images,
        status: input.status || "Available",
        advertising_permit_number: input.advertising_permit_number || "",
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) return { error: error.message };

    // TODO: send assignment-change notification email if employee_id changed
    // (deferred per user decision — see project_supabase_migration memory).
    if (existing.employee_id !== input.employee_id) {
      // Intentionally not implemented yet.
    }

    return { data: data as Property };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteProperty(id: string): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
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
  const supabase = await getServerSupabase();

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

  return { data: data as Property };
}
