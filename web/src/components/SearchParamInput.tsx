import { useState } from 'react'

type Props = {
  initialValue: string
  placeholder: string
  onCommit: (value: string) => void
}

const SearchParamInput = ({ initialValue, placeholder, onCommit }: Props) => {
  const [value, setValue] = useState(initialValue)
  const [isComposing, setIsComposing] = useState(false)

  const commit = (next: string) => {
    onCommit(next.trim())
  }

  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => commit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isComposing) {
          commit(value)
          ;(e.currentTarget as HTMLInputElement).blur()
        }
      }}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={(e) => {
        setIsComposing(false)
        setValue(e.currentTarget.value)
      }}
    />
  )
}

export default SearchParamInput
