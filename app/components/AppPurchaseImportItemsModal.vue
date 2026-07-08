<script setup lang="ts">
import {
  X, Upload, Download, Loader2, Trash2, FileSpreadsheet,
  CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

export interface ImportedItem {
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  image: string
  qty: number
  price: number
  discount: number
  total: number
}

interface ParsedRow {
  sku: string
  qty: number
  price: number
  discount: number
  status: 'pending' | 'valid' | 'invalid' | 'duplicate'
  message: string
  matched?: {
    sku_id: string
    product_id: string
    name: string
    variants: { name: string; value: string }[]
    image: string
  }
}

const props = defineProps<{
  modelValue: boolean
  addedSkuIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [items: ImportedItem[]]
}>()

const api = useApi()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const parseError = ref('')
const rows = ref<ParsedRow[]>([])
const checking = ref(false)

const validCount = computed(() => rows.value.filter(r => r.status === 'valid').length)
const invalidCount = computed(() => rows.value.filter(r => r.status === 'invalid').length)
const duplicateCount = computed(() => rows.value.filter(r => r.status === 'duplicate').length)

function close() {
  emit('update:modelValue', false)
  setTimeout(resetAll, 200)
}

function resetAll() {
  selectedFile.value = null
  parseError.value = ''
  rows.value = []
  isDragging.value = false
  checking.value = false
  if (fileInput.value) fileInput.value.value = ''
}

// ─── File selection & parsing ─────────────────────────────────────────────────
function triggerFileInput() {
  fileInput.value?.click()
}

function onFileDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
  if (fileInput.value) fileInput.value.value = ''
}

function processFile(file: File) {
  const extOk = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!extOk) {
    parseError.value = 'File harus berformat .xlsx atau .xls'
    return
  }
  selectedFile.value = file
  parseError.value = ''
  parseExcel(file)
}

function pickColumn(row: Record<string, any>, candidates: string[]): string | null {
  const keys = Object.keys(row)
  for (const cand of candidates) {
    const match = keys.find(k => k.trim().toLowerCase() === cand)
    if (match) return match
  }
  return null
}

function parseExcel(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]!]
      if (!ws) throw new Error('Sheet tidak ditemukan dalam file')

      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null })
      if (!raw.length) {
        parseError.value = 'File Excel kosong atau tidak ada data'
        return
      }

      const first = raw[0]!
      const skuCol = pickColumn(first, ['sku', 'kode sku', 'kode', 'sku_code'])
      const qtyCol = pickColumn(first, ['qty', 'quantity', 'jumlah'])
      const priceCol = pickColumn(first, ['price', 'harga', 'harga_beli'])
      const discountCol = pickColumn(first, ['discount', 'diskon', 'diskon/pcs'])

      if (!skuCol) {
        parseError.value = 'Kolom "sku" tidak ditemukan dalam file'
        return
      }

      const parsed: ParsedRow[] = []
      for (const row of raw) {
        const sku = String(row[skuCol] ?? '').trim()
        if (!sku) continue
        const qty = Math.max(1, Number(qtyCol ? row[qtyCol] : 0) || 1)
        const price = Math.max(0, Number(priceCol ? row[priceCol] : 0) || 0)
        const discount = Math.max(0, Number(discountCol ? row[discountCol] : 0) || 0)
        parsed.push({ sku, qty, price, discount, status: 'pending', message: '' })
      }

      if (!parsed.length) {
        parseError.value = 'Tidak ada data SKU yang valid'
        return
      }

      rows.value = parsed
      validateRows()
    }
    catch (err: any) {
      parseError.value = err?.message || 'Gagal membaca file Excel'
    }
  }
  reader.readAsArrayBuffer(file)
}

