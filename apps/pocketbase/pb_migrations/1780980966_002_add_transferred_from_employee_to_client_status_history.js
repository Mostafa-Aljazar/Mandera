/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const company_employeesCollection = app.findCollectionByNameOrId("company_employees");
  const collection = app.findCollectionByNameOrId("client_status_history");

  const existing = collection.fields.getByName("transferred_from_employee");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("transferred_from_employee"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "transferred_from_employee",
    required: false,
    collectionId: company_employeesCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("client_status_history");
    collection.fields.removeByName("transferred_from_employee");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})