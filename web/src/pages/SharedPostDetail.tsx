import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import CommentSection from '../components/CommentSection'
import TagPill from '../components/TagPill'
import { fetchPostBySlug } from '../api/posts'
import { fetchPublicShare } from '../api/shares'
import { getFileUrl, isGifFile, renderPortableContent } from '../lib/pocketbase'
import { formatDate } from '../lib/utils'

const SharedPostDetail = () => {
  const { shareSlug, slug } = useParams<{ shareSlug: string; slug: string }>()

  const { data: share, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: ['public-share', shareSlug],
    queryFn: () => fetchPublicShare(shareSlug || ''),
    enabled: Boolean(shareSlug),
  })

  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ['shared-post', shareSlug, slug],
    queryFn: () => fetchPostBySlug(slug || ''),
    enabled: Boolean(shareSlug && slug),
  })

  if (shareLoading || postLoading) {
    return (
      <div className="container center">
        <Loader2 className="spin" />
      </div>
    )
  }

  const visiblePost = share && post && share.posts?.includes(post.id) ? post : null

  if (!share || shareError || !visiblePost || postError) {
    return (
      <div className="container center">
        <div className="card">文章不存在，或者未包含在当前分享页中。</div>
      </div>
    )
  }

  const coverUrl = visiblePost.cover
    ? getFileUrl(
        visiblePost,
        visiblePost.cover,
        isGifFile(visiblePost.cover) ? undefined : '1280x720',
      )
    : ''
  const gallery =
    visiblePost.showAttachments && visiblePost.attachments
      ? visiblePost.attachments.map((file) =>
          getFileUrl(visiblePost, file, isGifFile(file) ? undefined : '1280x0'),
        )
      : []
  const contentHtml = renderPortableContent(visiblePost.content)

  return (
    <article className="container post-page">
      <div className="section-title">
        <div>
          <Link className="text-btn" to={`/u/${share.shareSlug}`}>
            <ChevronLeft size={16} />
            返回分享页
          </Link>
        </div>
      </div>
      {coverUrl ? (
        <div className="post-hero">
          <img src={coverUrl} alt={visiblePost.title} />
        </div>
      ) : null}
      <div className="post-meta">
        <div>
          <p className="eyebrow">{formatDate(visiblePost.publishedAt)}</p>
          <h1>{visiblePost.title}</h1>
          <p className="muted">{visiblePost.excerpt}</p>
          {visiblePost.expand?.author ? (
            <p className="muted">
              作者：{visiblePost.expand.author.username || visiblePost.expand.author.email || '未知'}
            </p>
          ) : null}
        </div>
        <div className="tag-row">
          {visiblePost.expand?.tags?.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <div className="post-body card" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      {gallery.length ? (
        <div className="card gallery">
          <p className="muted">附加图片</p>
          <div className="gallery-grid">
            {gallery.map((src, idx) => (
              <img key={idx} src={src} alt={`attachment-${idx}`} loading="lazy" />
            ))}
          </div>
        </div>
      ) : null}
      <CommentSection postId={visiblePost.id} hideLoggedOutPrompt />
    </article>
  )
}

export default SharedPostDetail
