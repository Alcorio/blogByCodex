import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { fetchPublicShare, fetchSharedPosts } from '../api/shares'
import { formatDateTime } from '../lib/utils'
import { getFileUrl } from '../lib/pocketbase'

const PublicShare = () => {
  const { shareSlug } = useParams<{ shareSlug: string }>()

  const { data: share, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: ['public-share', shareSlug],
    queryFn: () => fetchPublicShare(shareSlug || ''),
    enabled: Boolean(shareSlug),
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['public-share-posts', share?.id, share?.posts?.join(',')],
    queryFn: () => fetchSharedPosts(share?.posts || []),
    enabled: Boolean(share?.id),
  })

  if (shareLoading || postsLoading) {
    return (
      <div className="container center">
        <Loader2 className="spin" />
      </div>
    )
  }

  if (!share || shareError) {
    return (
      <div className="container center">
        <div className="card">分享页不存在，或者尚未公开。</div>
      </div>
    )
  }

  const owner = share.expand?.owner
  const latestPostTime =
    posts?.find((post) => post.updated || post.publishedAt || post.created)?.updated ||
    posts?.find((post) => post.updated || post.publishedAt || post.created)?.publishedAt ||
    posts?.find((post) => post.updated || post.publishedAt || post.created)?.created
  const shareUpdatedAt = share.updated || share.created || latestPostTime
  const shareUpdatedLabel = formatDateTime(shareUpdatedAt)

  return (
    <section className="container stack">
      <div className="card share-hero">
        <div className="share-owner">
          <div className="avatar large">
            {owner?.profileAvatar || owner?.avatar ? (
              <img
                src={getFileUrl(owner, owner.profileAvatar || owner.avatar, '256x256')}
                alt="owner-avatar"
                className="avatar-img"
              />
            ) : (
              <span>{(owner?.username || owner?.email || '作者').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="eyebrow">Share Feed</p>
            <h1>{share.title || `${owner?.username || '作者'} 的分享页`}</h1>
            <p className="muted">{share.description || '这里汇总了作者最近公开分享的文章。'}</p>
            {owner ? (
              <p className="muted">
                作者：{owner.username || owner.email || '未知'}
                {shareUpdatedLabel ? ` · 更新于 ${shareUpdatedLabel}` : ''}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {posts?.length ? (
        <div className="post-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} href={`/u/${share.shareSlug}/post/${post.slug}`} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p className="muted">作者暂时还没有公开文章。</p>
        </div>
      )}
    </section>
  )
}

export default PublicShare
