/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fetch related collections to get their IDs
  const companiesCollection = app.findCollectionByNameOrId("companies");

  const collection = new Collection({
    "createRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "deleteRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "fields":     [
          {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text8544702117",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
          },
          {
                "hidden": false,
                "id": "text3682260340",
                "name": "name",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "text7041451146",
                "name": "phone",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "text1790285141",
                "name": "country",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "relation2718273127",
                "name": "company_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": companiesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "autodate7663407267",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
          },
          {
                "hidden": false,
                "id": "autodate0814875127",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
          }
    ],
    "id": "pbc_6601306559",
    "indexes": [],
    "listRule": "@request.auth.companyId = company_id",
    "name": "owners",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "viewRule": "@request.auth.companyId = company_id"
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("Collection already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_6601306559");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})