/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("legal_pages");

  const record0 = new Record(collection);
    record0.set("page_type", "privacy_policy");
    record0.set("title", "Privacy Policy");
    record0.set("content", "<h2>Privacy Policy</h2><p>This is the default privacy policy content. Master admin can edit this content from the admin panel.</p><p>Last updated: 2024</p>");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("page_type", "terms_of_service");
    record1.set("title", "Terms of Service");
    record1.set("content", "<h2>Terms of Service</h2><p>This is the default terms of service content. Master admin can edit this content from the admin panel.</p><p>Last updated: 2024</p>");
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})