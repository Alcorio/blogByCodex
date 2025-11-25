import { pb } from '../lib/pocketbase'
import type { CommentRecord } from '../types'

export const fetchComments = async (postId: string) => {
  return pb.collection<CommentRecord>('comments').getFullList({
    filter: `post = "${postId}" && status = "visible"`,
    expand: 'author',
    sort: '-created',
  })
}

export const createComment = async (postId: string, authorId: string, content: string) =>
  pb.collection<CommentRecord>('comments').create({
    post: postId,
    author: authorId,
    content,
    status: 'visible',
  })
