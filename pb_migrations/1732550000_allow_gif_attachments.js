migrate(
  (db) => {
    const dao = new Dao(db)
    const posts = dao.findCollectionByNameOrId('posts2k3blg001a')
    const field = posts.schema.getFieldById('attachm3nts9f1l')
    field.options.mimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    dao.saveCollection(posts)
  },
  (db) => {
    const dao = new Dao(db)
    const posts = dao.findCollectionByNameOrId('posts2k3blg001a')
    const field = posts.schema.getFieldById('attachm3nts9f1l')
    field.options.mimeTypes = ['image/png', 'image/jpeg', 'image/webp']
    dao.saveCollection(posts)
  },
)
