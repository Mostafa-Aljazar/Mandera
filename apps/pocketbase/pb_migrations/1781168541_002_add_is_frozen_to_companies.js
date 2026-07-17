/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("companies");

  const existing = collection.fields.getByName("is_frozen");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("is_frozen"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "is_frozen",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("companies");
    collection.fields.removeByName("is_frozen");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})