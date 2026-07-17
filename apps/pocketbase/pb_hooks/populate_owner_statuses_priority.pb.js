/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // This hook runs after a record is created
  // We'll use a migration-style approach to populate existing records
  e.next();
}, "owner_statuses");