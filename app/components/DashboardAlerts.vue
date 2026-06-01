<script setup lang="ts">
import { AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-vue-next'
import type { DashboardAlert } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const items = ref<DashboardAlert[]>([])

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.storeId) params.store_id = props.storeId
    const res = await api.get<{ data: DashboardAlert[] }>('/sales/dashboard/alerts', params)
    items.value = res.data || []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat alerts')
    items.value = []
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(() => props.storeId, fetchData, { immediate: true })

const typeMap = {
  critical: { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', ring: 'ring-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  info: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', ring: 'ring-blue-200' },
}

function ago(dateStr: string) {
  const now = Date.now()
  const t = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - t) / 60000))
  if (diff < 1) return 'baru saja'
  if (diff < 60) return `${diff}m lalu`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}j lalu`
  return `${Math.floor(h / 24)}d lalu`
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-gray-900">Alerts & Problems</h3>
        <span
          v-if="items.length"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700"
        >{{ items.length }}</span>
      </div>
      <button
        class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        :disabled="loading"
        @click="fetchData"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div class="flex-1 divide-y divide-gray-100 overflow-y-auto" style="max-height: 360px">
      <div v-if="loading && !items.length" class="space-y-2 p-3">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div v-else-if="!items.length" class="flex flex-col items-center justify-center px-4 py-10 text-center">
        <Info class="h-8 w-8 text-gray-300" />
        <p class="mt-2 text-xs text-gray-500">Tidak ada alert aktif</p>
      </div>
      <NuxtLink
        v-for="a in items"
        :key="a.id"
        :to="a.action_url"
        class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1"
          :class="[typeMap[a.type].bg, typeMap[a.type].ring]"
        >
          <component :is="typeMap[a.type].icon" class="h-4 w-4" :class="typeMap[a.type].text" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-xs font-semibold text-gray-900">{{ a.title }}</p>
            <span
              class="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ring-1"
              :class="[typeMap[a.type].bg, typeMap[a.type].text, typeMap[a.type].ring]"
            >{{ a.type }}</span>
          </div>
          <p class="mt-0.5 line-clamp-2 text-[11px] text-gray-500">{{ a.description }}</p>
          <p class="mt-1 text-[10px] text-gray-400">{{ ago(a.created_at) }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