// ─── Validate SKUs against server ─────────────────────────────────────────────
async function validateRows() {
  checking.value = true
  try {
    const uniqueSkus = [...new Set(rows.value.map(r => r.sku))]
    const skuMap = new Map<string, ParsedRow['matched']>()

    await Promise.all(uniqueSkus.map(async (sku) => {
      try {
        const res = await api.get<{ data: any }>('/products/public/index', {
          search: sku,
          search_type: 'sku',
        })
        const products = (res.data?.data || res.data || []) as any[]
        for (const product of products) {
          const match = (product.skus || []).find((s: any) => String(s.sku).trim() === sku)
          if (match) {
            skuMap.set(sku, {
              sku_id: match.sku_id,
              product_id: match.product_id,
              name: product.name,
              variants: match.variants || [],
              image: match.image || product.thumbnail || '',
            })
            break
          }
        }
      }
      catch {
        // leave unmatched
      }
    }))

    const seen = new Set<string>()
    for (const row of rows.value) {
      const matched = skuMap.get(row.sku)
      if (!matched) {
        row.status = 'invalid'
        row.message = 'SKU tidak ditemukan'
        continue
      }
      row.matched = matched
      if (props.addedSkuIds.includes(matched.sku_id) || seen.has(matched.sku_id)) {
        row.status = 'duplicate'
        row.message = 'Sudah ada di daftar'
        continue
      }
      seen.add(matched.sku_id)
      row.status = 'valid'
      row.message = 'Siap ditambahkan'
    }
  }
  finally {
    checking.value = false
  }
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

// ─── Submit ───────────────────────────────────────────────────────────────────
function handleImport() {
  const items: ImportedItem[] = rows.value
    .filter(r => r.status === 'valid' && r.matched)
    .map((r) => {
      const total = Math.max(0, (r.price - r.discount) * r.qty)
      return {
        sku_id: r.matched!.sku_id,
        product_id: r.matched!.product_id,
        sku: r.sku,
        name: r.matched!.name,
        variants: r.matched!.variants,
        image: r.matched!.image,
        qty: r.qty,
        price: r.price,
        discount: r.discount,
        total,
      }
    })

  if (!items.length) {
    toast.error('Tidak ada SKU valid untuk ditambahkan')
    return
  }

  emit('import', items)
  toast.success(`${items.length} item berhasil ditambahkan`)
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="relative flex max-h-[90vh] w-full max-w-3xl transform flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-gray-900">Import Item PO</h3>
                <p class="mt-0.5 text-xs text-gray-500">Unggah file Excel berisi daftar SKU untuk ditambahkan ke PO.</p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="close"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-6">
              <!-- Download sample -->
              <div class="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
                <div class="flex items-center gap-2.5">
                  <FileSpreadsheet class="h-5 w-5 text-green-600" />
                  <div>
                    <p class="text-sm font-medium text-gray-900">Template Excel</p>
                    <p class="text-xs text-gray-500">Kolom: sku, qty, price, discount</p>
                  </div>
                </div>
                <a
                  href="/sample/purchase_items.xlsx"
                  download
                  class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Download class="h-3.5 w-3.5" />
                  Download Sample
                </a>
              </div>

              <!-- Upload zone -->
              <div
                v-if="!rows.length"
                class="rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors"
                :class="isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300'"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="onFileDrop"
              >
                <Upload class="mx-auto h-10 w-10 text-gray-400" />
                <p class="mt-3 text-sm font-medium text-gray-700">Tarik file ke sini atau</p>
                <button
                  type="button"
                  class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                  @click="triggerFileInput"
                >
                  Pilih File
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xlsx,.xls"
                  class="hidden"
                  @change="onFileChange"
                />
                <p class="mt-3 text-xs text-gray-400">Format .xlsx atau .xls</p>
                <p v-if="parseError" class="mt-3 text-xs font-medium text-red-600">{{ parseError }}</p>
              </div>

              <!-- Preview list -->
              <div v-else>
                <!-- Summary -->
                <div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 ring-1 ring-green-200">
                    <CheckCircle2 class="h-3.5 w-3.5" /> {{ validCount }} Valid
                  </span>
                  <span v-if="duplicateCount" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 ring-1 ring-amber-200">
                    <AlertTriangle class="h-3.5 w-3.5" /> {{ duplicateCount }} Duplikat
                  </span>
                  <span v-if="invalidCount" class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-200">
                    <XCircle class="h-3.5 w-3.5" /> {{ invalidCount }} Tidak Valid
                  </span>
                  <span v-if="checking" class="inline-flex items-center gap-1 text-gray-500">
                    <Loader2 class="h-3.5 w-3.5 animate-spin" /> Memeriksa SKU...
                  </span>
                </div>

                <div class="overflow-x-auto rounded-lg ring-1 ring-gray-200">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 text-xs font-medium text-gray-500">
                      <tr>
                        <th class="px-3 py-2 text-left">SKU / Produk</th>
                        <th class="w-16 px-3 py-2 text-center">Qty</th>
                        <th class="w-28 px-3 py-2 text-right">Harga</th>
                        <th class="w-24 px-3 py-2 text-right">Diskon</th>
                        <th class="w-40 px-3 py-2 text-left">Status</th>
                        <th class="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, idx) in rows"
                        :key="idx"
                        class="border-t border-gray-100"
                      >
                        <td class="px-3 py-2">
                          <p class="font-medium text-gray-900">{{ row.sku }}</p>
                          <p v-if="row.matched" class="mt-0.5 line-clamp-1 text-xs text-gray-500">
                            {{ row.matched.name }}
                            <span v-for="v in row.matched.variants" :key="v.name" class="text-gray-400"> · {{ v.value }}</span>
                          </p>
                        </td>
                        <td class="px-3 py-2 text-center text-gray-700">{{ row.qty }}</td>
                        <td class="px-3 py-2 text-right text-gray-700 whitespace-nowrap">Rp{{ formatCurrency(row.price) }}</td>
                        <td class="px-3 py-2 text-right text-gray-700 whitespace-nowrap">Rp{{ formatCurrency(row.discount) }}</td>
                        <td class="px-3 py-2">
                          <span
                            v-if="row.status === 'valid'"
                            class="inline-flex items-center gap-1 text-xs font-medium text-green-600"
                          >
                            <CheckCircle2 class="h-3.5 w-3.5" /> {{ row.message }}
                          </span>
                          <span
                            v-else-if="row.status === 'duplicate'"
                            class="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
                          >
                            <AlertTriangle class="h-3.5 w-3.5" /> {{ row.message }}
                          </span>
                          <span
                            v-else-if="row.status === 'invalid'"
                            class="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                          >
                            <XCircle class="h-3.5 w-3.5" /> {{ row.message }}
                          </span>
                          <span v-else class="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Loader2 class="h-3.5 w-3.5 animate-spin" /> Memeriksa...
                          </span>
                        </td>
                        <td class="px-2 py-2">
                          <button
                            class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            @click="removeRow(idx)"
                          >
                            <Trash2 class="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  class="mt-3 text-xs font-medium text-primary-600 hover:underline"
                  @click="resetAll"
                >
                  Unggah file lain
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="close"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="checking || validCount === 0"
                class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleImport"
              >
                Tambahkan {{ validCount ? `(${validCount})` : '' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
