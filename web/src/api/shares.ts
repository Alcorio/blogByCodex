import { pb, pocketbaseUrl } from '../lib/pocketbase'
import { slugify } from '../lib/utils'
import type { PostRecord, ShareRecord } from '../types'

const buildShareFilter = (ids: string[]) => ids.map((id) => `id = "${id}"`).join(' || ')
const configuredAppUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')

export const buildDefaultShareSlug = (identity?: string) => {
  const base = slugify(identity || 'writer') || 'writer'
  return `${base}-reads`.slice(0, 80)
}

export const fetchMyShare = async () => {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('请先登录')

  try {
    return await pb.collection<ShareRecord>('shares').getFirstListItem(`owner = "${userId}"`, {
      expand: 'owner',
    })
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404) return null
    throw error
  }
}

export const saveMyShare = async (payload: {
  id?: string
  shareSlug: string
  title?: string
  description?: string
  posts: string[]
  active: boolean
}) => {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('请先登录')

  const data = {
    owner: userId,
    shareSlug: slugify(payload.shareSlug),
    title: payload.title?.trim() || '',
    description: payload.description?.trim() || '',
    posts: payload.posts,
    active: payload.active,
  }

  if (payload.id) {
    return pb.collection<ShareRecord>('shares').update(payload.id, data)
  }

  return pb.collection<ShareRecord>('shares').create(data)
}

export const fetchPublicShare = async (shareSlug: string) => {
  return pb.collection<ShareRecord>('shares').getFirstListItem(
    `shareSlug = "${shareSlug}" && active = true`,
    {
      expand: 'owner',
    },
  )
}

export const fetchSharedPosts = async (postIds: string[]) => {
  if (!postIds.length) return []

  return pb.collection<PostRecord>('posts').getFullList({
    sort: '-publishedAt,-created',
    filter: `status = "published" && (${buildShareFilter(postIds)})`,
    expand: 'tags,author',
  })
}

export const buildPublicShareUrl = (shareSlug: string) => {
  if (configuredAppUrl) {
    return `${configuredAppUrl}/u/${shareSlug}`
  }

  if (typeof window === 'undefined') {
    return `${pocketbaseUrl}/u/${shareSlug}`
  }

  return `${window.location.origin}/u/${shareSlug}`
}
