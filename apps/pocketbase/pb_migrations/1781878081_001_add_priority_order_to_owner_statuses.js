/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("owner_statuses");

  const existing = collection.fields.getByName("priority_order");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("priority_order"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "priority_order",
    required: true,
    min: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("owner_statuses");
    collection.fields.removeByName("priority_order");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})