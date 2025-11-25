migrate(
  (db) => {
    const dao = new Dao(db);

    // add profileAvatar to users (independent字段，避免与默认 avatar 冲突)
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.schema.addField(
      new SchemaField({
        system: false,
        id: "avat4r1f3ldx9",
        name: "profileAvatar",
        type: "file",
        required: false,
        presentable: true,
        unique: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
          thumbs: ["64x64", "256x256"],
        },
      }),
    );
    dao.saveCollection(users);

    // add attachments to posts
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.addField(
      new SchemaField({
        system: false,
        id: "attachm3nts9f1l",
        name: "attachments",
        type: "file",
        required: false,
        presentable: true,
        unique: false,
        options: {
          maxSelect: 6,
          maxSize: 8388608,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
          thumbs: ["320x", "640x", "1280x"],
        },
      }),
    );
    dao.saveCollection(posts);
  },
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.schema.removeField("avat4r1f3ldx9");
    dao.saveCollection(users);

    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    posts.schema.removeField("attachm3nts9f1l");
    dao.saveCollection(posts);
  }
);
