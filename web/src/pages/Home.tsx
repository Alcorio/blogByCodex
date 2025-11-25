import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchPosts, fetchTags } from '../api/posts'
import { pb } from '../lib/pocketbase'
import Hero from '../components/Hero'
import PostCard from '../components/PostCard'
import TagPill from '../components/TagPill'

const Home = () => {
  const [tag, setTag] = useState<string | undefined>()

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const userId = pb.authStore.model?.id
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts', tag, userId],
    queryFn: () => fetchPosts(tag),
  })

  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => {
    if (!posts) return []
    if (!keyword.trim()) return posts
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (p.excerpt ?? '').toLowerCase().includes(keyword.toLowerCase()) ||
        (p.content ?? '').toLowerCase().includes(keyword.toLowerCase()),
    )
  }, [keyword, posts])

  return (
    <>
      <Hero />
      <section id="posts" className="container stack">
        <div className="section-title">
          <div>
            <p className="eyebrow">Latest</p>
            <h2>精选文章</h2>
          </div>
        </div>

        <div className="tag-row">
          <button
            type="button"
            className={!tag ? 'tag-pill active' : 'tag-pill'}
            onClick={() => setTag(undefined)}
          >
            全部
          </button>
          {tags?.map((t) => (
            <TagPill
              key={t.id}
              tag={t}
              active={t.slug === tag}
              onClick={(slug) => setTag(slug)}
            />
          ))}
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="搜索标题或内容"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="alert error">加载文章失败：{(error as Error).message}</div>
        ) : isLoading ? (
          <div className="center">
            <Loader2 className="spin" />
          </div>
        ) : (
          <div className="post-grid">
            {filtered?.length ? (
              filtered.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="empty">
                <p className="muted">还没有文章，去控制台写一篇吧。</p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

export default Home
