<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Undo2, Redo2, Heading1, Heading2, Heading3,
  RemoveFormatting, Quote,
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: props.placeholder || 'Tulis deskripsi...' }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
    },
  },
  onUpdate: () => {
    emit('update:modelValue', editor.value?.getHTML() || '')
  },
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val, { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function setLink() {
  if (!editor.value) return
  const prev = editor.value.getAttributes('link').href
  const url = window.prompt('URL', prev)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  else {
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
}

const buttons = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { icon: Bold, action: () => e.chain().focus().toggleBold().run(), active: e.isActive('bold'), title: 'Bold' },
    { icon: Italic, action: () => e.chain().focus().toggleItalic().run(), active: e.isActive('italic'), title: 'Italic' },
    { icon: UnderlineIcon, action: () => e.chain().focus().toggleUnderline().run(), active: e.isActive('underline'), title: 'Underline' },
    { icon: Strikethrough, action: () => e.chain().focus().toggleStrike().run(), active: e.isActive('strike'), title: 'Strikethrough' },
    null,
    { icon: Heading1, action: () => e.chain().focus().toggleHeading({ level: 1 }).run(), active: e.isActive('heading', { level: 1 }), title: 'Heading 1' },
    { icon: Heading2, action: () => e.chain().focus().toggleHeading({ level: 2 }).run(), active: e.isActive('heading', { level: 2 }), title: 'Heading 2' },
    { icon: Heading3, action: () => e.chain().focus().toggleHeading({ level: 3 }).run(), active: e.isActive('heading', { level: 3 }), title: 'Heading 3' },
    null,
    { icon: List, action: () => e.chain().focus().toggleBulletList().run(), active: e.isActive('bulletList'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => e.chain().focus().toggleOrderedList().run(), active: e.isActive('orderedList'), title: 'Numbered List' },
    { icon: Quote, action: () => e.chain().focus().toggleBlockquote().run(), active: e.isActive('blockquote'), title: 'Quote' },
    null,
    { icon: AlignLeft, action: () => e.chain().focus().setTextAlign('left').run(), active: e.isActive({ textAlign: 'left' }), title: 'Align Left' },
    { icon: AlignCenter, action: () => e.chain().focus().setTextAlign('center').run(), active: e.isActive({ textAlign: 'center' }), title: 'Align Center' },
    { icon: AlignRight, action: () => e.chain().focus().setTextAlign('right').run(), active: e.isActive({ textAlign: 'right' }), title: 'Align Right' },
    null,
    { icon: LinkIcon, action: setLink, active: e.isActive('link'), title: 'Link' },
    { icon: RemoveFormatting, action: () => e.chain().focus().clearNodes().unsetAllMarks().run(), active: false, title: 'Clear Formatting' },
    null,
    { icon: Undo2, action: () => e.chain().focus().undo().run(), active: false, title: 'Undo' },
    { icon: Redo2, action: () => e.chain().focus().redo().run(), active: false, title: 'Redo' },
  ]
})
</script>

<template>
  <div class="rounded-lg border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
    <!-- Toolbar -->
    <div v-if="editor" class="flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <template v-for="(btn, i) in buttons" :key="i">
        <div v-if="!btn" class="mx-0.5 w-px self-stretch bg-gray-200" />
        <button
          v-else
          type="button"
          :title="btn.title"
          class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
          :class="{ 'bg-gray-200 text-gray-900': btn.active }"
          @click="btn.action"
        >
          <component :is="btn.icon" class="h-4 w-4" />
        </button>
      </template>
    </div>

    <!-- Editor content -->
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
.tiptap p.is-editor-empty:first-child::before {
  pointer-events: none;
  float: left;
  height: 0;
  color: #9ca3af;
  content: attr(data-placeholder);
}

.tiptap {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #111827;
}

.tiptap h1 { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; }
.tiptap h2 { font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; }
.tiptap h3 { font-size: 1rem; line-height: 1.5rem; font-weight: 600; }
.tiptap ul { list-style-type: disc; padding-left: 1.25rem; }
.tiptap ol { list-style-type: decimal; padding-left: 1.25rem; }
.tiptap blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; font-style: italic; color: #4b5563; }
.tiptap a { color: #2563eb; text-decoration: underline; }
.tiptap p { margin-top: 0.25rem; margin-bottom: 0.25rem; }
</style>
