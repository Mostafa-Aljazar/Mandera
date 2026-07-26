-- The initial schema migration dropped `properties.area_district` (a
-- relation to areas_districts) by mistake -- the PocketBase original had it
-- (see apps/pocketbase/pb_migrations, expand: "type,employee_id,area_district,owner_id"
-- in apps/web/src/app/properties/page.tsx) and the properties page's area
-- filter/dropdown and PropertyCard's area-name display both depend on it.
alter table properties
  add column area_district uuid references areas_districts(id);
