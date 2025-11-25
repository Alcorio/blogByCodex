migrate(
  (db) => {
    const dao = new Dao(db);
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.addField(
      new SchemaField({
        system: false,
        id: "showattachflag01",
        name: "showAttachments",
        type: "bool",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      })
    );
    dao.saveCollection(posts);
  },
  (db) => {
    const dao = new Dao(db);
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.removeField("showattachflag01");
    dao.saveCollection(posts);
  }
);
