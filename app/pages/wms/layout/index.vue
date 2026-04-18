<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const warehouses = ref<{ id: string; name: string }[]>([])
const loading = ref(true)

async function fetchWarehouses() {
  loading.value = true
  try {
    const res = await api.get<{ data: { data: { id: string; name: string }[] } }>('/warehouses/index', { per_page: '100' })
    warehouses.value = res.data?.data || []
    
    // Auto-navigate to first warehouse if available
    if (warehouses.value.length > 0) {
      if (warehouses.value[0]) {
        navigateTo(`/wms/layout/${warehouses.value[0].id}`)
      }
    }
  } catch {
    warehouses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchWarehouses())
</script>

<template>
  <div class="flex items-center justify-center py-16">
    <div v-if="loading" class="text-center">
      <Loader2 class="mx-auto h-8 w-8 animate-spin text-gray-400" />
      <p class="mt-4 text-sm text-gray-500">Memuat gudang...</p>
    </div>
    <div v-else-if="!warehouses.length" class="text-center">
      <p class="text-sm text-gray-500">Belum ada gudang.</p>
      <p class="mt-2 text-sm text-gray-400">Tambahkan gudang terlebih dahulu di menu Gudang.</p>
    </div>
  </div>
</template>
