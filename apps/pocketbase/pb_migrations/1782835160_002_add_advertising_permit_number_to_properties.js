/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("properties");

  const existing = collection.fields.getByName("advertising_permit_number");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("advertising_permit_number"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "advertising_permit_number",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("properties");
    collection.fields.removeByName("advertising_permit_number");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})