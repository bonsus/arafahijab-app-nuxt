<script setup lang="ts">
import { Hash, ChevronDown, ChevronRight, Info } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()
const toast = useToast()

const saving = ref(false)
const loading = ref(false)

// Format tokens
const formatTokens = [
  { label: 'YYYY', value: '{YYYY}', desc: 'Tahun 4 digit (2026)' },
  { label: 'YY', value: '{YY}', desc: 'Tahun 2 digit (26)' },
  { label: 'MM', value: '{MM}', desc: 'Bulan (01-12)' },
  { label: 'DD', value: '{DD}', desc: 'Tanggal (01-31)' },
  { label: 'NO', value: '{NO}', desc: 'Nomor urut otomatis' },
]

interface TransactionField {
  key: string
  label: string
  default: string
}

interface TransactionGroup {
  key: string
  label: string
  fields: TransactionField[]
}

const groups: TransactionGroup[] = [
  {
    key: 'penjualan',
    label: 'Penjualan',
    fields: [
      { key: 'sales_order', label: 'Nomor Order', default: 'SO{YY}{NO}' },
      { key: 'sales_payment', label: 'Nomor Pembayaran', default: 'SP{YY}{NO}' },
      { key: 'sales_return', label: 'Nomor Retur', default: 'SR{YY}{NO}' },
      { key: 'sales_refund', label: 'Nomor Refund', default: 'SRF{YY}{NO}' },
      { key: 'sales_non_sales', label: 'Penjualan Non-Sales', default: 'NS{YY}{NO}' },
    ],
  },
  {
    key: 'pembelian',
    label: 'Pembelian',
    fields: [
      { key: 'purchase_order', label: 'Purchase Order', default: 'PO{YY}{NO}' },
      { key: 'purchase_payment', label: 'Pembayaran PO', default: 'PP{YY}{NO}' },
      { key: 'purchase_receipt', label: 'Penerimaan', default: 'PR{YY}{NO}' },
      { key: 'purchase_receipt_payment', label: 'Penerimaan Pembayaran', default: 'PRP{YY}{NO}' },
      { key: 'purchase_return', label: 'Retur', default: 'PTR{YY}{NO}' },
      { key: 'purchase_refund', label: 'Refund', default: 'PRF{YY}{NO}' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    fields: [
      { key: 'stock_adjustment', label: 'Stock Adjustment', default: 'SA{YY}{NO}' },
      { key: 'stock_conversion', label: 'Conversion Stock', default: 'SC{YY}{NO}' },
      { key: 'stock_transfer', label: 'Transfer Stock', default: 'ST{YY}{NO}' },
      { key: 'stock_opname', label: 'Stock Opname', default: 'SOP{YY}{NO}' },
    ],
  },
  {
    key: 'other',
    label: 'Transaksi Lain',
    fields: [
      { key: 'income', label: 'Income', default: 'INC{YY}{NO}' },
      { key: 'expense', label: 'Expense', default: 'EXP{YY}{NO}' },
    ],
  },
]

// Form values keyed by field key
const form = reactive<Record<string, string>>({})
const expandedGroups = reactive<Record<string, boolean>>({})

// Initialize defaults
groups.forEach((g) => {
  expandedGroups[g.key] = true
  g.fields.forEach((f) => {
    form[f.key] = f.default
  })
})

const errors = reactive<Record<string, string>>({})

function getPreview(format: string): string {
  const now = new Date()
  return format
    .replace('{YYYY}', String(now.getFullYear()))
    .replace('{YY}', String(now.getFullYear()).slice(-2))
    .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{DD}', String(now.getDate()).padStart(2, '0'))
    .replace('{NO}', '00001')
}

const allTokens = ['{YYYY}', '{YY}', '{MM}', '{DD}', '{NO}']

function getPrefix(value: string): string {
  // prefix = everything before the first token
  let firstIdx = value.length
  for (const t of allTokens) {
    const idx = value.indexOf(t)
    if (idx !== -1 && idx < firstIdx) firstIdx = idx
  }
  return value.slice(0, firstIdx)
}

function validate(): boolean {
  let valid = true
  groups.forEach((g) => {
    g.fields.forEach((f) => {
      const val = form[f.key] || ''
      const prefix = getPrefix(val)
      if (!prefix) {
        errors[f.key] = 'Harus diawali dengan prefix (contoh: SO, PO, dll)'
        valid = false
      } else if (!val.endsWith('{NO}')) {
        errors[f.key] = 'Harus diakhiri dengan {NO}'
        valid = false
      } else {
        errors[f.key] = ''
      }
    })
  })
  return valid
}

function insertToken(fieldKey: string, token: string) {
  form[fieldKey] = (form[fieldKey] || '') + token
}

async function fetchSettings() {
  loading.value = true
  try {
    const res = await api.get<{ data: Record<string, string> }>('/options/transaction-number')
    const values = res.data || {}
    Object.keys(form).forEach((key) => {
      if (key in values && values[key]) {
        form[key] = values[key]
      }
    })
  }
  catch {
    // Not saved yet — use defaults
  }
  finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!validate()) {
    toast.error('Format tidak valid, periksa kembali')
    return
  }
  saving.value = true
  try {
    await api.put('/options/transaction-number', { value: { ...form } })
    toast.success('Format nomor transaksi berhasil disimpan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Nomor Transaksi</h1>
        <p class="mt-1 text-sm text-gray-500">Atur format penomoran otomatis untuk setiap jenis transaksi</p>
      </div>
      <button
        :disabled="saving"
        class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSave"
      >
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <!-- Format guide -->
    <div class="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
      <div class="flex items-start gap-3">
        <Info class="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div>
          <p class="text-sm font-medium text-blue-900">Format yang tersedia</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="t in formatTokens"
              :key="t.value"
              class="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-mono text-blue-800"
            >
              {{ t.value }}
              <span class="font-sans text-blue-600">{{ t.desc }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="h-5 w-32 rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div v-for="j in 3" :key="j" class="flex items-center gap-4">
            <div class="h-4 w-40 rounded bg-gray-200" />
            <div class="h-9 flex-1 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>

    <!-- Groups -->
    <div v-else class="space-y-4">
      <div
        v-for="group in groups"
        :key="group.key"
        class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
      >
        <!-- Group header -->
        <button
          class="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-gray-50"
          @click="expandedGroups[group.key] = !expandedGroups[group.key]"
        >
          <component
            :is="expandedGroups[group.key] ? ChevronDown : ChevronRight"
            class="h-4 w-4 text-gray-400"
          />
          <Hash class="h-4 w-4 text-primary-500" />
          <span class="text-sm font-semibold text-gray-900">{{ group.label }}</span>
          <span class="text-xs text-gray-400">({{ group.fields.length }} format)</span>
        </button>

        <!-- Fields -->
        <div v-show="expandedGroups[group.key]" class="border-t border-gray-100 px-6 py-4">
          <div class="space-y-4">
            <div v-for="field in group.fields" :key="field.key">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label class="w-48 shrink-0 text-sm font-medium text-gray-700">
                  {{ field.label }}
                </label>
                <div class="flex-1">
                  <div class="flex gap-2">
                    <input
                      v-model="form[field.key]"
                      type="text"
                      :class="[
                        'w-full rounded-lg border px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2',
                        errors[field.key]
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
                      ]"
                      :placeholder="field.default"
                      @input="errors[field.key] = ''"
                    />
                  </div>
                  <p v-if="errors[field.key]" class="mt-1 text-xs text-red-500">{{ errors[field.key] }}</p>
                  <!-- Token buttons -->
                  <div class="mt-1.5 flex flex-wrap gap-1">
                    <button
                      v-for="t in formatTokens"
                      :key="t.value"
                      type="button"
                      class="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                      @click="insertToken(field.key, t.value)"
                    >
                      {{ t.value }}
                    </button>
                  </div>
                  <!-- Preview -->
                  <p class="mt-1 text-xs text-gray-400">
                    Preview: <span class="font-mono text-gray-600">{{ getPreview(form[field.key] || field.default) }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
