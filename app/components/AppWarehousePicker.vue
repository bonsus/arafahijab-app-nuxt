<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface Warehouse {
  id: string
  name: string
}

defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [warehouse: Warehouse]
}>()

const api = useApi()

const loading = ref(false)
const options = ref<Warehouse[]>([])

async function fetchWarehouses() {
  if (options.value.length) return
  loading.value = true
  try {
    const res = await api.get<{ data: Warehouse[] }>('/warehouses/public/index')
    options.value = res.data || []
  }
  catch {
    options.value = []
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchWarehouses())
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :disabled="disabled"
      class="input-base appearance-none pr-8"
      @change="(e) => {
        const value = (e.target as HTMLSelectElement).value
        emit('update:modelValue', value)
        const wh = options.find(w => w.id === value)
        if (wh) emit('select', wh)
      }"
    >
      <option value="" disabled>Pilih Gudang</option>
      <option v-for="wh in options" :key="wh.id" :value="wh.id">
        {{ wh.name }}
      </option>
    </select>
    <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-base {
  @apply w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white;
}
</style>
