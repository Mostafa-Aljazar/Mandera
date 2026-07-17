/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("company_super_admins");
  const record = new Record(collection);
  record.set("email", "admin@goldrealestate.com");
  record.setPassword("Admin@123456");
  record.set("name", "\u0645\u062f\u064a\u0631 \u0627\u0644\u0634\u0631\u0643\u0629");
  record.set("role", "company_super_admin");
  record.set("companyCode", "COMP001");
  const record_companyIdLookup = app.findFirstRecordByFilter("companies", "companyCode='COMP001'");
  if (!record_companyIdLookup) { throw new Error("Lookup failed for companyId: no record in 'companies' matching \"companyCode='COMP001'\""); }
  record.set("companyId", record_companyIdLookup.id);
  try {
    return app.save(record);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const record = app.findFirstRecordByData("company_super_admins", "email", "admin@goldrealestate.com");
    app.delete(record);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Auth record not found, skipping rollback");
      return;
    }
    throw e;
  }
})