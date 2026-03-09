import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchMyPosts } from '../api/posts'
import {
  buildDefaultShareSlug,
  buildPublicShareUrl,
  fetchMyShare,
  saveMyShare,
} from '../api/shares'
import { slugify } from '../lib/utils'
import { useAuth } from '../providers/auth-context'
import type { PostRecord, ShareRecord } from '../types'

const ShareEditor = ({
  identity,
  posts,
  share,
}: {
  identity: string
  posts: PostRecord[]
  share: ShareRecord | null
}) => {
  const queryClient = useQueryClient()
  const [shareSlug, setShareSlug] = useState(
    share?.shareSlug || buildDefaultShareSlug(identity),
  )
  const [title, setTitle] = useState(share?.title || `${identity} 的分享书架`)
  const [description, setDescription] = useState(
    share?.description || '这里会持续更新我最近想分享的文章。',
  )
  const [selectedPosts, setSelectedPosts] = useState<string[]>(share?.posts || [])
  const [active, setActive] = useState(share?.active ?? true)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const publicUrl = shareSlug ? buildPublicShareUrl(shareSlug) : ''

  const togglePost = (postId: string) => {
    setSelectedPosts((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    )
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () =>
      saveMyShare({
        id: share?.id,
        shareSlug: slugify(shareSlug),
        title,
        description,
        posts: selectedPosts,
        active,
      }),
    onSuccess: async () => {
      setFeedback({ type: 'success', text: '更新成功' })
      await queryClient.invalidateQueries({ queryKey: ['my-share'] })
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', text: (error as { message?: string }).message || '保存失败' })
    },
  })

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl)
      } else {
        const tmp = document.createElement('textarea')
        tmp.value = publicUrl
        document.body.appendChild(tmp)
        tmp.select()
        document.execCommand('copy')
        document.body.removeChild(tmp)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFeedback({ type: 'error', text: '复制失败，请手动复制链接' })
    }
  }

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  return (
    <>
      {feedback ? (
        <div className={`toast ${feedback.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="card form-grid">
        <label>
          专属路径
          <input
            value={shareSlug}
            onChange={(e) => setShareSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="alcorio-reads"
          />
        </label>
        <label>
          页面标题
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="我的分享书架"
          />
        </label>
        <label className="full">
          页面简介
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="告诉访客这里会看到什么"
          />
        </label>
        <div className="full share-toggle-row">
          <span>公开分享</span>
          <div className="pill checkbox">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>{active ? '已开启' : '已关闭'}</span>
          </div>
        </div>
        <div className="full share-url-box">
          <div>
            <p className="muted">公开链接</p>
            <code>{publicUrl || '请先填写路径'}</code>
          </div>
          <button className="ghost-btn" type="button" onClick={handleCopy} disabled={!publicUrl}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <div>
            <h3>选择要分享的文章</h3>
            <p className="muted">仅已发布文章会出现在公开页面，可多选。</p>
          </div>
          <span className="pill">{selectedPosts.length} 篇已选</span>
        </div>

        {posts.length ? (
          <div className="share-post-list">
            {posts.map((post) => {
              const checked = selectedPosts.includes(post.id)
              return (
                <label key={post.id} className={checked ? 'share-post-item active' : 'share-post-item'}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePost(post.id)}
                  />
                  <div>
                    <strong>{post.title}</strong>
                    <p className="muted">{post.excerpt || '暂无摘要'}</p>
                  </div>
                </label>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            <p className="muted">你还没有已发布文章，先去发布几篇内容。</p>
          </div>
        )}

        <div className="form-actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => mutateAsync()}
            disabled={isPending || !shareSlug.trim()}
          >
            <Share2 size={18} />
            {isPending ? '生成中...' : '保存分享页'}
          </button>
        </div>
      </div>
    </>
  )
}

const ShareCenter = () => {
  const { user } = useAuth()
  const identity = user?.username || user?.email?.split('@')[0] || 'writer'

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['share-post-options', user?.id],
    queryFn: fetchMyPosts,
    enabled: Boolean(user?.id),
  })

  const { data: share, isLoading: shareLoading } = useQuery({
    queryKey: ['my-share', user?.id],
    queryFn: fetchMyShare,
    enabled: Boolean(user?.id),
  })

  const publishedPosts = useMemo(
    () => (posts || []).filter((post) => post.status === 'published'),
    [posts],
  )

  if (!user) {
    return (
      <div className="container center">
        <div className="card">请先登录后管理分享页。</div>
      </div>
    )
  }

  return (
    <section className="container stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">分享页</p>
          <h2>生成你的专属订阅入口</h2>
          <p className="muted">选择想公开展示的已发布文章，其他人可通过专属链接持续查看。</p>
        </div>
      </div>

      {postsLoading || shareLoading ? (
        <div className="center">
          <Loader2 className="spin" />
        </div>
      ) : (
        <ShareEditor
          key={share?.id || `new-${user.id}`}
          identity={identity}
          posts={publishedPosts}
          share={share ?? null}
        />
      )}
    </section>
  )
}

export default ShareCenter
