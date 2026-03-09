import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchPosts, fetchTags } from '../api/posts'
import { pb } from '../lib/pocketbase'
import { stripHtmlToText } from '../lib/utils'
import PostCard from '../components/PostCard'
import SearchParamInput from '../components/SearchParamInput'
import TagPill from '../components/TagPill'

const Posts = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tag = searchParams.get('tag') || undefined
  const keyword = searchParams.get('q') || ''
  const authorKeyword = searchParams.get('author') || ''
  const sortOrder = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest'
  const dateFrom = searchParams.get('from') || ''
  const dateTo = searchParams.get('to') || ''
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [gridMinHeight, setGridMinHeight] = useState<number>(260)

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const userId = pb.authStore.model?.id
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts-page', tag, userId],
    queryFn: () => fetchPosts(tag),
  })

  const filtered = useMemo(() => {
    if (!posts) return []
    const lower = keyword.toLowerCase()
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null

    const result = posts
      .filter((p) => {
        if (
          lower &&
          !(
            p.title.toLowerCase().includes(lower) ||
            (p.excerpt ?? '').toLowerCase().includes(lower) ||
            stripHtmlToText(p.content).toLowerCase().includes(lower)
          )
        ) {
          return false
        }
        if (
          authorKeyword.trim() &&
          !`${p.expand?.author?.username ?? ''} ${p.expand?.author?.email ?? ''}`
            .toLowerCase()
            .includes(authorKeyword.toLowerCase())
        ) {
          return false
        }
        const dt = new Date(p.publishedAt || p.created)
        if (fromDate && dt < fromDate) return false
        if (toDate && dt > toDate) return false
        return true
      })
      .sort((a, b) => {
        const da = new Date(a.publishedAt || a.created).getTime()
        const db = new Date(b.publishedAt || b.created).getTime()
        return sortOrder === 'newest' ? db - da : da - db
      })
    return result
  }, [authorKeyword, keyword, posts, sortOrder, dateFrom, dateTo])

  useLayoutEffect(() => {
    // Capture a reasonable baseline height so empty results don't yank the page layout.
    if (!gridRef.current || gridMinHeight > 260) return
    const rect = gridRef.current.getBoundingClientRect()
    const viewportCap = typeof window !== 'undefined' ? window.innerHeight * 0.7 : rect.height
    const clamped = Math.max(260, Math.min(rect.height, viewportCap))
    setGridMinHeight(clamped)
  }, [gridMinHeight, posts])

  const updateFilters = (next: {
    tag?: string
    keyword?: string
    authorKeyword?: string
    sort?: 'newest' | 'oldest'
    from?: string
    to?: string
  }) => {
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

    if (next.sort !== undefined) {
      if (next.sort === 'newest') params.delete('sort')
      else params.set('sort', next.sort)
    }

    if (next.from !== undefined) {
      if (next.from) params.set('from', next.from)
      else params.delete('from')
    }

    if (next.to !== undefined) {
      if (next.to) params.set('to', next.to)
      else params.delete('to')
    }

    setSearchParams(params, { replace: true })
  }

  return (
    <section className="container stack" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Articles</p>
          <h2>全部文章</h2>
          <p className="muted">可按标签或关键词检索所有已发布内容。</p>
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

      <div className="filter-row compact">
        <div className="filter-chip">
          <span className="chip-label">排序</span>
          <select
            className="chip-input"
            value={sortOrder}
            onChange={(e) => updateFilters({ sort: e.target.value as 'newest' | 'oldest' })}
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
          </select>
        </div>
        <div className="filter-chip">
          <span className="chip-label">起始时间</span>
          <input
            className="chip-input"
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilters({ from: e.target.value })}
          />
        </div>
        <div className="filter-chip">
          <span className="chip-label">截止时间</span>
          <input
            className="chip-input"
            type="date"
            value={dateTo}
            onChange={(e) => updateFilters({ to: e.target.value })}
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
              <p className="muted">没有找到符合条件的文章。</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Posts
