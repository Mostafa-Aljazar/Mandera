/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("companies");

  const record0 = new Record(collection);
    record0.set("companyCode", "COMP001");
    record0.set("companyName", "\u0634\u0631\u0643\u0629 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0627\u0644\u0630\u0647\u0628\u064a\u0629");
    record0.set("email", "admin@goldrealestate.com");
    record0.set("subscriptionStartDate", "2024-01-01");
    record0.set("subscriptionEndDate", "2025-12-31");
    record0.set("maxEmployeeCount", 10);
    record0.set("isActive", true);
  try {
    app.save(record0);
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