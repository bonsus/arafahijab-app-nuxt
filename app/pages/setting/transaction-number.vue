<script setup lang="ts">
import { Hash, ChevronDown, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()
const toast = useToast()

const saving = ref(false)
const loading = ref(false)

interface TransactionField {
  key: string
  label: string
  defaultPrefix: string
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
      { key: 'sales_order', label: 'Nomor Order', defaultPrefix: 'SO' },
      { key: 'sales_payment', label: 'Nomor Pembayaran', defaultPrefix: 'SP' },
      { key: 'sales_return', label: 'Nomor Retur', defaultPrefix: 'SR' },
      { key: 'sales_refund', label: 'Nomor Refund', defaultPrefix: 'SRF' },
      { key: 'sales_non_sales', label: 'Penjualan Non-Sales', defaultPrefix: 'NS' },
    ],
  },
  {
    key: 'pembelian',
    label: 'Pembelian',
    fields: [
      { key: 'purchase_order', label: 'Purchase Order', defaultPrefix: 'PO' },
      { key: 'purchase_payment', label: 'Pembayaran PO', defaultPrefix: 'PP' },
      { key: 'purchase_receipt', label: 'Penerimaan', defaultPrefix: 'PR' },
      { key: 'purchase_receipt_payment', label: 'Penerimaan Pembayaran', defaultPrefix: 'PRP' },
      { key: 'purchase_return', label: 'Retur', defaultPrefix: 'PTR' },
      { key: 'purchase_refund', label: 'Refund', defaultPrefix: 'PRF' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    fields: [
      { key: 'stock_adjustment', label: 'Stock Adjustment', defaultPrefix: 'SA' },
      { key: 'stock_conversion', label: 'Conversion Stock', defaultPrefix: 'SC' },
      { key: 'stock_transfer', label: 'Transfer Stock', defaultPrefix: 'ST' },
      { key: 'stock_opname', label: 'Stock Opname', defaultPrefix: 'SOP' },
    ],
  },
  {
    key: 'other',
    label: 'Transaksi Lain',
    fields: [
      { key: 'income', label: 'Income', defaultPrefix: 'INC' },
      { key: 'expense', label: 'Expense', defaultPrefix: 'EXP' },
    ],
  },
]

interface FieldValue {
  prefix: string
  start_no: number
}

const form = reactive<Record<string, FieldValue>>({})
const expandedGroups = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string>>({})

// Initialize defaults
groups.forEach((g) => {
  expandedGroups[g.key] = true
  g.fields.forEach((f) => {
    form[f.key] = { prefix: f.defaultPrefix, start_no: 1 }
  })
})

function getPreview(prefix: string, startNo: number): string {
  const yy = String(new Date().getFullYear()).slice(-2)
  const padded = String(startNo || 1).padStart(7, '0')
  return `${prefix || '??'}${yy}${padded}`
}

async function fetchSettings() {
  loading.value = true
  try {
    const res = await api.get<{ data: Record<string, any> }>('/options/transaction-number')
    const values = (res.data as any)?.value ?? res.data ?? {}
    Object.keys(form).forEach((key) => {
      const val = values[key]
      if (!val) return
      if (typeof val === 'object' && 'prefix' in val) {
        form[key]!.prefix = val.prefix ?? form[key]!.prefix
        form[key]!.start_no = Number(val.start_no) || 1
      }
      // legacy: if stored as string like 'SO{YY}{NO}', extract prefix
      else if (typeof val === 'string') {
        const match = val.match(/^([A-Z]+)/i)
        if (match) form[key]!.prefix = match[1]!.toUpperCase()
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

function validate(): boolean {
  let valid = true
  groups.forEach((g) => {
    g.fields.forEach((f) => {
      const val = form[f.key]!
      if (!val.prefix.trim()) {
        errors[f.key] = 'Prefix tidak boleh kosong'
        valid = false
      }
      else if (!/^[A-Z0-9]+$/i.test(val.prefix.trim())) {
        errors[f.key] = 'Hanya huruf dan angka'
        valid = false
      }
      else {
        errors[f.key] = ''
      }
    })
  })
  return valid
}

async function handleSave() {
  if (!validate()) {
    toast.error('Ada input yang tidak valid, periksa kembali')
    return
  }
  saving.value = true
  const payload: Record<string, FieldValue> = {}
  Object.keys(form).forEach((key) => {
    payload[key] = {
      prefix: form[key]!.prefix.trim().toUpperCase(),
      start_no: Number(form[key]!.start_no) || 1,
    }
  })
  try {
    await api.put('/options/transaction-number', { value: payload })
    toast.success('Format nomor transaksi berhasil disimpan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => fetchSettings())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Nomor Transaksi</h1>
        <p class="mt-1 text-sm text-gray-500">Atur prefix dan nomor awal untuk setiap jenis transaksi</p>
      </div>
      <button
        :disabled="saving"
        class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSave"
      >
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <!-- Format info -->
    <div class="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
      <div class="flex items-start gap-3">
        <Hash class="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div class="space-y-1.5">
          <p class="text-sm font-semibold text-blue-900">Format nomor transaksi</p>
          <div class="flex flex-wrap items-center gap-1.5 font-mono text-sm">
            <span class="rounded bg-blue-200 px-2 py-0.5 font-semibold text-blue-900">PREFIX</span>
            <span class="text-blue-400">+</span>
            <span class="rounded bg-blue-200 px-2 py-0.5 font-semibold text-blue-900">YY</span>
            <span class="text-blue-400">+</span>
            <span class="rounded bg-blue-200 px-2 py-0.5 font-semibold text-blue-900">0000001</span>
          </div>
          <p class="text-xs text-blue-600">
            Contoh: <span class="font-mono font-semibold">SO260000001</span>,
            <span class="font-mono font-semibold">PO260000001</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="h-5 w-32 rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div v-for="j in 3" :key="j" class="grid grid-cols-4 gap-4">
            <div class="h-4 rounded bg-gray-200" />
            <div class="h-9 rounded bg-gray-200" />
            <div class="h-9 rounded bg-gray-200" />
            <div class="h-4 w-28 rounded bg-gray-200" />
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
          <span class="text-xs text-gray-400">({{ group.fields.length }} nomor)</span>
        </button>

        <!-- Fields -->
        <div v-show="expandedGroups[group.key]" class="border-t border-gray-100 px-6 py-4">
          <div class="space-y-3">
            <!-- Column headers -->
            <div class="hidden grid-cols-[1fr_120px_160px_1fr] gap-4 border-b border-gray-100 pb-2 sm:grid">
              <div class="text-xs font-medium uppercase tracking-wider text-gray-400">Jenis Transaksi</div>
              <div class="text-xs font-medium uppercase tracking-wider text-gray-400">Prefix</div>
              <div class="text-xs font-medium uppercase tracking-wider text-gray-400">Mulai Nomor</div>
              <div class="text-xs font-medium uppercase tracking-wider text-gray-400">Preview</div>
            </div>

            <div
              v-for="field in group.fields"
              :key="field.key"
              class="grid grid-cols-1 gap-3 rounded-lg bg-gray-50/60 p-3 sm:grid-cols-[1fr_120px_160px_1fr] sm:items-center sm:gap-4 sm:rounded-none sm:bg-transparent sm:p-0"
            >
              <!-- Label -->
              <label class="text-sm font-medium text-gray-700">{{ field.label }}</label>

              <!-- Prefix -->
              <div>
                <input
                  v-if="form[field.key]"
                  v-model="form[field.key]!.prefix"
                  type="text"
                  maxlength="10"
                  class="w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase tracking-wider text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
                  :class="errors[field.key]
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-500/20'"
                  placeholder="SO"
                  @input="errors[field.key] = ''; if (form[field.key]) form[field.key]!.prefix = form[field.key]!.prefix.toUpperCase()"
                />
                <p v-if="errors[field.key]" class="mt-1 text-xs text-red-500">{{ errors[field.key] }}</p>
              </div>

              <!-- Start number -->
              <div>
                <input
                  v-if="form[field.key]"
                  v-model.number="form[field.key]!.start_no"
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="1"
                />
              </div>

              <!-- Preview -->
              <div class="flex items-center">
                <span class="font-mono text-sm font-medium text-gray-700">
                  {{ form[field.key] ? getPreview(form[field.key]!.prefix, form[field.key]!.start_no) : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
