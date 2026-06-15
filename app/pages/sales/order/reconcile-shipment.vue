<script setup lang="ts">
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle,
  Loader2, RefreshCw, ChevronRight, X, Download, Info, Trash2,
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

definePageMeta({ middleware: 'auth' })

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ExcelRow {
  order_no: string
  shipping_fee: number
  cod_fee: number
  shipping_return_fee: number
  cod_disbursement: number
  status: string
}

interface ApiOrderData {
  id: string
  no: string
  date_created: string
  date_shipped?: string
  status: string
  sub_status: string
  cod: string
  subtotal: string
  shipping_total: string
  total: string
  shipping_fee: string
  shipping_return_fee: string
  cod_fee: string
  others_fee: string
  grand_total: string
  payment_total: string
  payment_status: string
  store?: {
    id: string
    shop_name: string
    source: string
  }
}

interface PreviewRow {
  order_no: string
  // Excel values
  excel_shipping_fee: number
  excel_cod_fee: number
  excel_shipping_return_fee: number
  excel_cod_disbursement: number
  excel_status: string
  // API current values
  api_data: ApiOrderData | null
  // State
  found: boolean
  rowIndex: number
  // Validation
  validationErrors: string[]
}

interface WalletItem {
  id: string
  name: string
  type: string
  balance: string
}

// ─── State ─────────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

// Step: 1=upload, 2=preview, 3=done
const step = ref<1 | 2 | 3>(1)

// Step 1 — file
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const parseError = ref('')
const parsedRows = ref<ExcelRow[]>([])

// Step 2 — check + preview
const checking = ref(false)
const previewRows = ref<PreviewRow[]>([])
const wallets = ref<WalletItem[]>([])
const selectedWalletId = ref('')
const loadingWallets = ref(false)

// Step 3 — import
const importing = ref(false)
const importProgress = ref(0)
const importTotal = ref(0)
const importResults = ref<Record<string, string>>({})
const rowImportStatus = ref<Record<string, { state: 'loading' | 'success' | 'error'; message: string }>>({})
const importDone = ref(false)

// ─── Step 1: File selection & parsing ─────────────────────────────────────────
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
  // Reset input so the same file can be re-selected
  if (fileInput.value) fileInput.value.value = ''
}

function processFile(file: File) {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const extOk = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!allowed.includes(file.type) && !extOk) {
    parseError.value = 'File harus berformat .xlsx atau .xls'
    return
  }

  selectedFile.value = file
  parseError.value = ''
  parseExcel(file)
}

function parseExcel(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]!]
      if (!ws) throw new Error('Sheet tidak ditemukan dalam file')

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null })

      if (!rows.length) {
        parseError.value = 'File Excel kosong atau tidak ada data'
        return
      }

      // Validate header columns
      const firstRow = rows[0]!
      const requiredCols = ['order_no', 'status']
      const missingCols = requiredCols.filter(c => !(c in firstRow))
      if (missingCols.length) {
        parseError.value = `Kolom wajib tidak ditemukan: ${missingCols.join(', ')}`
        return
      }

      const parsed: ExcelRow[] = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!
        const orderNo = String(row['order_no'] || '').trim()
        if (!orderNo) continue

        parsed.push({
          order_no: orderNo,
          shipping_fee: Number(row['shipping_fee']) || 0,
          cod_fee: Number(row['cod_fee']) || 0,
          shipping_return_fee: Number(row['shipping_return_fee']) || 0,
          cod_disbursement: Number(row['cod_disbursement']) || 0,
          status: String(row['status'] || '').trim().toUpperCase(),
        })
      }

      if (!parsed.length) {
        parseError.value = 'Tidak ada data order_no yang valid'
        return
      }

      parsedRows.value = parsed
    }
    catch (err: any) {
      parseError.value = err?.message || 'Gagal membaca file Excel'
    }
  }
  reader.readAsArrayBuffer(file)
}

function resetFile() {
  selectedFile.value = null
  parseError.value = ''
  parsedRows.value = []
  rowImportStatus.value = {}
  importDone.value = false
  step.value = 1
}

