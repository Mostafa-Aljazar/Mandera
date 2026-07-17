/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // This hook runs after a record is created
  // We'll use it to ensure priority_order is set if not already provided
  if (!e.record.get("priority_order")) {
    // Find all records for this company, ordered by creation date
    const records = $app.findRecordsByFilter("client_statuses", "company_id = '" + e.record.get("company_id") + "'", { sort: "created" });
    
    // Assign priority_order based on position in sorted list
    let priority = 1;
    for (const record of records) {
      record.set("priority_order", priority);
      $app.save(record);
      priority++;
    }
  }
  e.next();
}, "client_statuses");