import type { TagRecord } from '../types'

interface Props {
  tag: TagRecord
  onClick?: (slug: string) => void
  active?: boolean
}

const TagPill = ({ tag, onClick, active }: Props) => {
  const style = tag.color ? { borderColor: tag.color, color: tag.color } : undefined
  return (
    <button
      type="button"
      className={active ? 'tag-pill active' : 'tag-pill'}
      style={style}
      onClick={() => onClick?.(tag.slug)}
    >
      {tag.name}
    </button>
  )
}

export default TagPill