// ─── Step 2: Check API & preview ──────────────────────────────────────────────
async function checkAndPreview() {
  if (!parsedRows.value.length) return

  checking.value = true
  previewRows.value = []

  try {
    const nos = parsedRows.value.map(r => r.order_no)

    const res = await api.post<{ data: Record<string, ApiOrderData>; message: string }>(
      '/sales/order-payments/reconcile-shipment-check',
      { nos },
    )

    const apiMap = res.data || {}

    previewRows.value = parsedRows.value.map((row, idx) => {
      const apiData = apiMap[row.order_no] ?? null
      const errors: string[] = []

      if (!apiData) {
        errors.push('Order tidak ditemukan di sistem')
      } else {
        // Validate order status
        if (!['shipped', 'completed'].includes(apiData.status)) {
          errors.push(`Status order tidak valid (${apiData.status}), hanya shipped/completed yang diperbolehkan`)
        }
        // Validate COD disbursement
        if (row.status === 'RETURNED' && row.cod_disbursement > 0) {
          errors.push(`Status RETURNED: cod_disbursement harus 0 (saat ini Rp${formatCurrency(row.cod_disbursement)})`)
        }
        if (row.status === 'COMPLETED' && apiData.cod === 'yes' && !row.cod_disbursement) {
          errors.push('Order COD + status COMPLETED: pencairan COD (cod_disbursement) wajib diisi')
        }
        if (row.status === 'COMPLETED' && apiData.cod === 'no' && row.cod_disbursement > 0) {
          errors.push(`Order non-COD: cod_disbursement harus 0 (saat ini Rp${formatCurrency(row.cod_disbursement)})`)
        }
      }

      return {
        order_no: row.order_no,
        excel_shipping_fee: row.shipping_fee,
        excel_cod_fee: row.cod_fee,
        excel_shipping_return_fee: row.shipping_return_fee,
        excel_cod_disbursement: row.cod_disbursement,
        excel_status: row.status,
        api_data: apiData,
        found: !!apiData,
        rowIndex: idx,
        validationErrors: errors,
      }
    })

    await fetchWallets()
    step.value = 2
  }
  catch (err: any) {
    toast.error(err?.message || 'Gagal melakukan pengecekan data')
  }
  finally {
    checking.value = false
  }
}

async function fetchWallets() {
  loadingWallets.value = true
  try {
    const res = await api.get<{ data: WalletItem[] }>('/wallets/index')
    wallets.value = (res.data || [])
    if (wallets.value.length && !selectedWalletId.value) {
      selectedWalletId.value = wallets.value[0]!.id
    }
  }
  catch {
    wallets.value = []
  }
  finally {
    loadingWallets.value = false
  }
}

// ─── Derived preview stats ─────────────────────────────────────────────────────
const foundCount = computed(() => previewRows.value.filter(r => r.found).length)
const notFoundCount = computed(() => previewRows.value.filter(r => !r.found).length)
const invalidCount = computed(() => previewRows.value.filter(r => r.validationErrors.length > 0).length)
const hasValidationErrors = computed(() => previewRows.value.some(r => r.validationErrors.length > 0))

const selectedWallet = computed(() =>
  wallets.value.find(w => w.id === selectedWalletId.value) ?? null,
)

const importSuccessCount = computed(() =>
  Object.values(rowImportStatus.value).filter(v => v.state === 'success').length,
)
const importErrorCount = computed(() =>
  Object.values(rowImportStatus.value).filter(v => v.state === 'error').length,
)

function resetImport() {
  rowImportStatus.value = {}
  importDone.value = false
  importProgress.value = 0
  importTotal.value = 0
  importResults.value = {}
}

function removeRow(orderNo: string) {
  previewRows.value = previewRows.value.filter(r => r.order_no !== orderNo)
  // Also remove from parsedRows so it's excluded from the import payload
  parsedRows.value = parsedRows.value.filter(r => r.order_no !== orderNo)
}

// ─── Diff helpers ──────────────────────────────────────────────────────────────
function hasDiff(row: PreviewRow, field: 'shipping_fee' | 'shipping_return_fee' | 'cod_fee'): boolean {
  if (!row.api_data) return false
  const apiVal = Number(row.api_data[field]) || 0
  const excelVal = field === 'shipping_fee'
    ? row.excel_shipping_fee
    : field === 'cod_fee'
      ? row.excel_cod_fee
      : row.excel_shipping_return_fee
  return apiVal !== excelVal
}

