import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchPosts, fetchTags } from '../api/posts'
import { pb } from '../lib/pocketbase'
import { stripHtmlToText } from '../lib/utils'
import Hero from '../components/Hero'
import PostCard from '../components/PostCard'
import SearchParamInput from '../components/SearchParamInput'
import TagPill from '../components/TagPill'

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tag = searchParams.get('tag') || undefined
  const keyword = searchParams.get('q') || ''
  const authorKeyword = searchParams.get('author') || ''

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const userId = pb.authStore.model?.id
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts', tag, userId],
    queryFn: () => fetchPosts(tag),
  })

  const gridRef = useRef<HTMLDivElement | null>(null)
  const [gridMinHeight, setGridMinHeight] = useState<number>(260)
  const filtered = useMemo(() => {
    if (!posts) return []
    const lower = keyword.toLowerCase()
    const lowerAuthor = authorKeyword.toLowerCase()

    return posts.filter((p) => {
      const matchesKeyword =
        !lower ||
        p.title.toLowerCase().includes(lower) ||
        (p.excerpt ?? '').toLowerCase().includes(lower) ||
        stripHtmlToText(p.content).toLowerCase().includes(lower)

      const matchesAuthor =
        !lowerAuthor ||
        `${p.expand?.author?.username ?? ''} ${p.expand?.author?.email ?? ''}`
          .toLowerCase()
          .includes(lowerAuthor)

      return matchesKeyword && matchesAuthor
    })
  }, [authorKeyword, keyword, posts])

  useLayoutEffect(() => {
    if (!gridRef.current || gridMinHeight > 260) return
    const rect = gridRef.current.getBoundingClientRect()
    const viewportCap = typeof window !== 'undefined' ? window.innerHeight * 0.7 : rect.height
    const clamped = Math.max(260, Math.min(rect.height, viewportCap))
    setGridMinHeight(clamped)
  }, [gridMinHeight, posts])

  const updateFilters = (next: { tag?: string; keyword?: string; authorKeyword?: string }) => {
    const params = new URLSearchParams(searchParams)

    if (next.tag !== undefined) {
      if (next.tag) params.set('tag', next.tag)
      else params.delete('tag')
    }

    if (next.keyword !== undefined) {
      if (next.keyword.trim()) params.set('q', next.keyword)
      else params.delete('q')
    }

    if (next.authorKeyword !== undefined) {
      if (next.authorKeyword.trim()) params.set('author', next.authorKeyword)
      else params.delete('author')
    }

    setSearchParams(params, { replace: true })
  }

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
            onClick={() => updateFilters({ tag: '' })}
          >
            全部
          </button>
          {tags?.map((t) => (
            <TagPill
              key={t.id}
              tag={t}
              active={t.slug === tag}
              onClick={(slug) => updateFilters({ tag: slug })}
            />
          ))}
          <div className="search-box">
            <Search size={16} />
            <SearchParamInput
              key={keyword}
              placeholder="搜索标题或内容"
              initialValue={keyword}
              onCommit={(next) => updateFilters({ keyword: next })}
            />
          </div>
          <div className="search-box">
            <Search size={16} />
            <SearchParamInput
              key={authorKeyword}
              placeholder="搜索作者"
              initialValue={authorKeyword}
              onCommit={(next) => updateFilters({ authorKeyword: next })}
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
          <div
            ref={gridRef}
            className="post-grid"
            style={{ minHeight: `${gridMinHeight}px` }}
          >
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
