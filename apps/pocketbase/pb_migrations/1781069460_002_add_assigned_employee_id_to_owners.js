/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const pbc_2029377502Collection = app.findCollectionByNameOrId("pbc_2029377502");
  const collection = app.findCollectionByNameOrId("owners");

  const existing = collection.fields.getByName("assigned_employee_id");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("assigned_employee_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "assigned_employee_id",
    required: false,
    collectionId: pbc_2029377502Collection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("owners");
    collection.fields.removeByName("assigned_employee_id");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})