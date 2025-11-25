import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MessageSquare } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { createComment, fetchComments } from '../api/comments'
import { getFileUrl } from '../lib/pocketbase'
import { formatDate } from '../lib/utils'
import { useAuth } from '../providers/AuthProvider'

interface Props {
  postId: string
}

const CommentSection = ({ postId }: Props) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [content, setContent] = useState('')

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
  })

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (body: { content: string }) => {
      if (!user?.id) throw new Error('需要登录后才能评论')
      return createComment(postId, user.id, body.content)
    },
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) return
    await mutateAsync({ content })
  }

  return (
    <section className="card">
      <div className="section-title">
        <MessageSquare size={18} />
        <span>评论</span>
      </div>
      {isLoading ? (
        <div className="center">
          <Loader2 className="spin" />
        </div>
      ) : (
        <ul className="comment-list">
          {comments?.length ? (
            comments.map((item) => (
              <li key={item.id} className="comment">
                <div className="avatar small">
                  {item.expand?.author?.profileAvatar || item.expand?.author?.avatar ? (
                    <img
                      src={getFileUrl(
                        item.expand.author,
                        item.expand.author.profileAvatar || item.expand.author.avatar,
                        '64x64',
                      )}
                      alt="avatar"
                      className="avatar-img"
                    />
                  ) : (
                    item.expand?.author?.username?.slice(0, 1).toUpperCase() ??
                    item.expand?.author?.email?.slice(0, 1).toUpperCase() ??
                    'U'
                  )}
                </div>
                <div className="comment-body">
                  <div className="comment-head">
                    <span>{item.expand?.author?.username ?? item.expand?.author?.email ?? '匿名'}</span>
                    <span className="muted">{formatDate(item.created)}</span>
                  </div>
                  <p>{item.content}</p>
                </div>
              </li>
            ))
          ) : (
            <p className="muted">暂无评论，来当第一个发言的人吧。</p>
          )}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        {!user ? (
          <div className="alert">登录后可以发表你的想法。</div>
        ) : (
          <>
            <label className="muted" htmlFor="comment">
              想说点什么？
            </label>
            <textarea
              id="comment"
              placeholder="输入评论内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
            {error ? <p className="error">{(error as Error).message}</p> : null}
            <button className="primary-btn" type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="spin" size={16} /> : '发送评论'}
            </button>
          </>
        )}
      </form>
    </section>
  )
}

export default CommentSection
