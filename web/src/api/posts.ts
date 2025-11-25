import { pb } from '../lib/pocketbase'
import { estimateReadingMinutes } from '../lib/utils'
import type { PostFormInput, PostRecord, TagRecord } from '../types'

type PocketbaseErrorData = Record<string, { message?: string }>
type PocketbaseErrorResponse = { message?: string; data?: PocketbaseErrorData }
type PocketbaseError = { message?: string; response?: PocketbaseErrorResponse }

const toFormData = (payload: PostFormInput) => {
  const authorId = pb.authStore.model?.id
  if (!authorId) {
    throw new Error('请先登录后再保存文章')
  }

  const fd = new FormData()
  fd.append('title', payload.title)
  fd.append('slug', payload.slug)
  fd.append('content', payload.content)
  fd.append('status', payload.status)
  fd.append('author', authorId)

  if (payload.excerpt) fd.append('excerpt', payload.excerpt)
  if (payload.tags?.length) {
    payload.tags.forEach((id) => fd.append('tags', id))
  }
  if (payload.publishedAt) {
    const iso = payload.publishedAt.endsWith('Z')
      ? payload.publishedAt
      : payload.publishedAt
    fd.append('publishedAt', iso)
  }
  if (payload.publishedTz) fd.append('publishedTz', payload.publishedTz)
  if (payload.readingMinutes) fd.append('readingMinutes', String(payload.readingMinutes))
  if (payload.cover?.length) fd.append('cover', payload.cover[0])
  if (payload.attachments?.length) {
    Array.from(payload.attachments).forEach((file) => fd.append('attachments', file))
  }
  if (payload.showAttachments !== undefined) {
    fd.append('showAttachments', payload.showAttachments ? 'true' : 'false')
  }

  // Fallback reading minutes if not provided
  if (!payload.readingMinutes) {
    fd.append('readingMinutes', String(estimateReadingMinutes(payload.content)))
  }

  return fd
}

const stripShowAttachments = (formData: FormData) => {
  const fd = new FormData()
  formData.forEach((v, k) => {
    if (k !== 'showAttachments') fd.append(k, v)
  })
  return fd
}

export const fetchTags = async () => {
  return pb.collection<TagRecord>('tags').getFullList({
    // Keep the tag order consistent with creation time in the database
    sort: 'created',
  })
}

export const fetchPosts = async (tagSlug?: string) => {
  const userId = pb.authStore.model?.id
  const filterBase = userId
    ? `(status = "published" || author = "${userId}")`
    : 'status = "published"'

  const result = await pb
    .collection<PostRecord>('posts')
    .getList(1, 50, {
      sort: '-publishedAt,-created',
      filter: filterBase,
      expand: 'tags,author',
    })
    .catch((err: unknown) => {
      const pbErr = err as PocketbaseError
      console.error('fetchPosts failed', pbErr.response ?? pbErr)
      throw err
    })

  if (!tagSlug) return result.items

  return result.items.filter((item) =>
    item.expand?.tags?.some((tag) => tag.slug === tagSlug),
  )
}

export const fetchPostBySlug = async (slug: string) => {
  return pb.collection<PostRecord>('posts').getFirstListItem(`slug = "${slug}"`, {
    expand: 'author,tags',
  })
}

export const fetchMyPosts = async () => {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('请先登录')
  const result = await pb.collection<PostRecord>('posts').getList(1, 50, {
    sort: '-updated',
    filter: `author="${userId}"`,
    expand: 'tags,author',
  })
  return result.items
}

const buildErrorMessage = (err: unknown): string => {
  const pbErr = err as PocketbaseError
  const fieldErrors = pbErr.response?.data
    ? Object.entries(pbErr.response.data)
        .map(([key, val]) => `${key}: ${val?.message ?? '校验失败'}`)
        .join('; ')
    : ''
  const dataMsg = pbErr.response?.data ? JSON.stringify(pbErr.response.data) : ''
  return (
    pbErr.response?.message ||
    fieldErrors ||
    dataMsg ||
    pbErr.message ||
    '操作失败'
  )
}

export const createPost = async (payload: PostFormInput) => {
  const formData = toFormData(payload)
  try {
    return await pb.collection<PostRecord>('posts').create(formData)
  } catch (err: unknown) {
    try {
      const fdNoShow = stripShowAttachments(formData)
      return await pb.collection<PostRecord>('posts').create(fdNoShow)
    } catch {
      // ignore and fall through
    }
    const msg = buildErrorMessage(err)
    const pbErr = err as PocketbaseError
    console.error('createPost error', pbErr.response ?? pbErr)
    throw new Error(msg)
  }
}

export const updatePost = async (id: string, payload: PostFormInput) => {
  const formData = toFormData(payload)
  try {
    return await pb.collection<PostRecord>('posts').update(id, formData)
  } catch (err: unknown) {
    try {
      const fdNoShow = stripShowAttachments(formData)
      return await pb.collection<PostRecord>('posts').update(id, fdNoShow)
    } catch {
      // ignore and fall through
    }
    const msg = buildErrorMessage(err)
    const pbErr = err as PocketbaseError
    console.error('updatePost error', pbErr.response ?? pbErr)
    throw new Error(msg)
  }
}
