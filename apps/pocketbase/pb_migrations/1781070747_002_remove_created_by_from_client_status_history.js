/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("client_status_history");
  collection.fields.removeByName("created_by");
  return app.save(collection);
}, (app) => {
  try {

  const pbc_148617860Collection = app.findCollectionByNameOrId("pbc_148617860");
  const collection = app.findCollectionByNameOrId("client_status_history");
  collection.fields.add(new RelationField({
    name: "created_by",
    required: true,
    collectionId: pbc_148617860Collection.id,
    maxSelect: 1,
    cascadeDelete: false
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