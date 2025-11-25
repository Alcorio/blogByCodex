import { pinyin } from 'pinyin-pro'
import { format, parseISO } from 'date-fns'

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')

const slugifyWithPinyin = (value: string) => {
  const hasHan = /[\u4e00-\u9fff]/.test(value)
  if (!hasHan) return slugify(value)
  // 将中文转为无声调拼音，用短横线分隔，然后再做 slug 化处理
  const py = pinyin(value, { toneType: 'none', type: 'array', nonZh: 'spaced' }).join(' ')
  return slugify(py)
}

export const ensureSlug = (value: string) => {
  const maxLen = 120
  // 基础 slug
  let slug = slugifyWithPinyin(value)
  // 留出随机尾巴的位置
  const tail = Math.random().toString(36).slice(2, 6)
  if (slug.length > maxLen - tail.length - 1) {
    slug = slug.slice(0, maxLen - tail.length - 1)
  }
  if (slug.length < 3) slug = slug ? `${slug}-${Date.now().toString(36)}` : ''
  if (!slug) slug = `post-${Date.now().toString(36)}`
  const combined = `${slug}-${tail}`
  return combined.length > maxLen ? combined.slice(0, maxLen) : combined
}

export const parseOffsetMinutes = (offset: string | undefined) => {
  const match = offset?.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return -new Date().getTimezoneOffset()
  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2])
  const minutes = Number(match[3])
  return sign * (hours * 60 + minutes)
}

export const formatOffset = (minutes: number) => {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

export const localOffsetString = () => formatOffset(-new Date().getTimezoneOffset())

export const nowLocalInput = (offset?: string) =>
  isoToLocalInput(new Date().toISOString(), offset || localOffsetString())

export const toIsoWithOffset = (localDateTime: string, offsetStr?: string) => {
  if (!localDateTime) return ''
  const offsetMinutes = parseOffsetMinutes(offsetStr)
  const [date, time] = localDateTime.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) - offsetMinutes * 60 * 1000
  return new Date(utcMs).toISOString()
}

export const isoToLocalInput = (iso: string, offsetStr?: string) => {
  if (!iso) return ''
  const offsetMinutes = parseOffsetMinutes(offsetStr)
  const date = new Date(iso)
  const localMs = date.getTime() + offsetMinutes * 60 * 1000
  const d = new Date(localMs)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export const formatDate = (value?: string | Date | null) => {
  if (!value) return ''
  const parsed = typeof value === 'string' ? parseISO(value) : value
  return format(parsed, 'yyyy年MM月dd日')
}

export const estimateReadingMinutes = (content: string, wordsPerMinute = 180) => {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}
