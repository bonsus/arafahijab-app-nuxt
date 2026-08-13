<script setup lang="ts">
import { Bell, Check, RefreshCw, Loader2, Inbox, CheckCheck, ChevronRight } from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'
import type { BillingNotification, Paginated } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

const items = ref<BillingNotification[]>([])
const loading = ref(true)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(1)
const fStatus = ref('') // '' | 'unread'

/** Ikon/tema per tipe notifikasi. */
const typeMeta: Record<string, { icon: string; cls: string }> = {
  'payment.confirmation_submitted': { icon: '🕐', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  'payment.approved': { icon: '✅', cls: 'bg-green-50 text-green-700 ring-green-200' },
  'payment.rejected': { icon: '❌', cls: 'bg-red-50 text-red-700 ring-red-200' },
  'payment.expired': { icon: '⏰', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
  'invoice.paid': { icon: '🧾', cls: 'bg-green-50 text-green-700 ring-green-200' },
  'subscription.renewal_reminder': { icon: '🔔', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  'subscription.grace_period': { icon: '⚠️', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  'trial.started': { icon: '✨', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
}

function typeBadge(type: string) {
  return typeMeta[type] || { icon: '📌', cls: 'bg-gray-100 text-gray-600 ring-gray-200' }
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
    }
    if (fStatus.value) params.status = fStatus.value
    const res = await api.get<{ data: Paginated<BillingNotification> }>('/billing/notifications', params)
    items.value = res.data?.data || []
    total.value = res.data?.total || 0
    totalPage.value = res.data?.total_page || 1
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat notifikasi')
  }
  finally {
    loading.value = false
  }
}

async function markRead(n: BillingNotification) {
  if (n.is_read) return
  try {
    await api.post(`/billing/notifications/${n.id}/read`)
    n.is_read = true
    n.read_at = new Date().toISOString()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal menandai notifikasi')
  }
}

const markingAll = ref(false)
async function markAllRead() {
  if (!unreadItems.value.length) return
  markingAll.value = true
  try {
    await api.post('/billing/notifications/read-all')
    items.value.forEach(n => { n.is_read = true })
    toast.success('Semua notifikasi ditandai dibaca')
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal menandai semua')
  }
  finally {
    markingAll.value = false
  }
}

const unreadItems = computed(() => items.value.filter(n => !n.is_read))

function applyFilter() {
  page.value = 1
  fetchList()
}

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

onMounted(fetchList)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Bell class="h-5 w-5 text-primary-600" /> Notifikasi
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Pemberitahuan pembayaran, invoice, dan status langganan Anda</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="loading"
          @click="fetchList"
        >
          <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
          Refresh
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          :disabled="markingAll || !unreadItems.length"
          @click="markAllRead"
        >
          <Loader2 v-if="markingAll" class="h-3.5 w-3.5 animate-spin" />
          <CheckCheck v-else class="h-3.5 w-3.5" />
          Tandai Semua Dibaca
        </button>
      </div>
    </div>

    <BillingTabs />

    <!-- Filter -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="fStatus === '' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
        @click="fStatus = ''; applyFilter()"
      >
        Semua
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="fStatus === 'unread' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
        @click="fStatus = 'unread'; applyFilter()"
      >
        Belum Dibaca
      </button>
    </div>

    <!-- List -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div v-if="loading" class="space-y-2 px-5 py-6">
        <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!items.length" class="px-5 py-16 text-center">
        <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p class="text-sm text-gray-500">Belum ada notifikasi.</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="n in items"
          :key="n.id"
          class="flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-gray-50/50"
          :class="{ 'bg-primary-50/30': !n.is_read }"
          @click="markRead(n)"
        >
          <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ring-1" :class="typeBadge(n.type).cls">
            {{ typeBadge(n.type).icon }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-gray-900">{{ n.title }}</p>
              <span v-if="!n.is_read" class="h-2 w-2 shrink-0 rounded-full bg-primary-500" />
            </div>
            <p class="mt-0.5 text-sm text-gray-600">{{ n.body }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ formatDateTime(n.created_at) }}</p>
          </div>
          <ChevronRight class="mt-2 h-4 w-4 shrink-0 text-gray-300" />
        </div>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPage > 0"
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
      />
    </div>
  </div>
</template>
