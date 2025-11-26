'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Heading3, RemoveFormatting } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = '',
  disabled = false,
  className = ""
}: RichTextEditorProps) {
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-1',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && !isInternalChange.current && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
    isInternalChange.current = false
  }, [value, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-lg overflow-hidden ${disabled ? 'opacity-60 bg-gray-100' : 'bg-white'} ${className}`}>
      <style jsx global>{`
        .rich-text-editor .ProseMirror {
          outline: none;
          min-height: 100px;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #111827;
        }
        .rich-text-editor .ProseMirror p {
          margin: 0 0 0.25rem 0;
        }
        .rich-text-editor .ProseMirror h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }
        .rich-text-editor .ProseMirror h2 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }
        .rich-text-editor .ProseMirror h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }
        .rich-text-editor .ProseMirror ul,
        .rich-text-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0 0 0.5rem 0;
        }
        .rich-text-editor .ProseMirror li {
          margin: 0.125rem 0;
        }
        .rich-text-editor .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Subrayado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Lista con viñetas"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
        <button
          type="button"
          onClick={addLink}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300 ring-1 ring-gray-400' : ''}`}
          disabled={disabled}
          title="Enlace"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 rounded hover:bg-gray-200"
          disabled={disabled}
          title="Limpiar formato"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>
      <EditorContent 
        editor={editor} 
        className="p-3 min-h-[120px]"
      />
    </div>
  )
}
