-- Storage RLS for the property-images bucket (created manually in the
-- dashboard). Public bucket already allows anonymous reads; these policies
-- gate uploads/updates/deletes to authenticated users only, matching the
-- company_super_admin-only create/update/delete rule on the properties table.

create policy "property_images_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-images');

create policy "property_images_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'property-images')
with check (bucket_id = 'property-images');

create policy "property_images_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-images');
