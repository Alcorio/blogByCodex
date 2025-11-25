migrate(
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.listRule = "";
    users.viewRule = "";
    dao.saveCollection(users);
  },
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.listRule = null;
    users.viewRule = null;
    dao.saveCollection(users);
  }
);
