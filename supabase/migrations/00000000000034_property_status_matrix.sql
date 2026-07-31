-- Phase 5: remap legacy property statuses to the PDF matrix.
-- Hold → Follow-up Required
-- Deal Completed → Sold (Sale) / Rented (Rent) / Sold (fallback)

update properties
set status = 'Follow-up Required'
where status = 'Hold';

update properties
set status = 'Rented'
where status = 'Deal Completed'
  and listing_type = 'Rent';

update properties
set status = 'Sold'
where status = 'Deal Completed';

update property_status_history
set status = 'Follow-up Required'
where status = 'Hold';

update property_status_history
set status = 'Sold'
where status = 'Deal Completed';
