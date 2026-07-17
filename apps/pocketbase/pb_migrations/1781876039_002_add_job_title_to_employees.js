/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("employees");

  const existing = collection.fields.getByName("job_title");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("job_title"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "job_title",
    required: true,
    values: ["\u0648\u0643\u064a\u0644 \u0645\u0628\u064a\u0639\u0627\u062a", "\u0645\u0633\u0624\u0648\u0644", "\u0645\u062f\u064a\u0631"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("employees");
    collection.fields.removeByName("job_title");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})