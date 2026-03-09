migrate(
  (app) => {
    const shares = new Collection({
      id: 'share5ubpages01',
      created: '2026-03-09 12:00:00.000Z',
      updated: '2026-03-09 12:00:00.000Z',
      name: 'shares',
      type: 'base',
      system: false,
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          presentable: true,
          unique: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          minSelect: 1,
          maxSelect: 1,
        },
        {
          name: 'shareSlug',
          type: 'text',
          required: true,
          presentable: true,
          unique: true,
          min: 3,
          max: 80,
          pattern: '^[a-z0-9-]+$',
        },
        {
          name: 'title',
          type: 'text',
          required: false,
          presentable: true,
          unique: false,
          min: 0,
          max: 120,
          pattern: '',
        },
        {
          name: 'description',
          type: 'text',
          required: false,
          presentable: true,
          unique: false,
          min: 0,
          max: 280,
          pattern: '',
        },
        {
          name: 'posts',
          type: 'relation',
          required: false,
          presentable: true,
          unique: false,
          collectionId: 'posts2k3blg001a',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 50,
        },
        {
          name: 'active',
          type: 'bool',
          required: false,
          presentable: true,
          unique: false,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_shares_slug` ON `shares` (`shareSlug`)',
        'CREATE UNIQUE INDEX `idx_shares_owner` ON `shares` (`owner`)',
      ],
      listRule: 'active = true || owner = @request.auth.id',
      viewRule: 'active = true || owner = @request.auth.id',
      createRule: '@request.auth.id != "" && owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      options: {},
    })

    return app.save(shares)
  },
  (app) => {
    const shares = app.findCollectionByNameOrId('share5ubpages01')

    return app.delete(shares)
  },
)
