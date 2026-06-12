<script setup lang="ts">
import { Plus, Trash2, GripVertical, Loader2, Tag } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface SourceItem {
  _key: string // local-only key for Vue
  source: string
  sort: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const saving = ref(false)
const items = ref<SourceItem[]>([])

// Inline add
const addText = ref('')
const addInputRef = ref<HTMLInputElement | null>(null)
const showAddRow = ref(false)

// Inline edit
const editingKey = ref<string | null>(null)
const editingText = ref('')

// Drag sort
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function makeKey() {
  return Math.random().toString(36).slice(2)
}

async function fetchSources() {
  loading.value = true
  try {
    const res = await api.get<{ data: SourceItem[] | null }>('/options/sales-source')
    const data = (res.data as any)?.value ?? res.data ?? []
    items.value = (Array.isArray(data) ? data : [])
      .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((d: any, i: number) => ({
        _key: makeKey(),
        source: d.source ?? '',
        sort: d.sort ?? i + 1,
      }))
  }
  catch {
    items.value = []
  }
  finally {
    loading.value = false
  }
}

function buildPayload() {
  return items.value.map((item, i) => ({
    source: item.source.trim(),
    sort: i + 1,
  }))
}

async function saveAll() {
  saving.value = true
  try {
    await api.put('/options/sales-source', { value: buildPayload() })
    toast.success('Sumber penjualan berhasil disimpan')
    // re-number sort locally
    items.value.forEach((item, i) => { item.sort = i + 1 })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

// ─── Add ──────────────────────────────────────────────────────────────────────
function openAddRow() {
  showAddRow.value = true
  addText.value = ''
  nextTick(() => addInputRef.value?.focus())
}

function commitAdd() {
  const text = addText.value.trim()
  if (!text) { cancelAdd(); return }
  items.value.push({ _key: makeKey(), source: text, sort: items.value.length + 1 })
  addText.value = ''
  nextTick(() => addInputRef.value?.focus())
}

function cancelAdd() {
  showAddRow.value = false
  addText.value = ''
}

function onAddKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitAdd() }
  if (e.key === 'Escape') cancelAdd()
}

// ─── Inline edit ──────────────────────────────────────────────────────────────
function startEdit(item: SourceItem) {
  editingKey.value = item._key
  editingText.value = item.source
}

function commitEdit(item: SourceItem) {
  const text = editingText.value.trim()
  if (text) item.source = text
  editingKey.value = null
}

function cancelEdit() {
  editingKey.value = null
}

function onEditKeydown(e: KeyboardEvent, item: SourceItem) {
  if (e.key === 'Enter') { e.preventDefault(); commitEdit(item) }
  if (e.key === 'Escape') cancelEdit()
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteItem(item: SourceItem) {
  const ok = await confirm({
    title: 'Hapus Sumber',
    message: `Hapus sumber penjualan "${item.source}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  items.value = items.value.filter(i => i._key !== item._key)
}

// ─── Drag sort ────────────────────────────────────────────────────────────────
function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

async function onDrop(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) {
    resetDrag(); return
  }
  const list = [...items.value]
  const moved = list.splice(dragIndex.value, 1)[0]
  if (!moved) { resetDrag(); return }
  list.splice(index, 0, moved)
  items.value = list
  resetDrag()
  // auto-save after reorder
  await saveAll()
}

function resetDrag() {
  dragIndex.value = null
  dragOverIndex.value = null
}

onMounted(() => fetchSources())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Sumber Penjualan</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola daftar sumber penjualan untuk order.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="saving"
          @click="openAddRow"
        >
          <Plus class="h-4 w-4" />
          Tambah
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving"
          @click="saveAll"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 5"
        :key="i"
        class="flex animate-pulse items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200"
      >
        <div class="h-4 w-4 rounded bg-gray-200" />
        <div class="h-4 flex-1 rounded bg-gray-200" />
        <div class="h-4 w-8 rounded bg-gray-200" />
      </div>
    </div>

    <template v-else>
      <!-- Empty state -->
      <div
        v-if="!items.length && !showAddRow"
        class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200"
      >
        <Tag class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada sumber penjualan</h3>
        <p class="mt-1 text-sm text-gray-500">Klik "Tambah" untuk menambahkan sumber penjualan.</p>
      </div>

      <!-- List -->
      <div v-else >
      <!-- Hint -->
        <p v-if="items.length" class="text-xs text-gray-400 mb-4">
          {{ items.length }} sumber &middot; Seret untuk mengubah urutan &middot; Klik nama untuk mengedit
        </p>

        <div class="space-y-2">
          <div
            v-for="(item, index) in items"
            :key="item._key"
            draggable="true"
            class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 transition-all"
            :class="[
              dragOverIndex === index ? 'ring-primary-400 shadow-md' : 'ring-gray-200',
              dragIndex === index ? 'opacity-40' : 'hover:shadow-md',
            ]"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index)"
            @dragend="resetDrag"
          >
            <!-- Drag handle -->
            <GripVertical class="h-5 w-5 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />

            <!-- Source name / inline edit -->
            <div class="flex-1">
              <input
                v-if="editingKey === item._key"
                v-model="editingText"
                type="text"
                class="w-full rounded-lg border border-primary-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                @blur="commitEdit(item)"
                @keydown="onEditKeydown($event, item)"
              />
              <span
                v-else
                class="cursor-pointer select-none text-sm text-gray-800 hover:text-primary-600"
                @click="startEdit(item)"
              >
                {{ item.source }}
              </span>
            </div>

            <!-- Sort badge -->
            <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
              #{{ index + 1 }}
            </span>

            <!-- Delete -->
            <button
              type="button"
              class="shrink-0 rounded-md p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Hapus"
              @click="deleteItem(item)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Inline add row -->
          <div
            v-if="showAddRow"
            class="flex items-center gap-3 rounded-xl bg-primary-50 px-4 py-3 ring-1 ring-primary-200"
          >
            <GripVertical class="h-5 w-5 shrink-0 text-primary-200" />
            <input
              ref="addInputRef"
              v-model="addText"
              type="text"
              class="flex-1 rounded-lg border border-primary-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              placeholder="Nama sumber penjualan..."
              @keydown="onAddKeydown"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
              @click="commitAdd"
            >
              Tambah
            </button>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              @click="cancelAdd"
            >
              Batal
            </button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
