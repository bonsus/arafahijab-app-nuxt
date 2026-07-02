<script setup lang="ts">
import {
  ArrowLeft, Upload, FileSpreadsheet, Download, X, Loader2,
  CheckCircle2, XCircle, Trash2, Truck,
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'

definePageMeta({ middleware: 'auth' })

interface ResiRow {
  order_id: string
  tracking_no: string
}

interface ResultRow {
  order_id: string
  tracking_no: string
  success: boolean
  message: string
}

const api = useApi()
const toast = useToast()

// Step: 1 = upload, 2 = preview, 3 = result
const step = ref<1 | 2 | 3>(1)

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const parseError = ref('')
const rows = ref<ResiRow[]>([])

const saving = ref(false)
const results = ref<ResultRow[]>([])

const successCount = computed(() => results.value.filter(r => r.success).length)
const failCount = computed(() => results.value.filter(r => !r.success).length)

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
      const orderCol = pickColumn(first, ['order_id', 'order_no', 'no', 'nomor order', 'order'])
      const resiCol = pickColumn(first, ['tracking_no', 'resi', 'no_resi', 'nomor resi', 'tracking'])

      if (!orderCol || !resiCol) {
        parseError.value = 'Kolom wajib tidak ditemukan. Pastikan ada kolom order_id dan resi / tracking_no'
        return
      }

      const parsed: ResiRow[] = []
      for (const row of raw) {
        const orderId = String(row[orderCol] ?? '').trim()
        const trackingNo = String(row[resiCol] ?? '').trim()
        if (!orderId) continue
        parsed.push({ order_id: orderId, tracking_no: trackingNo })
      }

      if (!parsed.length) {
        parseError.value = 'Tidak ada data order yang valid'
        return
      }

      rows.value = parsed
      step.value = 2
    }
    catch (err: any) {
      parseError.value = err?.message || 'Gagal membaca file Excel'
    }
  }
  reader.readAsArrayBuffer(file)
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

function resetAll() {
  selectedFile.value = null
  parseError.value = ''
  rows.value = []
  results.value = []
  step.value = 1
}