// ─── Step 3: Import ─────────────────────────────────────────────────────────────
async function submitImport() {
  if (!selectedWalletId.value) {
    toast.error('Pilih wallet terlebih dahulu')
    return
  }

  const confirmed = await useConfirm().confirm({
    title: 'Konfirmasi Import',
    message: `Anda akan mengimpor ${previewRows.value.length} rekonsiliasi ongkir. Lanjutkan?`,
    confirmText: 'Ya, Import',
    cancelText: 'Batal',
  })
  if (!confirmed) return

  importing.value = true
  importResults.value = {}
  rowImportStatus.value = {}

  const payload = parsedRows.value.map(row => ({
    wallet_id: selectedWalletId.value,
    order_no: row.order_no,
    shipping_fee: row.shipping_fee,
    cod_fee: row.cod_fee,
    shipping_return_fee: row.shipping_return_fee,
    cod_disbursement: row.cod_disbursement,
    status: row.status,
  }))

  const chunkSize = 200
  const chunks: typeof payload[] = []
  for (let i = 0; i < payload.length; i += chunkSize) {
    chunks.push(payload.slice(i, i + chunkSize))
  }

  importTotal.value = chunks.length
  importProgress.value = 0

  try {
    for (const chunk of chunks) {
      // Mark chunk rows as loading
      for (const item of chunk) {
        rowImportStatus.value[item.order_no] = { state: 'loading', message: '' }
      }
      const res = await api.post<{ data: Record<string, string>; message: string }>(
        '/sales/order-payments/reconcile-shipment',
        chunk,
      )
      // Update per-row status from response
      for (const item of chunk) {
        const msg = res?.data?.[item.order_no] ?? ''
        rowImportStatus.value[item.order_no] = {
          state: msg === 'success' ? 'success' : 'error',
          message: msg === 'success' ? 'Berhasil direkonsiliasi' : msg,
        }
      }
      if (res?.data && typeof res.data === 'object') {
        Object.assign(importResults.value, res.data)
      }
      importProgress.value += 1
    }

    importDone.value = true
    toast.success(`Import selesai: ${importSuccessCount.value} berhasil, ${importErrorCount.value} gagal`)
  }
  catch (err: any) {
    // Reset any rows still loading to error
    for (const key of Object.keys(rowImportStatus.value)) {
      if (rowImportStatus.value[key]!.state === 'loading') {
        rowImportStatus.value[key] = { state: 'error', message: 'Gagal menghubungi server' }
      }
    }
    toast.error(err?.message || 'Gagal mengimport data')
  }
  finally {
    importing.value = false
  }
}

// ─── Result helpers ────────────────────────────────────────────────────────────
const successResults = computed(() =>
  Object.entries(importResults.value).filter(([, v]) => v === 'success'),
)
const errorResults = computed(() =>
  Object.entries(importResults.value).filter(([, v]) => v !== 'success'),
)

function startOver() {
  step.value = 1
  selectedFile.value = null
  parseError.value = ''
  parsedRows.value = []
  previewRows.value = []
  selectedWalletId.value = ''
  importResults.value = {}
  importProgress.value = 0
  importTotal.value = 0
  rowImportStatus.value = {}
  importDone.value = false
}

