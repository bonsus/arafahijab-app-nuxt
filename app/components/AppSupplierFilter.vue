<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

const api = useApi()

const suppliers = ref<{ id: string; name: string }[]>([])
const loading = ref(false)

const options = computed(() =>
  suppliers.value.map(s => ({ value: s.id, label: s.name })),
)

async function fetchSuppliers(search?: string) {
  loading.value = true
  try {
    const params: Record<string, string> = { type: 'supplier' }
    if (search) params.search = search
    const res = await api.get<{ data: any }>('/customers/public/index', params)
    suppliers.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch {
    suppliers.value = []
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchSuppliers())
</script>

<template>
  <AppFilterSelect
    :model-value="modelValue"
    :options="options"
    :loading="loading"
    multiple
    placeholder="Supplier"
    search-placeholder="Cari supplier..."
    @update:model-value="emit('update:modelValue', $event)"
    @search="fetchSuppliers"
  />
</template>
