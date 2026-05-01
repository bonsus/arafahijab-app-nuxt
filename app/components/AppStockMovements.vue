<script setup lang="ts">
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-vue-next'

interface Variant { name: string; value: string }

interface StockMovement {
  id: string
  name: string
  sku_id: string
  sku: string
  variants: Variant[]
  stock_change: number
  price: string
  total: string
  reference_type: string
  reference_id: string
  created_at: string
  updated_at: string
  zone: { id: string; name: string; code: string } | null
  rack: { id: string; name: string; code: string } | null
  bin: { id: string; code: string } | null
  warehouse: { id: string; name: string; primary: boolean } | null
}

interface PagedResponse {
  data: StockMovement[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const props = defineProps<{
  referenceId: string
}>()

const api = useApi()

const loading = ref(false)
const movements = ref<StockMovement[]>([])
const meta = ref<Omit<PagedResponse, 'data'> | null>(null)

async function fetchMovements() {
  if (!props.referenceId) return
  loading.value = true
  try {
    const res = await api.get<{ data: PagedResponse }>('/inventories/stock-movements/by-reference', {
      reference_id: props.referenceId,
    })
    movements.value = res.data.data || []
    meta.value = {
      page: res.data.page,
      per_page: res.data.per_page,
      total_page: res.data.total_page,
      total: res.data.total,
    }
  }
  catch {
    movements.value = []
    meta.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => props.referenceId, (id) => {
  if (id) fetchMovements()
}, { immediate: true })
</script>

<template>
  <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200 mt-5">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <RefreshCw class="h-4 w-4 text-gray-400" />
        Stock Movement
        <span v-if="meta" class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
          {{ meta.total }}
        </span>
      </h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="divide-y divide-gray-100">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-5 py-3">
        <div class="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-32 animate-pulse rounded bg-gray-200" />
          <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
        </div>
        <div class="h-4 w-16 animate-pulse rounded bg-gray-100" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!movements.length" class="px-5 py-10 text-center">
      <RefreshCw class="mx-auto mb-2 h-8 w-8 text-gray-200" />
      <p class="text-sm text-gray-400">Belum ada riwayat pergerakan stok</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-[640px] w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 text-left text-nowrap">
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Varian</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Gudang</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Perubahan</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Harga</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Total</th>
            <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Waktu</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="mv in movements"
            :key="mv.id"
            class="transition-colors hover:bg-gray-50/50 text-nowrap"
          >
            <!-- SKU / Produk -->
            <td class="px-4 py-3 w-8 text-nowrap">
              <p class="font-mono text-xs font-semibold text-gray-700">{{ mv.sku }}</p>
              <p class="text-xs text-gray-400 text-truncate">{{ mv.name }}</p>
            </td>
            <!-- varian -->
            <td class="px-4 py-3 text-nowrap">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="v in mv.variants"
                  :key="v.name"
                  class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                >{{ v.value }}</span>
              </div>
            </td>
            <!-- Gudang -->
            <td class="px-4 py-3 text-nowrap">
              <span v-if="mv.warehouse?.name" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {{ mv.warehouse.name }}
              </span>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
            <!-- Lokasi -->
            <td class="px-4 py-3 text-nowrap">
              <div class="flex flex-wrap items-center gap-0.5">
                <span v-if="mv.zone?.code" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {{ mv.zone.code }}
                </span>
                <span v-if="mv.rack?.code" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {{ mv.rack.code }}
                </span>
                <span v-if="mv.bin?.code" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {{ mv.bin.code }}
                </span>
                <span v-if="!mv.zone?.code && !mv.rack?.code && !mv.bin?.code" class="text-xs text-gray-400">—</span>
              </div>
            </td>

            <!-- Perubahan -->
            <td class="px-4 py-3 text-right text-nowrap">
              <span
                class="inline-flex items-center gap-1 font-semibold"
                :class="mv.stock_change > 0 ? 'text-green-700' : mv.stock_change < 0 ? 'text-red-600' : 'text-gray-400'"
              > 
                {{ mv.stock_change > 0 ? '+' : '' }}{{ mv.stock_change.toLocaleString('id-ID') }}
              </span>
            </td>

            <!-- Harga -->
            <td class="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
              Rp{{ formatCurrency(mv.price) }}
            </td>

            <!-- Total -->
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <span
                class="text-sm font-semibold"
                :class="Number(mv.total) >= 0 ? 'text-gray-900' : 'text-red-600'"
              >
                {{ Number(mv.total) < 0 ? '-' : '' }}Rp{{ formatCurrency(Math.abs(Number(mv.total))) }}
              </span>
            </td>

            <!-- Waktu -->
            <td class="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
              {{ formatDateTime(mv.created_at) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
