/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fetch related collections to get their IDs
  const ownersCollection = app.findCollectionByNameOrId("owners");
  const owner_statusesCollection = app.findCollectionByNameOrId("owner_statuses");
  const company_super_adminsCollection = app.findCollectionByNameOrId("company_super_admins");
  const companiesCollection = app.findCollectionByNameOrId("companies");

  const collection = new Collection({
    "createRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "deleteRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "fields":     [
          {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text6959151661",
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
                "id": "relation4568073525",
                "name": "owner_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": ownersCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "relation7059480249",
                "name": "status_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": owner_statusesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "text1952361606",
                "name": "note",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 300,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "relation5597438660",
                "name": "created_by",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": company_super_adminsCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "relation1632238617",
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
                "id": "autodate2258668838",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
          },
          {
                "hidden": false,
                "id": "autodate0467171088",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
          }
    ],
    "id": "pbc_1586259687",
    "indexes": [],
    "listRule": "@request.auth.companyId = company_id",
    "name": "owner_status_history",
    "system": false,
    "type": "base",
    "updateRule": null,
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
    const collection = app.findCollectionByNameOrId("pbc_1586259687");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})