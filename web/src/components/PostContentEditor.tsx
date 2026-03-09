import { mergeAttributes } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import {
  buildImageTagFromInput,
  normalizePortableContentForStorage,
  renderPortableContent,
} from '../lib/pocketbase'

export type EditorMode = 'source' | 'rich'

export type PostContentEditorHandle = {
  insertHtml: (html: string) => void
}

const PortableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: 'max-width:100%;height:auto;',
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) =>
          attributes.style ? { style: String(attributes.style) } : {},
      },
      'data-pb-collection': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-pb-collection'),
        renderHTML: (attributes) =>
          attributes['data-pb-collection']
            ? { 'data-pb-collection': String(attributes['data-pb-collection']) }
            : {},
      },
      'data-pb-record': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-pb-record'),
        renderHTML: (attributes) =>
          attributes['data-pb-record']
            ? { 'data-pb-record': String(attributes['data-pb-record']) }
            : {},
      },
      'data-pb-file': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-pb-file'),
        renderHTML: (attributes) =>
          attributes['data-pb-file']
            ? { 'data-pb-file': String(attributes['data-pb-file']) }
            : {},
      },
      'data-pb-thumb': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-pb-thumb'),
        renderHTML: (attributes) =>
          attributes['data-pb-thumb']
            ? { 'data-pb-thumb': String(attributes['data-pb-thumb']) }
            : {},
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },
})

type Props = {
  value: string
  onChange: (value: string) => void
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  imageAlt?: string
}

