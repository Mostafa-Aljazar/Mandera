/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("companies");
  collection.viewRule = "@request.auth.role = 'master_admin' || @request.auth.companyId = id";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("companies");
  collection.viewRule = "@request.auth.role = 'master_admin'";
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})