/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("owners");

  const existing = collection.fields.getByName("marketing_channel");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("marketing_channel"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "marketing_channel",
    required: false,
    values: ["Google", "Facebook", "Instagram", "TikTok", "Snapchat", "X", "LinkedIn", "Property Finder", "Bayut", "Dubizzle", "Marjan", "OpenSouk", "Website"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("owners");
    collection.fields.removeByName("marketing_channel");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})