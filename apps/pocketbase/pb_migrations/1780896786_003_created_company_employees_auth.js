/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let companiesCollection = app.findCollectionByNameOrId("companies")
    let employeesCollection = app.findCollectionByNameOrId("employees")
    let collection = new Collection({
        type: "auth",
        name: "company_employees",
        listRule: "@request.auth.companyId = companyId",
        viewRule: "@request.auth.id = id || @request.auth.companyId = companyId",
        createRule: "@request.auth.companyId = companyId && @request.auth.role = 'company_super_admin'",
        updateRule: "@request.auth.id = id",
        deleteRule: "@request.auth.companyId = companyId && @request.auth.role = 'company_super_admin'",
        authRule: "",
        fields: [
        {
                "hidden": false,
                "id": "text1658870666",
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
                "id": "relation4944955166",
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
                "id": "relation5976023758",
                "name": "employeeId",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                collectionId: employeesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
        },
        {
                "hidden": false,
                "id": "text7003947141",
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
        let collection = app.findCollectionByNameOrId("company_employees")
        app.delete(collection)
    } catch (e) {
        if (e.message.includes("no rows in result set")) {
            console.log("Collection not found, skipping revert");
            return;
        }
        throw e;
    }
})