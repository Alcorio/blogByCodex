import { useQuery } from '@tanstack/react-query'
import { Loader2, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyPosts } from '../api/posts'
import PostCard from '../components/PostCard'
import { useAuth } from '../providers/AuthProvider'

const MyPosts = () => {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: () => fetchMyPosts(),
    enabled: Boolean(user?.id),
  })

  if (!user) {
    return (
      <div className="container center">
        <div className="card">请先登录后查看你的文章。</div>
      </div>
    )
  }

  return (
    <section className="container stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">我的文章</p>
          <h2>草稿 / 已发布 / 已归档</h2>
        </div>
      </div>
      {isLoading ? (
        <div className="center">
          <Loader2 className="spin" />
        </div>
      ) : (
        <div className="post-grid">
          {data?.length ? (
            data.map((post) => (
              <div key={post.id} className="card">
                <PostCard post={post} />
                <div className="card-actions">
                  <Link className="text-btn" to={`/post/${post.slug}/edit`}>
                    <Pencil size={16} /> 编辑
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">
              <p className="muted">你还没有文章，去写一篇吧。</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default MyPosts
