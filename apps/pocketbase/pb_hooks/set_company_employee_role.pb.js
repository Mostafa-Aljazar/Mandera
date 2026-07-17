/// <reference path="../pb_data/types.d.ts" />
onRecordCreate((e) => {
  // Set default role to 'company_employee' if not provided
  if (!e.record.get("role")) {
    e.record.set("role", "company_employee");
  }
  e.next();
}, "company_employees");