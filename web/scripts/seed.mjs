import PocketBase from 'pocketbase'

const baseUrl = process.env.PB_URL ?? 'http://127.0.0.1:8090'
const adminEmail = process.env.PB_ADMIN_EMAIL ?? 'admin@example.com'
const adminPassword = process.env.PB_ADMIN_PASSWORD ?? 'Admin123!'

const pb = new PocketBase(baseUrl)

const log = (message) => console.log(`[seed] ${message}`)

const ensureAdmin = async () => {
  log(`login admin ${adminEmail}`)

  // SDK 默认走 /_superusers，但 0.22 服务器是 /api/admins，这里手动调用
  const auth = await pb.send('/api/admins/auth-with-password', {
    method: 'POST',
    body: { identity: adminEmail, password: adminPassword },
  })

  // 将 token 写入 authStore，后续请求自动带上
  pb.authStore.save(auth.token, auth.admin)
}

const findOrCreate = async (collection, filter, data) => {
  try {
    return await pb.collection(collection).getFirstListItem(filter)
  } catch {
    return pb.collection(collection).create(data)
  }
}

const ensureUser = async () =>
  findOrCreate(
    'users',
    'email = "writer@example.com"',
    {
      email: 'writer@example.com',
      password: 'Writer123!',
      passwordConfirm: 'Writer123!',
      username: 'writer',
    },
  )

const ensureTags = async () => {
  const tagPayloads = [
    { name: '前端', slug: 'frontend', color: '#5eead4' },
    { name: '后端', slug: 'backend', color: '#f7c266' },
    { name: '生活方式', slug: 'lifestyle', color: '#7dd3fc' },
  ]

  const result = []
  for (const tag of tagPayloads) {
    const record = await findOrCreate('tags', `slug = "${tag.slug}"`, tag)
    result.push(record)
  }
  return result
}

const ensurePosts = async (authorId, tagRecords) => {
  const sample = [
    {
      title: '用 PocketBase + React 搭起敏捷博客',
      slug: 'pocketbase-react-blog',
      excerpt: '从零搭建，后端存储、认证、文件、评论一次到位。',
      status: 'published',
      content:
        '<p>PocketBase 是一个轻量 BaaS，内置鉴权、文件存储和实时能力，非常适合作为博客的后端。通过官方 SDK，可以在前端直接读取集合、完成登录、上传封面等操作。</p><p>本文示例展示了基本的文章、标签、评论三张表，利用 React Query 做数据管理，react-hook-form 快速搭表单。</p>',
      tags: ['frontend', 'backend'],
    },
    {
      title: '写作流：先草稿，后排期，最后发布',
      slug: 'writing-workflow',
      excerpt: '一个简单的内容流转：草稿 -> 已排期 -> 已发布。',
      status: 'published',
      content:
        '<p>通过状态字段管理文章流转，避免一次性发布。你可以在控制台选择 <strong>draft / published / archived</strong>，并设置发布时间。</p>',
      tags: ['lifestyle'],
    },
  ]

  for (const post of sample) {
    const tagIds = tagRecords
      .filter((tag) => post.tags.includes(tag.slug))
      .map((tag) => tag.id)

    await findOrCreate(
      'posts',
      `slug = "${post.slug}"`,
      {
        ...post,
        author: authorId,
        tags: tagIds,
        publishedAt: new Date().toISOString(),
        readingMinutes: 3,
      },
    )
  }
}

const ensureComments = async (authorId, postSlug) => {
  const post = await pb.collection('posts').getFirstListItem(`slug = "${postSlug}"`)
  await findOrCreate(
    'comments',
    `post = "${post.id}" && author = "${authorId}"`,
    {
      post: post.id,
      author: authorId,
      content: '期待你的反馈，这里可以看到评论展示。',
      status: 'visible',
    },
  )
}

const main = async () => {
  await ensureAdmin()
  const author = await ensureUser()
  const tags = await ensureTags()
  await ensurePosts(author.id, tags)
  await ensureComments(author.id, 'pocketbase-react-blog')
  log('seed completed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
