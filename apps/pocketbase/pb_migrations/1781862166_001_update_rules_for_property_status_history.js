/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("property_status_history");
  collection.createRule = "@request.auth.companyId = company_id && (@request.auth.role = 'company_super_admin' || @request.auth.id = property_id.employee_id)";
  collection.updateRule = "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'";
  collection.deleteRule = "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("property_status_history");
  collection.createRule = "@request.auth.companyId = company_id && (@request.auth.role = 'company_super_admin' || (@request.auth.id = created_by && @request.auth.id = property_id.employee_id))";
  collection.updateRule = "@request.auth.companyId = company_id && (@request.auth.role = 'company_super_admin' || @request.auth.id = created_by)";
  collection.deleteRule = "@request.auth.companyId = company_id && (@request.auth.role = 'company_super_admin' || @request.auth.id = created_by)";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})