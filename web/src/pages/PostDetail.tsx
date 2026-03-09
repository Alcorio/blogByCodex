import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchPostBySlug } from '../api/posts'
import CommentSection from '../components/CommentSection'
import TagPill from '../components/TagPill'
import { getFileUrl, isGifFile, renderPortableContent } from '../lib/pocketbase'
import { formatDate } from '../lib/utils'
import { useAuth } from '../providers/auth-context'

const PostDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [downloading, setDownloading] = useState<string | null>(null)
  const postMetaRef = useRef<HTMLDivElement | null>(null)
  const coverImgRef = useRef<HTMLImageElement | null>(null)

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug ?? ''),
    enabled: Boolean(slug),
  })

  useEffect(() => {
    if (location.state?.scrollTarget !== 'post-meta' || !postMetaRef.current || !post) return

    const scrollToPostMeta = () => {
      if (!postMetaRef.current) return
      const targetTop = Math.max(postMetaRef.current.offsetTop - 112, 0)
      window.scrollTo({ top: targetTop, behavior: 'instant' })
      navigate(location.pathname, { replace: true, state: null })
    }

    const coverImg = coverImgRef.current
    if (coverImg && !coverImg.complete) {
      coverImg.addEventListener('load', scrollToPostMeta, { once: true })
      return () => coverImg.removeEventListener('load', scrollToPostMeta)
    }

    const frame = requestAnimationFrame(scrollToPostMeta)
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.state, navigate, post])

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

  const coverUrl = post.cover
    ? getFileUrl(post, post.cover, isGifFile(post.cover) ? undefined : '1280x720')
    : ''
  const gallery =
    post.showAttachments && post.attachments
      ? post.attachments.map((file) => ({
          name: file,
          previewUrl: getFileUrl(post, file, isGifFile(file) ? undefined : '1280x0'),
          downloadUrl: getFileUrl(post, file),
        }))
      : []
  const contentHtml = renderPortableContent(post.content)

  const handleDownload = async (fileName: string, url: string) => {
    try {
      setDownloading(fileName)
      const res = await fetch(url)
      if (!res.ok) throw new Error('下载失败')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <article className="container post-page">
      {coverUrl ? (
        <div className="post-hero">
          <img ref={coverImgRef} src={coverUrl} alt={post.title} />
        </div>
      ) : null}
      <div className="post-meta" ref={postMetaRef}>
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
              <Link to={`/post/${post.slug}/edit`} state={{ backTo: '/posts' }}>
                编辑此文
              </Link>
            </div>
          ) : null}
        </div>
        <div className="tag-row">
          {post.expand?.tags?.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <div className="post-body card" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      {gallery.length ? (
        <div className="card gallery">
          <p className="muted">附加图片（可点击下载）</p>
          <div className="gallery-grid">
            {gallery.map((item, idx) => (
              <div key={idx}>
                <button
                  type="button"
                  className="image-button"
                  onClick={() => handleDownload(item.name, item.downloadUrl)}
                >
                  <img src={item.previewUrl} alt={`attachment-${idx}`} loading="lazy" />
                </button>
                <button
                  type="button"
                  className="ghost-btn copy-btn"
                  disabled={downloading === item.name}
                  onClick={() => handleDownload(item.name, item.downloadUrl)}
                >
                  {downloading === item.name ? '下载中' : '下载原图'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <CommentSection postId={post.id} />
    </article>
  )
}

export default PostDetail
