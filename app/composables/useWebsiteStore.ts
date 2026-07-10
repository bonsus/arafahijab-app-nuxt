export interface WebStore {
  id: string
  source: string
  url: string
  shop_name: string
  status: string
}

// Module-scoped state shared across all website pages/components.
const webStores = ref<WebStore[]>([])
const selectedStoreId = ref<string>('')
const loaded = ref(false)
const loading = ref(false)

const STORAGE_KEY = 'website_store_id'

export function useWebsiteStore() {
  const api = useApi()

  async function fetchStores(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const res = await api.get<{ data: { data: WebStore[] } }>('/stores/index', { per_page: '100' })
      const list = (res.data?.data || []).filter(s => s.source === 'web')
      webStores.value = list

      const saved = import.meta.client ? localStorage.getItem(STORAGE_KEY) : ''
      if (saved && list.some(s => s.id === saved)) {
        selectedStoreId.value = saved
      }
      else if (!selectedStoreId.value && list.length) {
        selectedStoreId.value = list[0]!.id
      }
      else if (selectedStoreId.value && !list.some(s => s.id === selectedStoreId.value)) {
        selectedStoreId.value = list.length ? list[0]!.id : ''
      }
      loaded.value = true
    }
    catch {
      webStores.value = []
    }
    finally {
      loading.value = false
    }
  }

  function selectStore(id: string) {
    selectedStoreId.value = id
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, id)
  }

  const selectedStore = computed(() => webStores.value.find(s => s.id === selectedStoreId.value) || null)

  return {
    webStores,
    selectedStoreId,
    selectedStore,
    loading,
    loaded,
    fetchStores,
    selectStore,
  }
}