function downloadSampleFile() {
  const link = document.createElement('a')
  link.href = '/sample/recon_shipment.xlsx'
  link.download = 'sample_recon_shipment.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Rekonsiliasi Ongkir & COD</h1>
        <p class="text-sm text-gray-500">Import data rekonsiliasi ongkir dan COD disbursement dari file Excel.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        @click="downloadSampleFile"
      >
        <Download class="h-4 w-4" />
        Download Template
      </button>
    </div>

    <!-- Step Indicator -->
    <div class="rounded-xl bg-white px-6 py-4 shadow-xs ring-1 ring-gray-200">
      <ol class="flex items-center gap-0">
        <li
          v-for="(s, i) in [
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Preview & Review' },
            { num: 3, label: 'Selesai' },
          ]"
          :key="s.num"
          class="flex flex-1 items-center"
        >
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
              :class="{
                'bg-primary-600 text-white': step === s.num,
                'bg-green-500 text-white': step > s.num,
                'bg-gray-100 text-gray-500': step < s.num,
              }"
            >
              <CheckCircle2 v-if="step > s.num" class="h-5 w-5" />
              <span v-else>{{ s.num }}</span>
            </div>
            <span
              class="hidden text-sm font-medium sm:block"
              :class="{
                'text-primary-600': step === s.num,
                'text-green-600': step > s.num,
                'text-gray-400': step < s.num,
              }"
            >{{ s.label }}</span>
          </div>
          <div v-if="i < 2" class="mx-3 h-px flex-1 bg-gray-200" />
        </li>
      </ol>
    </div>

    <!-- ── Step 1: Upload ─────────────────────────────────────────────────────── -->
    <div v-if="step === 1" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-6 py-4">
        <h2 class="font-semibold text-gray-900">Upload File Excel</h2>
        <p class="mt-0.5 text-sm text-gray-500">Pilih file .xlsx yang berisi data rekonsiliasi ongkir.</p>
      </div>
      <div class="p-6 space-y-4">
        <!-- Info box -->
        <div class="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 ring-1 ring-blue-100">
          <Info class="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p class="font-medium mb-1">Format kolom yang diperlukan:</p>
            <ul class="space-y-0.5 text-xs text-blue-600">
              <li><span class="font-mono font-semibold">order_no</span> — Nomor order (wajib)</li>
              <li><span class="font-mono font-semibold">shipping_fee</span> — Biaya pengiriman</li>
              <li><span class="font-mono font-semibold">cod_fee</span> — Biaya COD</li>
              <li><span class="font-mono font-semibold">shipping_return_fee</span> — Biaya retur pengiriman</li>
              <li><span class="font-mono font-semibold">cod_disbursement</span> — Pencairan dana COD</li>
              <li><span class="font-mono font-semibold">status</span> — Status (COMPLETED / RETURNED, wajib)</li>
            </ul>
            <button
              type="button"
              class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
              @click.stop="downloadSampleFile"
            >
              <Download class="h-3.5 w-3.5" />
              Download File Contoh (.xlsx)
            </button>
          </div>
        </div>

        <!-- Drop zone -->
        <div
          class="relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors"
          :class="isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onFileDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept=".xlsx,.xls"
            @change="onFileChange"
          />
          <div
            class="flex h-16 w-16 items-center justify-center rounded-2xl"
            :class="isDragging ? 'bg-primary-100' : 'bg-gray-100'"
          >
            <FileSpreadsheet class="h-8 w-8" :class="isDragging ? 'text-primary-500' : 'text-gray-400'" />
          </div>
          <div>
            <p class="font-medium text-gray-700">
              <span class="text-primary-600">Klik untuk pilih file</span> atau drag & drop
            </p>
            <p class="mt-1 text-sm text-gray-500">Format: .xlsx atau .xls</p>
          </div>
        </div>

        <!-- Error -->
        <div v-if="parseError" class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <XCircle class="h-4 w-4 shrink-0" />
          {{ parseError }}
        </div>

        <!-- File selected + rows summary -->
        <div v-if="selectedFile && parsedRows.length" class="rounded-lg bg-green-50 px-4 py-3 ring-1 ring-green-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-5 w-5 text-green-600" />
              <div>
                <p class="text-sm font-medium text-green-800">{{ selectedFile.name }}</p>
                <p class="text-xs text-green-600">{{ parsedRows.length }} baris order ditemukan</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg p-1 text-green-500 hover:bg-green-100"
              title="Ganti file"
              @click.stop="resetFile"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Preview parsed rows mini -->
        <div v-if="parsedRows.length" class="overflow-hidden rounded-lg ring-1 ring-gray-200">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">No Order</th>
                  <th class="px-3 py-2 text-right font-medium">Ongkir</th>
                  <th class="px-3 py-2 text-right font-medium">Biaya COD</th>
                  <th class="px-3 py-2 text-right font-medium">Retur Ongkir</th>
                  <th class="px-3 py-2 text-right font-medium">Pencairan COD</th>
                  <th class="px-3 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in parsedRows.slice(0, 10)"
                  :key="i"
                  class="border-t border-gray-100"
                >
                  <td class="px-3 py-2 font-mono text-gray-800">{{ row.order_no }}</td>
                  <td class="px-3 py-2 text-right text-gray-700">{{ row.shipping_fee ? `Rp${formatCurrency(row.shipping_fee)}` : '-' }}</td>
                  <td class="px-3 py-2 text-right text-gray-700">{{ row.cod_fee ? `Rp${formatCurrency(row.cod_fee)}` : '-' }}</td>
                  <td class="px-3 py-2 text-right text-gray-700">{{ row.shipping_return_fee ? `Rp${formatCurrency(row.shipping_return_fee)}` : '-' }}</td>
                  <td class="px-3 py-2 text-right text-gray-700">{{ row.cod_disbursement ? `Rp${formatCurrency(row.cod_disbursement)}` : '-' }}</td>
                  <td class="px-3 py-2 text-center">
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                      :class="row.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                    >{{ row.status }}</span>
                  </td>
                </tr>
                <tr v-if="parsedRows.length > 10" class="border-t border-gray-100 bg-gray-50">
                  <td colspan="6" class="px-3 py-2 text-center text-gray-400">
                    +{{ parsedRows.length - 10 }} baris lainnya
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action -->
        <div class="flex justify-end">
          <button
            type="button"
            :disabled="!parsedRows.length || checking"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            @click="checkAndPreview"
          >
            <Loader2 v-if="checking" class="h-4 w-4 animate-spin" />
            <ChevronRight v-else class="h-4 w-4" />
            Cek & Lanjutkan
          </button>
        </div>
      </div>
    </div>

    <!-- ── Step 2: Preview & Review ────────────────────────────────────────────── -->
    <div v-if="step === 2" class="space-y-4">
      <!-- Summary cards -->
      <div class="grid gap-4 sm:grid-cols-4">
        <div class="rounded-xl bg-white px-5 py-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-sm text-gray-500">Total Order</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ previewRows.length }}</p>
        </div>
        <div class="rounded-xl bg-white px-5 py-4 shadow-xs ring-1 ring-green-200">
          <p class="text-sm text-green-600">Ditemukan</p>
          <p class="mt-1 text-2xl font-bold text-green-700">{{ foundCount }}</p>
        </div>
        <div class="rounded-xl bg-white px-5 py-4 shadow-xs ring-1 ring-red-200">
          <p class="text-sm text-red-500">Tidak Ditemukan</p>
          <p class="mt-1 text-2xl font-bold text-red-600">{{ notFoundCount }}</p>
        </div>
        <div class="rounded-xl bg-white px-5 py-4 shadow-xs" :class="invalidCount > 0 ? 'ring-1 ring-orange-300' : 'ring-1 ring-gray-200'">
          <p class="text-sm" :class="invalidCount > 0 ? 'text-orange-600' : 'text-gray-500'">Perlu Diperbaiki</p>
          <p class="mt-1 text-2xl font-bold" :class="invalidCount > 0 ? 'text-orange-600' : 'text-gray-400'">{{ invalidCount }}</p>
        </div>
      </div>

      <!-- Validation warning banner -->
      <div
        v-if="hasValidationErrors"
        class="flex items-start gap-3 rounded-xl bg-orange-50 px-5 py-4 ring-1 ring-orange-200"
      >
        <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
        <div class="text-sm text-orange-700">
          <p class="font-semibold">Terdapat {{ invalidCount }} order dengan masalah validasi.</p>
          <p class="mt-0.5 text-xs">Hapus order yang bermasalah sebelum melakukan import, atau perbaiki data di file Excel lalu upload ulang.</p>
        </div>
      </div>

      <!-- Wallet selection -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-6 py-4">
          <h2 class="font-semibold text-gray-900">Pilih Wallet</h2>
          <p class="mt-0.5 text-sm text-gray-500">Transaksi rekonsiliasi akan dicatat ke wallet yang dipilih.</p>
        </div>
        <div class="p-6">
          <div v-if="loadingWallets" class="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 class="h-4 w-4 animate-spin" />
            Memuat wallet...
          </div>
          <div v-else-if="!wallets.length" class="text-sm text-gray-400">Tidak ada wallet tersedia.</div>
          <div v-else class="flex flex-wrap gap-3">
            <button
              v-for="wallet in wallets"
              :key="wallet.id"
              type="button"
              class="flex flex-col items-start rounded-xl border-2 px-4 py-3 text-left transition-colors"
              :class="selectedWalletId === wallet.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'"
              @click="selectedWalletId = wallet.id"
            >
              <span class="text-sm font-semibold" :class="selectedWalletId === wallet.id ? 'text-primary-700' : 'text-gray-800'">
                {{ wallet.name }}
              </span>
              <span class="mt-0.5 text-xs text-gray-500 capitalize">{{ wallet.type }}</span>
              <span class="mt-1 text-xs font-mono" :class="selectedWalletId === wallet.id ? 'text-primary-600' : 'text-gray-600'">
                Rp{{ formatCurrency(wallet.balance) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview table -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-6 py-4">
          <h2 class="font-semibold text-gray-900">Preview Data Rekonsiliasi</h2>
          <p class="mt-0.5 text-sm text-gray-500">
            Perbandingan data dari Excel dengan data order di sistem. <span class="text-blue-600">Biru</span> = ada perubahan. <span class="text-orange-500">Oranye</span> = ada masalah validasi.
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th class="px-4 py-2.5 text-left font-medium">No Order</th>
                <th class="px-4 py-2.5 text-left font-medium">Status Order</th>
                <th class="px-4 py-2.5 text-center font-medium">Status Rekon</th>
                <th class="px-4 py-2.5 font-medium text-center" colspan="2">Ongkir</th>
                <th class="px-4 py-2.5 font-medium text-center" colspan="2">Biaya COD</th>
                <th class="px-4 py-2.5 font-medium text-center" colspan="2">Retur Ongkir</th>
                <th class="px-4 py-2.5 text-right font-medium">Pencairan COD</th>
                <th class="px-4 py-2.5" />
              </tr>
              <tr class="bg-gray-50/60">
                <th class="px-4 py-1" />
                <th class="px-4 py-1" />
                <th class="px-4 py-1" />
                <th class="px-4 py-1 text-right text-[10px] text-gray-400">Saat ini</th>
                <th class="px-4 py-1 text-right text-[10px] text-primary-500">Excel</th>
                <th class="px-4 py-1 text-right text-[10px] text-gray-400">Saat ini</th>
                <th class="px-4 py-1 text-right text-[10px] text-primary-500">Excel</th>
                <th class="px-4 py-1 text-right text-[10px] text-gray-400">Saat ini</th>
                <th class="px-4 py-1 text-right text-[10px] text-primary-500">Excel</th>
                <th class="px-4 py-1" />
                <th class="px-4 py-1" />
              </tr>
            </thead>
            <tbody>
              <template
                v-for="row in previewRows"
                :key="row.order_no"
              >
                <tr
                  class="border-t border-gray-100 transition-colors hover:bg-gray-50/50"
                  :class="{
                    'bg-green-50/50': rowImportStatus[row.order_no]?.state === 'success',
                    'bg-red-50/60': rowImportStatus[row.order_no]?.state === 'error',
                    'bg-gray-50/60': rowImportStatus[row.order_no]?.state === 'loading',
                    'bg-red-50/40': !rowImportStatus[row.order_no] && !row.found,
                    'bg-orange-50/40': !rowImportStatus[row.order_no] && row.found && row.validationErrors.length > 0,
                  }"
                >
                  <!-- Order No -->
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-1.5">
                      <XCircle v-if="row.validationErrors.length > 0" class="h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <AlertCircle v-else-if="!row.found" class="h-3.5 w-3.5 shrink-0 text-red-400" />
                      <CheckCircle2 v-else class="h-3.5 w-3.5 shrink-0 text-green-400" />
                      <span
                        class="font-mono font-medium"
                        :class="{
                          'text-orange-700': row.validationErrors.length > 0,
                          'text-red-600': !row.found && !row.validationErrors.length,
                          'text-gray-800': row.found && !row.validationErrors.length,
                        }"
                      >
                        {{ row.order_no }}
                      </span>
                    </div>
                    <p v-if="row.api_data?.store" class="mt-0.5 pl-5 text-[10px] text-gray-400">
                      {{ row.api_data.store.shop_name }}
                    </p>
                  </td>

                  <!-- Status Order -->
                  <td class="px-4 py-2.5">
                    <template v-if="row.api_data">
                      <div class="flex items-center gap-1">
                        <span class="text-gray-600">{{ row.api_data.status }}/{{ row.api_data.sub_status }}</span>
                        <span
                          v-if="row.api_data.cod === 'yes'"
                          class="rounded bg-orange-100 px-1 text-[9px] font-bold uppercase text-orange-600"
                        >COD</span>
                      </div>
                      <p class="mt-0.5 text-[10px] text-gray-400">{{ formatDateTime(row.api_data.date_shipped || row.api_data.date_created) }}</p>
                    </template>
                    <span v-else class="text-gray-300">—</span>
                  </td>

                  <!-- Status Rekon -->
                  <td class="px-4 py-2.5 text-center">
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                      :class="row.excel_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                    >{{ row.excel_status }}</span>
                  </td>

                  <!-- Ongkir: current vs excel -->
                  <td class="px-4 py-2.5 text-right text-gray-500">
                    {{ row.api_data ? `Rp${formatCurrency(row.api_data.shipping_fee)}` : '—' }}
                  </td>
                  <td
                    class="px-4 py-2.5 text-right font-medium"
                    :class="hasDiff(row, 'shipping_fee') ? 'text-blue-600' : 'text-gray-700'"
                  >
                    {{ row.excel_shipping_fee ? `Rp${formatCurrency(row.excel_shipping_fee)}` : '-' }}
                  </td>

                  <!-- COD fee: current vs excel -->
                  <td class="px-4 py-2.5 text-right text-gray-500">
                    {{ row.api_data ? `Rp${formatCurrency(row.api_data.cod_fee)}` : '—' }}
                  </td>
                  <td
                    class="px-4 py-2.5 text-right font-medium"
                    :class="hasDiff(row, 'cod_fee') ? 'text-blue-600' : 'text-gray-700'"
                  >
                    {{ row.excel_cod_fee ? `Rp${formatCurrency(row.excel_cod_fee)}` : '-' }}
                  </td>

                  <!-- Return shipping: current vs excel -->
                  <td class="px-4 py-2.5 text-right text-gray-500">
                    {{ row.api_data ? `Rp${formatCurrency(row.api_data.shipping_return_fee)}` : '—' }}
                  </td>
                  <td
                    class="px-4 py-2.5 text-right font-medium"
                    :class="hasDiff(row, 'shipping_return_fee') ? 'text-blue-600' : 'text-gray-700'"
                  >
                    {{ row.excel_shipping_return_fee ? `Rp${formatCurrency(row.excel_shipping_return_fee)}` : '-' }}
                  </td>

                  <!-- COD disbursement -->
                  <td
                    class="px-4 py-2.5 text-right font-semibold"
                    :class="row.validationErrors.some(e => e.includes('cod_disbursement')) ? 'text-orange-600' : 'text-gray-800'"
                  >
                    {{ row.excel_cod_disbursement ? `Rp${formatCurrency(row.excel_cod_disbursement)}` : '-' }}
                  </td>

                  <!-- Import status / Delete button -->
                  <td class="px-4 py-2.5 text-right">
                    <template v-if="rowImportStatus[row.order_no]">
                      <Loader2
                        v-if="rowImportStatus[row.order_no]?.state === 'loading'"
                        class="ml-auto h-3.5 w-3.5 animate-spin text-gray-400"
                      />
                      <CheckCircle2
                        v-else-if="rowImportStatus[row.order_no]?.state === 'success'"
                        class="ml-auto h-3.5 w-3.5 text-green-500"
                      />
                      <XCircle
                        v-else-if="rowImportStatus[row.order_no]?.state === 'error'"
                        class="ml-auto h-3.5 w-3.5 text-red-400"
                      />
                    </template>
                    <button
                      v-else
                      type="button"
                      class="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Hapus dari daftar"
                      @click="removeRow(row.order_no)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>

                <!-- Validation error row -->
                <tr
                  v-if="row.validationErrors.length > 0"
                  class="border-t-0"
                  :class="row.found ? 'bg-orange-50/40' : 'bg-red-50/40'"
                >
                  <td colspan="11" class="px-4 pb-2.5 pt-0">
                    <ul class="space-y-0.5 pl-5">
                      <li
                        v-for="(err, ei) in row.validationErrors"
                        :key="ei"
                        class="flex items-center gap-1.5 text-[11px] text-orange-600"
                      >
                        <AlertCircle class="h-3 w-3 shrink-0" />
                        {{ err }}
                      </li>
                    </ul>
                  </td>
                </tr>

                <!-- Import result error message row -->
                <tr
                  v-if="rowImportStatus[row.order_no]?.state === 'error'"
                  class="border-t-0 bg-red-50/60"
                >
                  <td colspan="11" class="px-4 pb-2.5 pt-0">
                    <div class="flex items-center gap-1.5 pl-5 text-[11px] text-red-600">
                      <XCircle class="h-3 w-3 shrink-0" />
                      {{ rowImportStatus[row.order_no]?.message }}
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Import done banner -->
      <div
        v-if="importDone"
        class="flex items-center gap-4 rounded-xl px-5 py-4 ring-1"
        :class="importErrorCount > 0 ? 'bg-yellow-50 ring-yellow-200' : 'bg-green-50 ring-green-200'"
      >
        <CheckCircle2
          class="h-6 w-6 shrink-0"
          :class="importErrorCount > 0 ? 'text-yellow-500' : 'text-green-500'"
        />
        <div class="flex-1 text-sm" :class="importErrorCount > 0 ? 'text-yellow-800' : 'text-green-800'">
          <p class="font-semibold">Import selesai</p>
          <p class="mt-0.5 text-xs">
            <span class="font-medium text-green-600">{{ importSuccessCount }} berhasil</span>
            <template v-if="importErrorCount > 0">
              &nbsp;·&nbsp;<span class="font-medium text-red-500">{{ importErrorCount }} gagal</span>
            </template>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="resetImport"
          >
            <RefreshCw class="h-3.5 w-3.5" />
            Import Ulang
          </button>
          <NuxtLink
            to="/sales/order"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Lihat Order
          </NuxtLink>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!importDone" class="flex items-center justify-between">
        <button
          type="button"
          :disabled="importing"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          @click="step = 1"
        >
          Kembali
        </button>
        <div class="flex flex-col items-end gap-1">
          <button
            type="button"
            :disabled="importing || !selectedWalletId || hasValidationErrors"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            :title="hasValidationErrors ? 'Selesaikan semua masalah validasi sebelum import' : ''"
            @click="submitImport"
          >
            <Loader2 v-if="importing" class="h-4 w-4 animate-spin" />
            <Upload v-else class="h-4 w-4" />
            <span v-if="importing">
              Mengimport... ({{ importProgress }}/{{ importTotal }})
            </span>
            <span v-else>
              Simpan &amp; Import ({{ previewRows.length }} order)
            </span>
          </button>
          <p v-if="hasValidationErrors" class="text-xs text-orange-500">
            Hapus {{ invalidCount }} order bermasalah terlebih dahulu
          </p>
        </div>
      </div>
    </div>

    <!-- ── Step 3: Done ────────────────────────────────────────────────────────── -->
    <div v-if="step === 3" class="space-y-4">
      <!-- Summary -->
      <div class="rounded-xl bg-white px-6 py-8 text-center shadow-xs ring-1 ring-gray-200">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 class="h-9 w-9 text-green-600" />
        </div>
        <h2 class="mt-4 text-xl font-bold text-gray-900">Import Selesai!</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ successResults.length }} order berhasil, {{ errorResults.length }} order gagal.
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            @click="startOver"
          >
            <RefreshCw class="h-4 w-4" />
            Import Lagi
          </button>
          <NuxtLink
            to="/sales/order"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            Lihat Order
          </NuxtLink>
        </div>
      </div>

      <!-- Results table -->
      <div v-if="errorResults.length" class="rounded-xl bg-white shadow-xs ring-1 ring-red-200">
        <div class="border-b border-red-100 bg-red-50 px-6 py-4">
          <h3 class="font-semibold text-red-700">Order Gagal ({{ errorResults.length }})</h3>
        </div>
        <div class="divide-y divide-red-50">
          <div
            v-for="[no, msg] in errorResults"
            :key="no"
            class="flex items-start gap-3 px-6 py-3"
          >
            <XCircle class="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <span class="font-mono text-sm font-medium text-gray-800">{{ no }}</span>
              <p class="text-xs text-red-600">{{ msg }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="successResults.length" class="rounded-xl bg-white shadow-xs ring-1 ring-green-200">
        <div class="border-b border-green-100 bg-green-50 px-6 py-4">
          <h3 class="font-semibold text-green-700">Order Berhasil ({{ successResults.length }})</h3>
        </div>
        <div class="max-h-72 overflow-y-auto divide-y divide-green-50">
          <div
            v-for="[no] in successResults"
            :key="no"
            class="flex items-center gap-3 px-6 py-2.5"
          >
            <CheckCircle2 class="h-4 w-4 shrink-0 text-green-500" />
            <span class="font-mono text-sm text-gray-700">{{ no }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
