import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createPost, fetchTags } from '../api/posts'
import {
  ensureSlug,
  localOffsetString,
  nowLocalInput,
  toIsoWithOffset,
} from '../lib/utils'
import { getFileUrl, pb } from '../lib/pocketbase'
import { useAuth } from '../providers/AuthProvider'
import type { PostFormInput, PostRecord } from '../types'

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
  const [attachmentLinks, setAttachmentLinks] = useState<
    { name: string; url: string; imgTag: string; thumb?: string }[]
  >([])
  const [createdPost, setCreatedPost] = useState<PostRecord | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const contentRegister = form.register('content', { required: true })
  const attachmentsRegister = form.register('attachments')
  const attachmentsInputRef = useRef<HTMLInputElement | null>(null)
  const slugRegister = form.register('slug', {
    required: 'slug 必填',
    minLength: { value: 3, message: '至少 3 个字符' },
    maxLength: { value: 120, message: '最多 120 个字符' },
    pattern: { value: /^[a-z0-9-]+$/, message: '仅限小写字母、数字和短横线' },
    setValueAs: (v) => ensureSlug(String(v || '')),
    onChange: () => setSlugEdited(true),
  })

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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts-page'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      setFeedback({ type: 'success', text: '保存成功，可继续编辑或退出。' })
      setCreatedPost(res)
      setAttachmentLinks(
        res.attachments?.map((file: string) => {
          const url = getFileUrl(res, file)
          return {
            name: file,
            url,
            imgTag: `<img src="${url}" alt="${res.title || ''}" />`,
            thumb: getFileUrl(res, file, '320x'),
          }
        }) ?? [],
      )
    },
    onError: (err: unknown) => {
      const message = (err as { message?: string; response?: { message?: string } })?.message
      const responseMsg = (err as { response?: { message?: string } })?.response?.message
      const msg = message || responseMsg || '保存失败，请检查必填项、slug 唯一性或上传的文件大小/格式。'
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
      if (name === 'title' && value.title && !slugEdited) {
        form.setValue('slug', ensureSlug(value.title))
      }
      if (name === 'slug' && !value.slug) {
        setSlugEdited(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, slugEdited])

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
    if (!attachmentsField || !attachmentsField.length) {
      setAttachmentsPreview([])
      return
    }

    const files = Array.from(attachmentsField)
    const maxSize = 8 * 1024 * 1024
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    const oversize = files.find((f) => f.size > maxSize)
    if (oversize) {
      setFeedback({ type: 'error', text: '插图单个文件不能超过 8MB' })
      return
    }
    const invalidType = files.find((f) => !allowedTypes.includes(f.type))
    if (invalidType) {
      setFeedback({ type: 'error', text: '仅支持 jpg、png、webp、gif 图片格式' })
      return
    }

    // If the post already exists, upload immediately (so links are available)
    if (createdPost?.id) {
      const fd = new FormData()
      attachmentLinks.forEach((item) => fd.append('attachments', item.name))
      files.forEach((file) => fd.append('attachments', file))

      pb.collection('posts')
        .update<PostRecord>(createdPost.id, fd)
        .then((res) => {
          setCreatedPost(res)
          setAttachmentLinks(
            res.attachments?.map((file: string) => {
              const url = getFileUrl(res, file)
              return {
                name: file,
                url,
                imgTag: `<img src="${url}" alt="${res.title || ''}" />`,
                thumb: getFileUrl(res, file, '320x'),
              }
            }) ?? [],
          )
          setFeedback({ type: 'success', text: '插图已上传，可复制引用链接' })
          form.resetField('attachments')
          if (attachmentsInputRef.current) {
            attachmentsInputRef.current.value = ''
          }
        })
        .catch((err: unknown) =>
          setFeedback({
            type: 'error',
            text:
              (err as { message?: string })?.message || (err as { response?: { message?: string } })?.response?.message || '插图上传失败',
          }),
        )
    } else {
      // For unsaved posts, still show previews so users know selection
      setAttachmentsPreview(files.map((f) => URL.createObjectURL(f)))
    }
  }, [attachmentLinks, attachmentsField, createdPost?.id, form])

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

  const handleCopy = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const tmp = document.createElement('textarea')
        tmp.value = text
        document.body.appendChild(tmp)
        tmp.select()
        document.execCommand('copy')
        document.body.removeChild(tmp)
      }
      setFeedback({ type: 'success', text: '已复制到剪贴板' })
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '复制失败，请手动复制'
      setFeedback({ type: 'error', text: msg })
    }
  }

  const handleRemoveAttachment = async (name: string) => {
    if (!createdPost?.id) return
    setIsRemoving(true)
    const keep = attachmentLinks.filter((item) => item.name !== name).map((item) => item.name)
    const fd = new FormData()
    if (keep.length) {
      keep.forEach((n) => fd.append('attachments', n))
    } else {
      fd.append('attachments', '')
    }
    try {
      const res = await pb.collection<PostRecord>('posts').update(createdPost.id, fd)
      setCreatedPost(res)
      setAttachmentLinks(
        res.attachments?.map((file: string) => {
          const url = getFileUrl(res, file)
          return {
            name: file,
            url,
            imgTag: `<img src="${url}" alt="${res.title || ''}" />`,
            thumb: getFileUrl(res, file, '320x'),
          }
        }) ?? [],
      )
      setFeedback({ type: 'success', text: '已删除附件' })
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '删除失败'
      setFeedback({ type: 'error', text: msg })
    } finally {
      setIsRemoving(false)
    }
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
          <input placeholder="url-slug" {...slugRegister} />
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
          <input
            type="file"
            accept="image/*"
            multiple
            {...attachmentsRegister}
            ref={(el) => {
              attachmentsRegister.ref(el)
              attachmentsInputRef.current = el
            }}
          />
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
          {createdPost && attachmentLinks.length ? (
            <div className="attachment-list">
              {attachmentLinks.map((item, idx) => (
                <div key={idx} className="attachment-item row">
                  <div className="thumb small">
                    {item.thumb ? <img src={item.thumb} alt={item.name} /> : null}
                  </div>
                  <div className="attachment-meta">
                    <div className="muted">{item.name}</div>
                    <div className="attachment-actions">
                      <input
                        readOnly
                        value={item.url}
                        onFocus={(e) => e.target.select()}
                        aria-label="图片URL"
                      />
                      <button
                        type="button"
                        className="ghost-btn copy-btn"
                        onClick={() => handleCopy(item.url)}
                      >
                        复制
                      </button>
                      <button
                        type="button"
                        className="ghost-btn copy-btn"
                        disabled={isRemoving}
                        onClick={() => handleRemoveAttachment(item.name)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!createdPost && attachmentsPreview.length ? (
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
