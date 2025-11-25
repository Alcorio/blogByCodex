import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon, Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createPost, fetchTags } from '../api/posts'
import {
  ensureSlug,
  localOffsetString,
  nowLocalInput,
  toIsoWithOffset,
} from '../lib/utils'
import { useAuth } from '../providers/AuthProvider'
import type { PostFormInput } from '../types'

const defaultTz = localOffsetString()
const defaultValues: PostFormInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '<p>内容从这里开始。</p>',
  status: 'published',
  tags: [],
  publishedAt: nowLocalInput(defaultTz),
  publishedTz: defaultTz,
  readingMinutes: 3,
  cover: null,
  attachments: null,
  showAttachments: false,
}

const Dashboard = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const form = useForm<PostFormInput>({ defaultValues })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [attachmentsPreview, setAttachmentsPreview] = useState<string[]>([])
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const contentRegister = form.register('content', { required: true })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const { mutateAsync, isPending, error, isSuccess } = useMutation({
    mutationFn: (values: PostFormInput) =>
      createPost({
        ...values,
        readingMinutes: values.readingMinutes ? Number(values.readingMinutes) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts-page'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      setFeedback({ type: 'success', text: '保存成功，可继续编辑或退出。' })
    },
    onError: (err: any) => {
      const msg =
        err?.message ||
        err?.response?.message ||
        '保存失败，请检查必填项、slug 唯一性或上传的文件大小/格式。'
      setFeedback({ type: 'error', text: msg })
    },
  })

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && value.title && !form.getValues('slug')) {
        form.setValue('slug', ensureSlug(value.title))
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Cover preview + size guard
  const coverField = form.watch('cover')
  useEffect(() => {
    if (coverField && coverField[0]) {
      if (coverField[0].size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', text: '封面大小不能超过 5MB' })
        return
      }
      setCoverPreview(URL.createObjectURL(coverField[0]))
    }
  }, [coverField])

  // Attachments preview + size guard
  const attachmentsField = form.watch('attachments')
  useEffect(() => {
    if (attachmentsField && attachmentsField.length) {
      const files = Array.from(attachmentsField)
      const over = files.find((f) => f.size > 8 * 1024 * 1024)
      if (over) {
        setFeedback({ type: 'error', text: '插图单个文件不能超过 8MB' })
        return
      }
      setAttachmentsPreview(files.map((f) => URL.createObjectURL(f)))
    }
  }, [attachmentsField])

  const publishedAtValue = form.watch('publishedAt')
  const tzValue = form.watch('publishedTz')

  useEffect(() => {
    if (tzValue && !form.getValues('publishedAt')) {
      form.setValue('publishedAt', nowLocalInput(tzValue))
    }
  }, [form, tzValue])

  const onSubmit = async (values: PostFormInput) => {
    const ensuredSlug = ensureSlug(values.slug || values.title || '')
    form.setValue('slug', ensuredSlug)
    const iso = toIsoWithOffset(values.publishedAt || nowLocalInput(values.publishedTz), values.publishedTz)
    await mutateAsync({
      ...values,
      slug: ensuredSlug,
      publishedAt: iso,
    })
  }

  const applyMarkup = (wrapStart: string, wrapEnd: string) => {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = form.getValues('content') || ''
    const before = value.slice(0, start)
    const selected = value.slice(start, end)
    const after = value.slice(end)
    const next = `${before}${wrapStart}${selected || ''}${wrapEnd}${after}`
    form.setValue('content', next)
  }

  const insertImage = () => {
    const url = prompt('图片地址')
    if (!url) return
    const width = prompt('可选：宽度（px），留空自适应') || ''
    const style = width
      ? ` style="width:${width}px;max-width:100%;height:auto;"`
      : ' style="max-width:100%;height:auto;"'
    const imgTag = `<img src="${url}"${style} />`
    const value = form.getValues('content') || ''
    form.setValue('content', `${value}\n${imgTag}`)
  }

  if (!user) {
    return (
      <div className="container center" id="dashboard">
        <div className="card">
          <p className="muted">请先登录后再创建文章。</p>
        </div>
      </div>
    )
  }

  return (
    <section className="container dashboard" id="dashboard">
      {feedback ? (
        <div className={`toast ${feedback.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {feedback.text}
        </div>
      ) : null}
      <div className="section-title">
        <div>
          <p className="eyebrow">写作台</p>
          <h2>新文章</h2>
          <p className="muted">支持封面、标签、插图与定时发布。</p>
        </div>
        {isSuccess ? <span className="pill success">已保存</span> : null}
      </div>

      <form className="card form-grid" onSubmit={form.handleSubmit(onSubmit)}>
        <label>
          标题
          <input placeholder="标题" {...form.register('title', { required: '标题必填' })} />
          {form.formState.errors.title ? (
            <span className="error">{form.formState.errors.title.message as string}</span>
          ) : null}
        </label>
        <label>
          Slug
          <input
            placeholder="url-slug"
            {...form.register('slug', {
              required: 'slug 必填',
              minLength: { value: 3, message: '至少 3 个字符' },
              maxLength: { value: 120, message: '最多 120 个字符' },
              pattern: { value: /^[a-z0-9-]+$/, message: '仅限小写字母、数字和短横线' },
              setValueAs: (v) => ensureSlug(String(v || '')),
            })}
          />
          {form.formState.errors.slug ? (
            <span className="error">{form.formState.errors.slug.message as string}</span>
          ) : null}
        </label>
        <label className="full">
          摘要
          <textarea rows={2} placeholder="用于列表的简短摘要" {...form.register('excerpt')} />
        </label>
        <label className="full">
          正文 (支持 HTML)
          <div className="editor-toolbar">
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<strong>', '</strong>')}>
              加粗
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<em>', '</em>')}>
              斜体
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<u>', '</u>')}>
              下划线
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<h2>', '</h2>')}>
              H2
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<h3>', '</h3>')}>
              H3
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<blockquote>', '</blockquote>')}>
              引用
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<span style="font-size:18px;">', '</span>')}>
              大号字
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<span style="font-size:12px;">', '</span>')}>
              小号字
            </button>
            <button type="button" className="ghost-btn" onClick={insertImage}>
              插入图片
            </button>
          </div>
          <textarea
            rows={10}
            {...contentRegister}
            ref={(el) => {
              contentRef.current = el
              contentRegister.ref(el)
            }}
          />
        </label>
        <label>
          状态
          <select {...form.register('status')}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
        </label>
        <label>
          发布时间
          <div className="time-row">
            <input
              type="datetime-local"
              value={publishedAtValue}
              onChange={(e) => form.setValue('publishedAt', e.target.value)}
            />
            <select
              {...form.register('publishedTz')}
              value={tzValue}
              onChange={(e) => {
                form.setValue('publishedTz', e.target.value)
                form.setValue('publishedAt', nowLocalInput(e.target.value))
              }}
            >
              {['-12:00','-09:00','-05:00','-03:00','-02:00','00:00','+01:00','+02:00','+03:00','+05:30','+07:00','+08:00','+09:00','+10:00','+12:00','+13:00'].map((tz) => (
                <option key={tz} value={tz}>
                  UTC{tz}
                </option>
              ))}
            </select>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => form.setValue('publishedAt', nowLocalInput(tzValue))}
            >
              使用当前时间
            </button>
          </div>
        </label>
        <label>
          阅读时长(分钟)
          <input
            type="number"
            min={1}
            max={60}
            {...form.register('readingMinutes', { valueAsNumber: true })}
          />
        </label>
        <label>
          封面
          <input type="file" accept="image/*" {...form.register('cover')} />
          <p className="muted">建议 16:9，最大 5MB。</p>
          {coverPreview ? (
            <div className="cover-preview">
              <img src={coverPreview} alt="cover preview" />
            </div>
          ) : null}
        </label>
        <label className="full">
          插图（可多选）
          <input type="file" accept="image/*" multiple {...form.register('attachments')} />
          <p className="muted">
            单个不超过 8MB。正文中引用：保存后在文章详情复制图片 URL 粘贴到编辑器。
          </p>
          <label className="pill checkbox">
            <input
              type="checkbox"
              {...form.register('showAttachments')}
            />
            保存后在正文下方显示附件模块（含下载）
          </label>
          {attachmentsPreview.length ? (
            <div className="thumb-row">
              {attachmentsPreview.map((src, idx) => (
                <div key={idx} className="thumb">
                  <img src={src} alt={`att-${idx}`} />
                </div>
              ))}
            </div>
          ) : null}
        </label>
        <label className="full">
          标签
          <div className="tag-row">
            {tags?.map((tag) => (
              <label key={tag.id} className="pill checkbox">
                <input
                  type="checkbox"
                  value={tag.id}
                  {...form.register('tags')}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </label>
        {error ? (
          <div className="error full">
            {(error as Error).message}
          </div>
        ) : null}
        <div className="form-actions">
          <button className="primary-btn" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
            {isPending ? '保存中' : '保存文章'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default Dashboard
