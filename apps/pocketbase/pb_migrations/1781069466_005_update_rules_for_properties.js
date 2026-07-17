/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("properties");
  collection.listRule = "@request.auth.companyId = company_id && (employee_id = @request.auth.id || @request.auth.role = 'company_super_admin')";
  collection.viewRule = "@request.auth.companyId = company_id";
  collection.updateRule = "@request.auth.companyId = company_id && (employee_id = @request.auth.id || @request.auth.role = 'company_super_admin')";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("properties");
  collection.listRule = "@request.auth.companyId = company_id";
  collection.viewRule = "@request.auth.companyId = company_id";
  collection.createRule = "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'";
  collection.updateRule = "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'";
  collection.deleteRule = "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})