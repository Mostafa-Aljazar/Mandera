/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let companiesCollection = app.findCollectionByNameOrId("companies")
    let collection = new Collection({
        type: "auth",
        name: "company_super_admins",
        listRule: "@request.auth.role = 'master_admin' || @request.auth.companyId = companyId",
        viewRule: "@request.auth.id = id || @request.auth.companyId = companyId",
        createRule: "@request.auth.role = 'master_admin'",
        updateRule: "@request.auth.id = id",
        deleteRule: "@request.auth.role = 'master_admin'",
        authRule: "",
        fields: [
        {
                "hidden": false,
                "id": "text9661184116",
                "name": "name",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
        },
        {
                "hidden": false,
                "id": "relation9173582987",
                "name": "companyId",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                collectionId: companiesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
        },
        {
                "hidden": false,
                "id": "text0135670216",
                "name": "companyCode",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
        },
        {
                "hidden": false,
                "id": "text8219936011",
                "name": "role",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
        }
],
        authAlert: { enabled: false },
    })

    try {
        app.save(collection)
    } catch (e) {
        if (e.message.includes("Collection name must be unique")) {
            console.log("Collection already exists, skipping")
            return
        }
        throw e
    }
}, (app) => {
    try {
        let collection = app.findCollectionByNameOrId("company_super_admins")
        app.delete(collection)
    } catch (e) {
        if (e.message.includes("no rows in result set")) {
            console.log("Collection not found, skipping revert");
            return;
        }
        throw e;
    }
})