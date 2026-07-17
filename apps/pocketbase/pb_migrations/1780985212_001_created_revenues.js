/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fetch related collections to get their IDs
  const pbc_2029377502Collection = app.findCollectionByNameOrId("pbc_2029377502");
  const pbc_7825922583Collection = app.findCollectionByNameOrId("pbc_7825922583");
  const pbc_2313907151Collection = app.findCollectionByNameOrId("pbc_2313907151");

  const collection = new Collection({
    "createRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "deleteRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "fields":     [
          {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text4707216112",
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
                "id": "text2185134527",
                "name": "property_code",
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
                "id": "text4872443859",
                "name": "emirate",
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
                "id": "text4027302166",
                "name": "area_district",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "number2708260142",
                "name": "commission_value",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "number",
                "max": null,
                "min": null,
                "onlyInt": false
          },
          {
                "hidden": false,
                "id": "relation9907689546",
                "name": "employee_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": pbc_2029377502Collection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "text9347592708",
                "name": "employee_name",
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
                "id": "date1895998321",
                "name": "deal_completion_date",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "date",
                "max": "",
                "min": ""
          },
          {
                "hidden": false,
                "id": "relation1454105679",
                "name": "client_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": pbc_7825922583Collection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "text5061072142",
                "name": "client_name",
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
                "id": "text4941229180",
                "name": "owner_name",
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
                "id": "relation1630275760",
                "name": "company_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": pbc_2313907151Collection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "autodate4036475153",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
          },
          {
                "hidden": false,
                "id": "autodate1262598013",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
          }
    ],
    "id": "pbc_2482480816",
    "indexes": [],
    "listRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'",
    "name": "revenues",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.companyId = company_id && @request.auth.role = 'company_super_admin'"
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
    const collection = app.findCollectionByNameOrId("pbc_2482480816");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})