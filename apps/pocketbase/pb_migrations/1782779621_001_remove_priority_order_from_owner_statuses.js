/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("owner_statuses");
  collection.fields.removeByName("priority_order");
  return app.save(collection);
}, (app) => {
  try {

  const collection = app.findCollectionByNameOrId("owner_statuses");
  collection.fields.add(new NumberField({
    name: "priority_order",
    required: true,
    min: 1
  }));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})