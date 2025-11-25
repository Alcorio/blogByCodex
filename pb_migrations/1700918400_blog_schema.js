/// Blog schema migration
/// Creates posts, tags, and comments collections for the PocketBase backend.
migrate(
  (db) => {
    const dao = new Dao(db);

    const posts = new Collection({
      id: "posts2k3blg001a",
      created: "2025-11-25 14:45:00.000Z",
      updated: "2025-11-25 14:45:00.000Z",
      name: "posts",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "titl3z4h1m28vxp",
          name: "title",
          type: "text",
          required: true,
          presentable: true,
          unique: false,
          options: {
            min: 4,
            max: 140,
            pattern: "",
          },
        },
        {
          system: false,
          id: "slug3q1n8kzs7ab",
          name: "slug",
          type: "text",
          required: true,
          presentable: true,
          unique: true,
          options: {
            min: 3,
            max: 120,
            pattern: "^[a-z0-9-]+$",
          },
        },
        {
          system: false,
          id: "exc3rpt4m1o2p9",
          name: "excerpt",
          type: "text",
          required: false,
          presentable: true,
          unique: false,
          options: {
            min: 0,
            max: 260,
            pattern: "",
          },
        },
        {
          system: false,
          id: "cont3nt6g2d1qv",
          name: "content",
          type: "editor",
          required: true,
          presentable: true,
          unique: false,
          options: {
            convertUrls: true,
            sanitize: true,
          },
        },
        {
          system: false,
          id: "cover9s1f2j8q2p",
          name: "cover",
          type: "file",
          required: false,
          presentable: true,
          unique: false,
          options: {
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
            thumbs: ["128x128", "640x360", "1280x720"],
          },
        },
        {
          system: false,
          id: "tags6s2l3w9n1r",
          name: "tags",
          type: "relation",
          required: false,
          presentable: true,
          unique: false,
          options: {
            collectionId: "tags7m4q2pj1kxz",
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 6,
            displayFields: ["name", "slug"],
          },
        },
        {
          system: false,
          id: "stat7s8h1p0l9c",
          name: "status",
          type: "select",
          required: true,
          presentable: true,
          unique: false,
          options: {
            maxSelect: 1,
            values: ["draft", "published", "archived"],
          },
        },
        {
          system: false,
          id: "publ1sh5d4t1me",
          name: "publishedAt",
          type: "date",
          required: false,
          presentable: true,
          unique: false,
          options: {
            min: "",
            max: "",
          },
        },
        {
          system: false,
          id: "auth0r1d8r5l2o",
          name: "author",
          type: "relation",
          required: true,
          presentable: true,
          unique: false,
          options: {
            collectionId: "_pb_users_auth_",
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: ["username", "email"],
          },
        },
        {
          system: false,
          id: "readt1m3m1n3s",
          name: "readingMinutes",
          type: "number",
          required: false,
          presentable: true,
          unique: false,
          options: {
            min: 1,
            max: 60,
            noDecimal: true,
          },
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_posts_slug` ON `posts` (`slug`)",
        "CREATE INDEX `idx_posts_status_publishedAt` ON `posts` (`status`, `publishedAt`)",
      ],
      listRule: '@request.auth.id != "" || status = "published"',
      viewRule: '@request.auth.id != "" || status = "published"',
      createRule: "@request.auth.id != \"\"",
      updateRule: "author.id = @request.auth.id",
      deleteRule: "author.id = @request.auth.id",
      options: {},
    });

    const tags = new Collection({
      id: "tags7m4q2pj1kxz",
      created: "2025-11-25 14:45:00.000Z",
      updated: "2025-11-25 14:45:00.000Z",
      name: "tags",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "tagn4m3g7h2k8q",
          name: "name",
          type: "text",
          required: true,
          presentable: true,
          unique: true,
          options: {
            min: 2,
            max: 50,
            pattern: "",
          },
        },
        {
          system: false,
          id: "tag5sl3g7i2d9o",
          name: "slug",
          type: "text",
          required: true,
          presentable: true,
          unique: true,
          options: {
            min: 2,
            max: 60,
            pattern: "^[a-z0-9-]+$",
          },
        },
        {
          system: false,
          id: "color2d1h7p3k4",
          name: "color",
          type: "text",
          required: false,
          presentable: true,
          unique: false,
          options: {
            min: 4,
            max: 16,
            pattern: "^#[0-9a-fA-F]{6}$",
          },
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_tags_slug` ON `tags` (`slug`)",
        "CREATE UNIQUE INDEX `idx_tags_name` ON `tags` (`name`)",
      ],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != \"\"",
      updateRule: "@request.auth.id != \"\"",
      deleteRule: "@request.auth.id != \"\"",
      options: {},
    });

    const comments = new Collection({
      id: "comn5w3z8k1r0hp",
      created: "2025-11-25 14:45:00.000Z",
      updated: "2025-11-25 14:45:00.000Z",
      name: "comments",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "post1r3l8q2w5e",
          name: "post",
          type: "relation",
          required: true,
          presentable: true,
          unique: false,
          options: {
            collectionId: "posts2k3blg001a",
            cascadeDelete: true,
            minSelect: 1,
            maxSelect: 1,
            displayFields: ["title", "slug"],
          },
        },
        {
          system: false,
          id: "cmtauth4x1z7q9",
          name: "author",
          type: "relation",
          required: true,
          presentable: true,
          unique: false,
          options: {
            collectionId: "_pb_users_auth_",
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: ["username", "email"],
          },
        },
        {
          system: false,
          id: "cmtc0ntent8p1m",
          name: "content",
          type: "text",
          required: true,
          presentable: true,
          unique: false,
          options: {
            min: 2,
            max: 480,
            pattern: "",
          },
        },
        {
          system: false,
          id: "cmtstat4s1v8h0",
          name: "status",
          type: "select",
          required: true,
          presentable: true,
          unique: false,
          options: {
            maxSelect: 1,
            values: ["visible", "hidden"],
          },
        },
      ],
      indexes: [
        "CREATE INDEX `idx_comments_post` ON `comments` (`post`)",
        "CREATE INDEX `idx_comments_author` ON `comments` (`author`)",
      ],
      listRule:
        'status = "visible" || author.id = @request.auth.id || @request.auth.id != ""',
      viewRule:
        'status = "visible" || author.id = @request.auth.id || @request.auth.id != ""',
      createRule: "@request.auth.id != \"\"",
      updateRule: "author.id = @request.auth.id",
      deleteRule: "author.id = @request.auth.id",
      options: {},
    });

    dao.saveCollection(tags);
    dao.saveCollection(posts);
    return dao.saveCollection(comments);
  },
  (db) => {
    const dao = new Dao(db);
    const posts = dao.findCollectionByNameOrId("posts2k3blg001a");
    const tags = dao.findCollectionByNameOrId("tags7m4q2pj1kxz");
    const comments = dao.findCollectionByNameOrId("comn5w3z8k1r0hp");

    dao.deleteCollection(comments);
    dao.deleteCollection(posts);
    return dao.deleteCollection(tags);
  }
);