// ─── Step 2: Save ─────────────────────────────────────────────────────────────
async function handleSave() {
  const payload = rows.value
    .filter(r => r.order_id && r.tracking_no)
    .map(r => ({ order_id: r.order_id, tracking_no: r.tracking_no }))

  if (!payload.length) {
    toast.error('Tidak ada data resi yang valid untuk disimpan')
    return
  }

  saving.value = true
  try {
    const res = await api.post<{ data: ResultRow[]; message: string }>(
      '/sales/orders/change-resi-mass',
      payload,
    )
    results.value = res.data || []
    step.value = 3
    toast.success(res.message || 'Resi berhasil diperbarui')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah resi')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/sales/order"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Import Resi Massal</h1>
        <p class="text-sm text-gray-500">Unggah file Excel untuk memperbarui nomor resi banyak order sekaligus.</p>
      </div>
    </div>

    <!-- Step indicator -->
    <div class="flex items-center gap-2 text-xs font-medium">
      <span :class="step >= 1 ? 'text-primary-600' : 'text-gray-400'">1. Unggah File</span>
      <span class="text-gray-300">/</span>
      <span :class="step >= 2 ? 'text-primary-600' : 'text-gray-400'">2. Tinjau Data</span>
      <span class="text-gray-300">/</span>
      <span :class="step >= 3 ? 'text-primary-600' : 'text-gray-400'">3. Hasil</span>
    </div>

    <!-- STEP 1: Upload -->
    <div v-if="step === 1" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-900">Unggah File Excel</h2>
        <a
          href="/sample/update_resi_mass.xlsx"
          download
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Download class="h-3.5 w-3.5" />
          Unduh Contoh
        </a>
      </div>

      <div
        class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors"
        :class="isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'"
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onFileDrop"
      >
        <Upload class="mb-3 h-10 w-10 text-gray-400" />
        <p class="text-sm font-medium text-gray-700">Klik untuk pilih file atau seret ke sini</p>
        <p class="mt-1 text-xs text-gray-400">Format .xlsx atau .xls</p>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="onFileChange"
        />
      </div>

      <p v-if="parseError" class="mt-3 flex items-center gap-1.5 text-sm text-red-600">
        <XCircle class="h-4 w-4 shrink-0" />
        {{ parseError }}
      </p>

      <div class="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
        <p class="font-medium">Format kolom:</p>
        <p class="mt-1">Kolom <b>order_id</b> (bisa diisi ID order atau nomor order) dan <b>tracking_no</b> (nomor resi).</p>
      </div>
    </div>

    <!-- STEP 2: Preview -->
    <div v-else-if="step === 2" class="space-y-4">
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div class="flex items-center gap-2">
            <FileSpreadsheet class="h-4 w-4 text-green-600" />
            <span class="text-sm font-medium text-gray-700">{{ selectedFile?.name }}</span>
            <span class="text-xs text-gray-400">({{ rows.length }} baris)</span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
            @click="resetAll"
          >
            <X class="h-3.5 w-3.5" />
            Ganti File
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th class="w-12 px-4 py-2.5 text-left">#</th>
                <th class="px-4 py-2.5 text-left">Order ID / No</th>
                <th class="px-4 py-2.5 text-left">Nomor Resi</th>
                <th class="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in rows"
                :key="idx"
                class="border-b border-gray-100 last:border-b-0"
              >
                <td class="px-4 py-2.5 text-gray-400">{{ idx + 1 }}</td>
                <td class="px-4 py-2.5">
                  <input
                    v-model="row.order_id"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </td>
                <td class="px-4 py-2.5">
                  <div class="relative">
                    <Truck class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      v-model="row.tracking_no"
                      type="text"
                      placeholder="Nomor resi"
                      class="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>
                </td>
                <td class="px-4 py-2.5">
                  <button
                    type="button"
                    class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    @click="removeRow(idx)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="4" class="px-4 py-10 text-center text-sm text-gray-400">
                  Tidak ada data. Silakan unggah ulang file.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          @click="resetAll"
        >
          Batal
        </button>
        <button
          type="button"
          :disabled="saving || !rows.length"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSave"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan & Perbarui Resi' }}
        </button>
      </div>
    </div>

    <!-- STEP 3: Result -->
    <div v-else-if="step === 3" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-green-200">
          <CheckCircle2 class="h-4 w-4" />
          {{ successCount }} berhasil
        </div>
        <div v-if="failCount" class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          <XCircle class="h-4 w-4" />
          {{ failCount }} gagal
        </div>
      </div>

      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th class="w-12 px-4 py-2.5 text-left">#</th>
                <th class="px-4 py-2.5 text-left">Order ID / No</th>
                <th class="px-4 py-2.5 text-left">Nomor Resi</th>
                <th class="px-4 py-2.5 text-left">Status</th>
                <th class="px-4 py-2.5 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(res, idx) in results"
                :key="idx"
                class="border-b border-gray-100 last:border-b-0"
              >
                <td class="px-4 py-2.5 text-gray-400">{{ idx + 1 }}</td>
                <td class="px-4 py-2.5 font-medium text-gray-800">{{ res.order_id }}</td>
                <td class="px-4 py-2.5 font-mono text-gray-600">{{ res.tracking_no || '-' }}</td>
                <td class="px-4 py-2.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="res.success ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'"
                  >
                    <CheckCircle2 v-if="res.success" class="h-3 w-3" />
                    <XCircle v-else class="h-3 w-3" />
                    {{ res.success ? 'Berhasil' : 'Gagal' }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-gray-600">{{ res.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          @click="resetAll"
        >
          Import Lagi
        </button>
        <NuxtLink
          to="/sales/order"
          class="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Selesai
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
