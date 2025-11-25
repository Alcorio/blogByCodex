import type { RecordModel } from 'pocketbase'

export type PostStatus = 'draft' | 'published' | 'archived'

export interface TagRecord extends RecordModel {
  name: string
  slug: string
  color?: string
}

export interface PostRecord extends RecordModel {
  title: string
  slug: string
  excerpt?: string
  content: string
  cover?: string
  attachments?: string[]
  tags?: string[]
  status: PostStatus
  publishedAt?: string
  publishedTz?: string
  author: string
  readingMinutes?: number
  showAttachments?: boolean
  expand?: {
    author?: RecordModel
    tags?: TagRecord[]
  }
}

export interface CommentRecord extends RecordModel {
  content: string
  post: string
  author: string
  status: 'visible' | 'hidden'
  expand?: {
    author?: RecordModel
  }
}

export interface AuthUser extends RecordModel {
  username?: string
  email?: string
  avatar?: string
  profileAvatar?: string
}

export interface PostFormInput {
  title: string
  slug: string
  excerpt?: string
  content: string
  status: PostStatus
  publishedAt?: string
  publishedTz?: string
  tags: string[]
  readingMinutes?: number
  cover?: FileList | null
  attachments?: FileList | null
  showAttachments?: boolean
}