const PostContentEditor = forwardRef<PostContentEditorHandle, Props>(
  ({ value, onChange, mode, onModeChange, imageAlt }, ref) => {
    const contentRef = useRef<HTMLTextAreaElement | null>(null)
    const selectionRef = useRef({ start: 0, end: 0 })
    const lastEmittedValueRef = useRef(value)
    const prevModeRef = useRef<EditorMode>(mode)
    const syncingEditorRef = useRef(false)

    useEffect(() => {
      lastEmittedValueRef.current = value
    }, [value])

    const editor = useEditor({
      extensions: [StarterKit, Underline, PortableImage],
      content: renderPortableContent(value),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'rich-editor__canvas',
        },
      },
      onUpdate: ({ editor }) => {
        if (syncingEditorRef.current || mode !== 'rich') return
        const next = normalizePortableContentForStorage(editor.getHTML())
        lastEmittedValueRef.current = next
        onChange(next)
      },
    })

    useEffect(() => {
      if (!editor) return
      editor.setEditable(mode === 'rich')
    }, [editor, mode])

    useEffect(() => {
      if (!editor) return

      const normalizedValue = value || '<p></p>'
      const richDisplayValue = renderPortableContent(normalizedValue)
      const enteringRich = prevModeRef.current !== 'rich' && mode === 'rich'
      const externalValueChanged = value !== lastEmittedValueRef.current

      const shouldSyncFromOutside =
        enteringRich || (mode === 'rich' && externalValueChanged && !editor.isFocused)

      if (shouldSyncFromOutside && editor.getHTML() !== richDisplayValue) {
        syncingEditorRef.current = true
        editor.commands.setContent(richDisplayValue, { emitUpdate: false })
        syncingEditorRef.current = false
        lastEmittedValueRef.current = normalizedValue
      }
      prevModeRef.current = mode
    }, [editor, mode, value])

    const syncSelection = () => {
      const el = contentRef.current
      if (!el) return
      selectionRef.current = {
        start: el.selectionStart,
        end: el.selectionEnd,
      }
    }

    const insertAtSelection = (insertText: string, selectFrom: number, selectTo: number) => {
      const el = contentRef.current
      const { start, end } = selectionRef.current
      const before = value.slice(0, start)
      const after = value.slice(end)
      const next = `${before}${insertText}${after}`
      onChange(next)
      const nextStart = start + selectFrom
      const nextEnd = start + selectTo
      selectionRef.current = { start: nextStart, end: nextEnd }
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.setSelectionRange(nextStart, nextEnd)
      })
    }

    const isSelectionInsideHtmlTag = () => {
      const { start, end } = selectionRef.current
      const beforeStart = value.lastIndexOf('<', start)
      const closeBeforeStart = value.lastIndexOf('>', start)
      const beforeEnd = value.lastIndexOf('<', end)
      const closeBeforeEnd = value.lastIndexOf('>', end)

      return beforeStart > closeBeforeStart || beforeEnd > closeBeforeEnd
    }

    const applySourceMarkup = (wrapStart: string, wrapEnd: string) => {
      if (isSelectionInsideHtmlTag()) return
      const { start, end } = selectionRef.current
      const selected = value.slice(start, end)
      const insertText = `${wrapStart}${selected || ''}${wrapEnd}`
      insertAtSelection(insertText, wrapStart.length, wrapStart.length + selected.length)
    }

    const keepEditorFocus = (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
    }

    const handleModeSwitch = (nextMode: EditorMode) => {
      if (nextMode === mode) return

      if (mode === 'rich' && editor) {
        const html = normalizePortableContentForStorage(editor.getHTML())
        lastEmittedValueRef.current = html
        onChange(html)
      }

      onModeChange(nextMode)
    }

    const insertImage = () => {
      const input = prompt('图片地址或完整 <img> 标签')
      if (!input) return
      const width = prompt('可选：宽度（px），留空自适应') || ''
      const html = buildImageTagFromInput(input, { width, alt: imageAlt || '' })
      if (mode === 'rich' && editor) {
        editor.chain().focus().insertContent(html).run()
        return
      }
      if (isSelectionInsideHtmlTag()) return
      insertAtSelection(html, html.length, html.length)
    }

    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        if (mode === 'rich' && editor) {
          editor.chain().focus().insertContent(html).run()
          return
        }
        if (isSelectionInsideHtmlTag()) return
        insertAtSelection(html, html.length, html.length)
      },
    }))

    return (
      <div className="full content-editor-panel">
        <div className="content-editor__head">
          <span className="content-editor__label">正文编辑</span>
          <div className="editor-mode-switch" role="tablist" aria-label="编辑模式">
            <button
              type="button"
              className={mode === 'rich' ? 'pill active' : 'pill'}
              onClick={() => handleModeSwitch('rich')}
            >
              富文本模式
            </button>
            <button
              type="button"
              className={mode === 'source' ? 'pill active' : 'pill'}
              onClick={() => handleModeSwitch('source')}
            >
              HTML 源码模式
            </button>
          </div>
        </div>
        {mode === 'rich' ? (
          <div className="editor-surface rich-surface">
            <div className="editor-surface__meta">
              <strong>富文本模式</strong>
              <span className="muted">像常见博客后台一样直接编辑段落、标题、引用和图片。</span>
            </div>
            <div className="editor-toolbar rich-toolbar">
              <button
                type="button"
                className={editor?.isActive('bold') ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                加粗
              </button>
              <button
                type="button"
                className={editor?.isActive('italic') ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                斜体
              </button>
              <button
                type="button"
                className={editor?.isActive('underline') ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                下划线
              </button>
              <button
                type="button"
                className={editor?.isActive('heading', { level: 2 }) ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </button>
              <button
                type="button"
                className={editor?.isActive('heading', { level: 3 }) ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                H3
              </button>
              <button
                type="button"
                className={editor?.isActive('blockquote') ? 'ghost-btn active' : 'ghost-btn'}
                onMouseDown={keepEditorFocus}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                引用
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={insertImage}>
                插入图片
              </button>
            </div>
            <div className="rich-editor">
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <div className="editor-surface source-surface">
            <div className="editor-surface__meta">
              <strong>HTML 源码模式</strong>
              <span className="muted">适合直接写 HTML，保留你现在的全部正文编辑习惯。</span>
            </div>
            <div className="editor-toolbar source-toolbar">
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<strong>', '</strong>')}>
                加粗
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<em>', '</em>')}>
                斜体
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<u>', '</u>')}>
                下划线
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<h2>', '</h2>')}>
                H2
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<h3>', '</h3>')}>
                H3
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<blockquote>', '</blockquote>')}>
                引用
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<span style="font-size:18px;">', '</span>')}>
                大号字
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={() => applySourceMarkup('<span style="font-size:12px;">', '</span>')}>
                小号字
              </button>
              <button type="button" className="ghost-btn" onMouseDown={keepEditorFocus} onClick={insertImage}>
                插入图片
              </button>
            </div>
            <textarea
              rows={10}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              ref={contentRef}
              onClick={syncSelection}
              onKeyUp={syncSelection}
              onSelect={syncSelection}
              onFocus={syncSelection}
            />
          </div>
        )}
      </div>
    )
  },
)

PostContentEditor.displayName = 'PostContentEditor'

export default PostContentEditor
