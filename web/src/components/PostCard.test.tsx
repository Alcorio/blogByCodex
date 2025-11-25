import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PostCard from './PostCard'
import type { PostRecord } from '../types'

const stubPost: PostRecord = {
  id: 'post1',
  collectionId: 'posts',
  collectionName: 'posts',
  created: '2025-01-01 00:00:00Z',
  updated: '2025-01-01 00:00:00Z',
  title: '测试标题',
  slug: 'test-title',
  excerpt: '摘要内容',
  content: '<p>内容</p>',
  status: 'published',
  author: 'user1',
  publishedAt: '2025-01-01 00:00:00Z',
  tags: ['tag1'],
  expand: {
    tags: [
      {
        id: 'tag1',
        collectionId: 'tags',
        collectionName: 'tags',
        created: '',
        updated: '',
        name: '前端',
        slug: 'frontend',
      },
    ],
  },
}

describe('PostCard', () => {
  it('renders title and tag', () => {
    render(
      <MemoryRouter>
        <PostCard post={stubPost} />
      </MemoryRouter>,
    )
    expect(screen.getByText('测试标题')).toBeInTheDocument()
    expect(screen.getByText('前端')).toBeInTheDocument()
  })
})
