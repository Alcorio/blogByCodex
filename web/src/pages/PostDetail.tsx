import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { fetchPostBySlug } from '../api/posts'
import CommentSection from '../components/CommentSection'
import TagPill from '../components/TagPill'
import { getFileUrl } from '../lib/pocketbase'
import { formatDate } from '../lib/utils'
import { useAuth } from '../providers/AuthProvider'

const PostDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug ?? ''),
    enabled: Boolean(slug),
  })

  if (isLoading) {
    return (
      <div className="container center">
        <Loader2 className="spin" />
      </div>
    )
  }

  if (!post || error) {
    return (
      <div className="container">
        <div className="card">
          <p>未找到文章，或者已被删除。</p>
        </div>
      </div>
    )
  }

  const coverUrl = getFileUrl(post, post.cover, '1280x720')
  const gallery =
    post.showAttachments && post.attachments
      ? post.attachments.map((file) => getFileUrl(post, file, '1280x'))
      : []

  return (
    <article className="container post-page">
      {coverUrl ? (
        <div className="post-hero">
          <img src={coverUrl} alt={post.title} />
        </div>
      ) : null}
      <div className="post-meta">
        <div>
          <p className="eyebrow">{formatDate(post.publishedAt)}</p>
          <h1>{post.title}</h1>
          <p className="muted">{post.excerpt}</p>
          {post.expand?.author ? (
            <p className="muted">
              作者：{post.expand.author.username || post.expand.author.email || '未知'}
            </p>
          ) : null}
          {user?.id === post.author ? (
            <div className="pill">
              <Link to={`/post/${post.slug}/edit`}>编辑此文</Link>
            </div>
          ) : null}
        </div>
        <div className="tag-row">
          {post.expand?.tags?.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <div className="post-body card" dangerouslySetInnerHTML={{ __html: post.content }} />
      {gallery.length ? (
        <div className="card gallery">
          <p className="muted">附加图片（可点击下载）</p>
          <div className="gallery-grid">
            {gallery.map((src, idx) => (
              <a key={idx} href={src} download>
                <img src={src} alt={`attachment-${idx}`} loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <CommentSection postId={post.id} />
    </article>
  )
}

export default PostDetail
