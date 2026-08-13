import type { BillingNotification, Paginated } from '~/types'

/**
 * State notifikasi in-app (PLATFORM_BILLING_API.md B.9) yang dibagi antara
 * bell di sidebar/topbar dan halaman /billing/notifications.
 * Module-level singleton agar unread count sinkron di seluruh komponen.
 */
const notifications = ref<BillingNotification[]>([])
const unreadCount = ref(0)
const loading = ref(false)
let fetched = false

export function useBillingNotifications() {
  const api = useApi()
  const toast = useToast()

  async function fetchNotifications() {
    loading.value = true
    try {
      const res = await api.get<{ data: Paginated<BillingNotification> }>('/billing/notifications', { page: '1', perpage: '20' })
      notifications.value = res.data?.data || []
      fetched = true
    }
    catch (e: any) {
      console.warn('Gagal memuat notifikasi', e)
    }
    finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await api.get<{ data: number }>('/billing/notifications/unread-count')
      unreadCount.value = res.data || 0
    }
    catch (e: any) {
      console.warn('Gagal memuat jumlah notifikasi', e)
    }
  }

  async function markRead(id: string) {
    try {
      await api.post(`/billing/notifications/${id}/read`)
      const n = notifications.value.find(x => x.id === id)
      if (n) {
        n.is_read = true
        n.read_at = new Date().toISOString()
      }
      await fetchUnreadCount()
    }
    catch (e: any) {
      toast.error(e?.message || 'Gagal menandai notifikasi')
    }
  }

  async function markAllRead() {
    try {
      await api.post('/billing/notifications/read-all')
      notifications.value.forEach(n => { n.is_read = true })
      await fetchUnreadCount()
    }
    catch (e: any) {
      toast.error(e?.message || 'Gagal menandai semua notifikasi')
    }
  }

  /** Muat sekali saja (dipakai di layout/root). */
  function ensureFetched() {
    if (!fetched) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    ensureFetched,
  }
}
