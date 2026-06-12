<script setup lang="ts">
import { ArrowLeft, Loader2, Package, RotateCcw } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface UsageItem {
  id: string
  warehouse_bin_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  qty_returned?: number
  price: string
  total: string
  bin: { id: string; code: string } | null
  rack: { id: string; code: string; name: string } | null
  zone: { id: string; code: string; name: string } | null
}

interface StockUsage {
  id: string
  no: string
  date: string
  type: string
  note: string
  status: string
  warehouse_id: string
  warehouse: { id: string; name: string } | null
  items: UsageItem[]
}

interface ReturnRow {
  stock_usage_item_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty_original: number
  qty_returned: number
  qty_max: number
  price: string
  // bin source (for display)
  source_bin_label: string
  // return fields
  included: boolean
  return_qty: number | ''
  warehouse_bin_id: string
  bin_label: string
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const usageId = computed(() => route.query.usage_id as string)

const loadingUsage = ref(true)
const usage = ref<StockUsage | null>(null)
const rows = ref<ReturnRow[]>([])
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const note = ref('')

// Bin modal
const showBinModal = ref(false)
const activeBinRowIdx = ref<number | null>(null)
const activeBinId = ref('')
const activeBinLabel = ref('')

const typeLabel: Record<string, string> = {
  usage: 'Pemakaian Internal',
  damage: 'Kerusakan',
  sample: 'Sampel',
  other: 'Lainnya',
}

const includedRows = computed(() => rows.value.filter(r => r.included))

const grandTotal = computed(() =>
  includedRows.value.reduce((sum, r) => {
    const qty = r.return_qty !== '' ? Number(r.return_qty) : 0
    return sum + qty * Number(r.price || 0)
  }, 0),
)

async function loadUsage() {
  if (!usageId.value) {
    toast.error('Usage ID tidak ditemukan')
    router.push('/inventory/usage')
    return
  }
  loadingUsage.value = true
  try {
    const res = await api.get<{ data: StockUsage }>(`/inventories/stock-usages/${usageId.value}`)
    const d = res.data
    if (d.status !== 'completed') {
      toast.error('Hanya pemakaian stok berstatus Selesai yang dapat dibuat return-nya')
      router.push(`/inventory/usage/${usageId.value}`)
      return
    }
    usage.value = d
    rows.value = d.items.map(item => ({
      stock_usage_item_id: item.id,
      product_id: item.product_id,
      sku_id: item.sku_id,
      sku: item.sku,
      name: item.name,
      variants: item.variants || [],
      qty_original: Math.abs(item.qty),
      qty_returned: item.qty_returned ?? 0,
      qty_max: Math.abs(item.qty) - (item.qty_returned ?? 0),
      price: item.price,
      source_bin_label: [item.zone?.code, item.rack?.code, item.bin?.code].filter(Boolean).join(' / ') || '-',
      included: false,
      return_qty: '',
      warehouse_bin_id: '',
      bin_label: '',
    }))
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/usage')
  }
  finally {
    loadingUsage.value = false
  }
}

function openBinModal(idx: number) {
  const row = rows.value[idx]
  if (!row) return
  activeBinRowIdx.value = idx
  activeBinId.value = row.warehouse_bin_id
  activeBinLabel.value = row.bin_label
  showBinModal.value = true
}

function closeBinModal() {
  showBinModal.value = false
  activeBinRowIdx.value = null
  activeBinId.value = ''
  activeBinLabel.value = ''
}

function onBinSelect(bin: { id: string; code: string; label: string }) {
  if (activeBinRowIdx.value === null) return
  const row = rows.value[activeBinRowIdx.value]
  if (!row) return
  row.warehouse_bin_id = bin.id
  row.bin_label = bin.label
  closeBinModal()
}

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

async function handleSubmit(status: 'draft' | 'completed') {
  formErrors.value = {}

  const selected = rows.value.filter(r => r.included)
  if (!selected.length) {
    toast.error('Pilih minimal 1 item untuk diretur')
    return
  }

  const errors: Record<string, string[]> = {}
  for (const [i, row] of selected.entries()) {
    const qty = row.return_qty !== '' ? Number(row.return_qty) : 0
    if (qty <= 0) {
      errors[`items[${i}].qty`] = ['Qty harus lebih dari 0']
    }
    else if (qty > row.qty_max) {
      errors[`items[${i}].qty`] = [`Melebihi sisa yang dapat diretur (${row.qty_max})`]
    }
    if (!row.warehouse_bin_id) {
      errors[`items[${i}].warehouse_bin_id`] = ['Lokasi bin wajib dipilih']
    }
  }
  if (Object.keys(errors).length) {
    formErrors.value = errors
    toast.error('Periksa kembali isian form')
    return
  }

  saving.value = true
  try {
    await api.post('/inventories/stock-usage-returns/create', {
      stock_usage_id: usageId.value,
      note: note.value,
      status,
      items: selected.map(row => ({
        stock_usage_item_id: row.stock_usage_item_id,
        warehouse_bin_id: row.warehouse_bin_id,
        product_id: row.product_id,
        sku_id: row.sku_id,
        sku: row.sku,
        name: row.name,
        variants: row.variants.map(v => ({ label: v.name, value: v.value })),
        qty: Number(row.return_qty),
        price: row.price,
      })),
    })
    toast.success('Return berhasil dibuat')
    router.push('/inventory/usage/return')
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

onMounted(loadUsage)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/usage/return"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Buat Return Pemakaian Stok</h1>
    </div>

    <!-- Loading -->
    <div v-if="loadingUsage" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="grid gap-4 sm:grid-cols-3">
          <div v-for="i in 3" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-5 w-28 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="usage">
      <!-- Usage Reference Card -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Sumber Pemakaian</h2>
        <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
          <div>
            <dt class="text-xs text-gray-400">No. Pemakaian</dt>
            <dd class="mt-0.5 font-semibold text-primary-600">{{ usage.no }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Gudang</dt>
            <dd class="mt-0.5 text-gray-700">{{ usage.warehouse?.name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Tipe</dt>
            <dd class="mt-0.5 text-gray-700">{{ typeLabel[usage.type] || usage.type || '-' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Note -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan Return</label>
        <textarea
          v-model="note"
          rows="2"
          placeholder="Alasan atau catatan return..."
          class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <!-- Items Table -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <h2 class="text-sm font-semibold text-gray-900">
            Item Pemakaian
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {{ rows.length }}
            </span>
          </h2>
          <p class="text-xs text-gray-500">
            <span class="font-medium text-primary-600">{{ includedRows.length }}</span> item dipilih
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[900px] w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50 text-left text-nowrap">
                <th class="px-4 py-2.5 w-8" />
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28">Bin Asal</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-20 text-center">Qty Pakai</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-20 text-center">Sudah Retur</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-20 text-center">Sisa</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-center">Qty Return</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Lokasi Return</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(row, idx) in rows"
                :key="row.stock_usage_item_id"
                class="align-top"
                :class="row.qty_max <= 0 ? 'opacity-40' : ''"
              >
                <td class="px-4 py-3">
                  <input
                    v-model="row.included"
                    type="checkbox"
                    :disabled="row.qty_max <= 0"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td class="px-4 py-3">
                  <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ row.name }}</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                    <span class="font-mono text-xs font-semibold text-gray-700">{{ row.sku }}</span>
                    <span v-for="v in row.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">{{ row.source_bin_label }}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-700">{{ row.qty_original.toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-center text-sm text-amber-600">{{ row.qty_returned.toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="text-sm font-semibold" :class="row.qty_max > 0 ? 'text-green-600' : 'text-red-500'">
                    {{ row.qty_max.toLocaleString('id-ID') }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <input
                    v-if="row.included"
                    v-model.number="row.return_qty"
                    type="number"
                    :min="1"
                    :max="row.qty_max"
                    placeholder="0"
                    class="w-full rounded-lg border px-2.5 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 border-gray-200 text-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                  <span v-else class="text-xs text-gray-300">—</span>
                  <p v-if="getFieldError(`items[${includedRows.indexOf(row)}].qty`)" class="mt-1 text-[10px] text-red-500 whitespace-nowrap">
                    {{ getFieldError(`items[${includedRows.indexOf(row)}].qty`) }}
                  </p>
                </td>
                <td class="px-4 py-3">
                  <div v-if="row.included">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-xs transition-colors"
                      :class="row.warehouse_bin_id
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600'"
                      @click="openBinModal(idx)"
                    >
                      <span v-if="row.bin_label" class="font-mono">{{ row.bin_label }}</span>
                      <span v-else>Pilih Lokasi</span>
                    </button>
                    <p v-if="getFieldError(`items[${includedRows.indexOf(row)}].warehouse_bin_id`)" class="mt-1 text-[10px] text-red-500">
                      {{ getFieldError(`items[${includedRows.indexOf(row)}].warehouse_bin_id`) }}
                    </p>
                  </div>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="h-20" />
    </template>

    <!-- Sticky Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:px-6">
      <div class="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
        <p class="text-sm text-gray-500">
          <span class="font-semibold text-gray-900">{{ includedRows.length }}</span> item ·
          <span class="font-semibold text-gray-900">Rp{{ formatCurrency(grandTotal) }}</span>
        </p>
        <div class="flex gap-2">
          <NuxtLink
            to="/inventory/usage/return"
            class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Batal
          </NuxtLink>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            @click="handleSubmit('draft')"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Simpan Draft
          </button>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            @click="handleSubmit('completed')"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Simpan &amp; Selesaikan
          </button>
        </div>
      </div>
    </div>

    <!-- Bin Picker Modal -->
    <Teleport to="body">
      <div v-if="showBinModal && usage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="closeBinModal">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-base font-semibold text-gray-900">Pilih Lokasi Return</h3>
          <p class="mb-4 text-xs text-gray-500">
            {{ activeBinRowIdx !== null ? rows[activeBinRowIdx]?.name : '' }}
          </p>
          <AppBinPicker
            :warehouse-id="usage.warehouse_id"
            :model-value="activeBinId"
            @select="onBinSelect"
            @update:model-value="activeBinId = $event"
          />
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              @click="closeBinModal"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="!activeBinId"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              @click="onBinSelect({ id: activeBinId, code: '', label: activeBinLabel || activeBinId })"
            >
              Pilih
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
