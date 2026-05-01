<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface User {
  id: string
  name: string
  email: string
}

defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const api = useApi()

const loading = ref(false)
const options = ref<User[]>([])

async function fetchUsers() {
  if (options.value.length) return
  loading.value = true
  try {
    const res = await api.get<{ data: { data: User[] } }>('/users/public/index')
    options.value = res.data?.data || []
  }
  catch {
    options.value = []
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :disabled="loading"
      class="input-base appearance-none pr-8"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ placeholder || 'Pilih Petugas' }}</option>
      <option v-for="u in options" :key="u.id" :value="u.id">
        {{ u.name }}
      </option>
    </select>
    <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-base {
  @apply w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-gray-50 disabled:text-gray-400;
}
</style>
