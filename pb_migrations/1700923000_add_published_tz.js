migrate(
  (db) => {
    const dao = new Dao(db);
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.addField(
      new SchemaField({
        system: false,
        id: "publishtz001",
        name: "publishedTz",
        type: "text",
        required: false,
        presentable: true,
        unique: false,
        options: {
          min: 0,
          max: 32,
          pattern: "",
        },
      })
    );
    dao.saveCollection(posts);
  },
  (db) => {
    const dao = new Dao(db);
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.removeField("publishtz001");
    dao.saveCollection(posts);
  }
);
