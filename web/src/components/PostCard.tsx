import { Clock3, MoveRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getFileUrl } from '../lib/pocketbase'
import { formatDate } from '../lib/utils'
import type { PostRecord } from '../types'
import TagPill from './TagPill'

interface Props {
  post: PostRecord
}

const PostCard = ({ post }: Props) => {
  const coverUrl =
    getFileUrl(post, post.cover, '640x360') ||
    getFileUrl(post, post.attachments?.[0], '640x360')

  return (
    <article className="post-card">
      <div className="post-card__media">
        {coverUrl ? (
          <img src={coverUrl} alt={post.title} loading="lazy" />
        ) : (
          <div className="post-card__placeholder" />
        )}
      </div>
      <div className="post-card__content">
        <div className="post-card__meta">
          <div className="meta">
            <Clock3 size={16} />
            <span>{post.readingMinutes ?? 3} 分钟阅读</span>
          </div>
          <span className="muted">{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__excerpt">{post.excerpt}</p>
        <div className="post-card__tags">
          {post.expand?.tags?.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
        <div className="post-card__footer">
          <Link className="text-btn" to={`/post/${post.slug}`}>
            阅读更多 <MoveRight size={18} />
          </Link>
          {post.expand?.author ? (
            <span className="muted">
              by {post.expand.author.username || post.expand.author.email || '作者未知'}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default PostCard
