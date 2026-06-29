<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Eye, Ban, Loader2, Package, User, DollarSign, Building2, FileText, Calendar, CreditCard, X as XIcon } from 'lucide-vue-next'
import { formatCurrency, formatDate, formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const loading = ref(true)
const payment = ref<any>(null)
const showLightbox = ref(false)
const lightboxUrl = ref('')
const showCancelModal = ref(false)
const cancelling = ref(false)

const statusConfig: Record<string, { label: string; bg: string }> = {
  done: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>(`/sales/orders/payments/${route.params.id}`)
    payment.value = res.data
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data pembayaran')
    router.push('/sales/payments')
  } finally {
    loading.value = false
  }
}

function openLightbox(url: string) {
  lightboxUrl.value = url
  showLightbox.value = true
}

function closeLightbox() {
  showLightbox.value = false
  lightboxUrl.value = ''
}

function openCancelModal() {
  showCancelModal.value = true
}

function closeCancelModal() {
  showCancelModal.value = false
}

async function cancelPayment() {
  if (!payment.value) return
  
  cancelling.value = true
  try {
    await api.post(`/sales/orders/payments/${payment.value.id}/cancel`)
    toast.success('Pembayaran berhasil dibatalkan')
    closeCancelModal()
    fetchData()
  } catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan pembayaran')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-50"
          @click="router.push('/sales/payment')"
        >
          <ArrowLeft class="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Detail Pembayaran</h1>
          <p class="mt-1 text-sm text-gray-500">Informasi lengkap pembayaran order</p>
        </div>
      </div>
      <div v-if="!loading && payment && payment.status === 'done'" class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="openCancelModal"
        >
          <Ban class="h-4 w-4" />
          Batalkan Pembayaran
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- Content -->
    <div v-else-if="payment" class="grid gap-4 lg:grid-cols-3">
      <!-- Main Info -->
      <div class="space-y-4 lg:col-span-2">
        <!-- Payment Info Card -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Informasi Pembayaran</h2>
            <span
              class="inline-flex rounded-full px-3 py-1 text-sm font-medium"
              :class="statusConfig[payment.status]?.bg || 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'"
            >
              {{ statusConfig[payment.status]?.label || payment.status }}
            </span>
          </div>

          <div class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs font-medium text-gray-500">No. Pembayaran</label>
                <p class="mt-1 font-mono text-sm font-semibold text-gray-900">{{ payment.no }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500">Tanggal</label>
                <p class="mt-1 text-sm text-gray-900">{{ formatDate(payment.date) }}</p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs font-medium text-gray-500">Jumlah</label>
                <p class="mt-1 text-lg font-bold text-gray-900">Rp{{ formatCurrency(Number(payment.amount)) }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500">Jumlah Aktual Diterima</label>
                <p class="mt-1 text-lg font-bold text-gray-900">Rp{{ formatCurrency(Number(payment.actual_amount)) }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500">Metode Pembayaran</label>
                <p class="mt-1 text-sm text-gray-900">{{ payment.method }}</p>
                <p class="text-xs text-gray-500">{{ payment.provider }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500">Dibuat</label>
                <p class="mt-1 text-sm text-gray-900 capitalize">{{ formatDateTime(payment.created_at) }}</p>
              </div>
              <div v-if="payment.updated_at != payment.created_at">
                <label class="text-xs font-medium text-gray-500">Diperbarui</label>
                <p class="mt-1 text-sm text-gray-900 capitalize">{{ formatDateTime(payment.updated_at) }}</p>
              </div>
            </div>

            <div v-if="payment.note">
              <label class="text-xs font-medium text-gray-500">Catatan</label>
              <p class="mt-1 text-sm text-gray-900">{{ payment.note }}</p>
            </div>
          </div>
        </div>

        <!-- Order Info Card -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div class="mb-4 flex items-center gap-2">
            <Package class="h-5 w-5 text-gray-400" />
            <h2 class="text-lg font-semibold text-gray-900">Informasi Order</h2>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="text-xs font-medium text-gray-500">No. Order</label>
              <NuxtLink
                :to="`/sales/order/${payment.order?.id}`"
                class="mt-1 block font-mono text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                {{ payment.order?.no }}
              </NuxtLink>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Status Order</label>
              <p class="mt-1 text-sm text-gray-900">
                <span class="capitalize">{{ payment.order?.status }}</span>
                <span v-if="payment.order?.sub_status" class="ml-1 text-xs text-gray-500">({{ payment.order.sub_status }})</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Customer Info Card -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div class="mb-4 flex items-center gap-2">
            <User class="h-5 w-5 text-gray-400" />
            <h2 class="text-lg font-semibold text-gray-900">Informasi Pelanggan</h2>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="text-xs font-medium text-gray-500">Nama</label>
              <p class="mt-1 text-sm font-medium text-gray-900">{{ payment.customer?.name }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Telepon</label>
              <p class="mt-1 text-sm text-gray-900">{{ payment.customer?.phone }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Bank Account Card -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div class="mb-4 flex items-center gap-2">
            <Building2 class="h-5 w-5 text-gray-400" />
            <h2 class="text-lg font-semibold text-gray-900">Rekening Tujuan</h2>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500">Dompet</label>
              <p class="mt-1 text-sm font-medium text-gray-900">{{ payment.wallet?.name || '-' }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Bank</label>
              <p class="mt-1 text-sm font-medium text-gray-900">{{ payment.bank_name }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">No. Rekening</label>
              <p class="mt-1 font-mono text-sm font-semibold text-gray-900">{{ payment.account_number }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">Atas Nama</label>
              <p class="mt-1 text-sm text-gray-900">{{ payment.account_name }}</p>
            </div>
          </div>
        </div>

        <!-- Bukti Transfer Card -->
        <div v-if="payment.file" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <FileText class="h-5 w-5 text-gray-400" />
              <h2 class="text-lg font-semibold text-gray-900">Bukti Transfer</h2>
            </div>
            <button
              type="button"
              class="text-xs text-primary-600 hover:text-primary-700"
              @click="openLightbox(payment.file)"
            >
              Lihat Penuh
            </button>
          </div>

          <div class="overflow-hidden rounded-lg ring-1 ring-gray-200">
            <img
              v-if="payment.file.match(/\.(jpg|jpeg|png|gif|webp)$/i)"
              :src="payment.file"
              alt="Bukti Transfer"
              class="w-full cursor-pointer object-cover transition-transform hover:scale-105"
              @click="openLightbox(payment.file)"
            />
            <div v-else class="flex items-center gap-2 bg-gray-50 p-4">
              <Eye class="h-5 w-5 text-gray-400" />
              <span class="text-sm text-gray-600">{{ payment.file.split('/').pop() }}</span>
            </div>
          </div>
        </div>
 
      </div>
    </div>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div
        v-if="showCancelModal && payment"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeCancelModal"
      >
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]" @click.stop>
          <div class="shrink-0 border-b border-gray-200 px-6 py-4">
            <h3 class="text-lg font-semibold text-gray-900">Batalkan Pembayaran</h3>
          </div>

          <div class="space-y-4 overflow-y-auto p-6">
            <div class="space-y-2.5 rounded-lg bg-gray-50 p-4 text-sm ring-1 ring-gray-200">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">No. Pembayaran</span>
                <span class="font-mono text-xs font-semibold text-gray-600">{{ payment.no }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">No. Order</span>
                <span class="font-mono text-xs font-semibold text-primary-600">{{ payment.order?.no }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Pelanggan</span>
                <span class="font-medium text-gray-900">{{ payment.customer?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Jumlah</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(Number(payment.amount)) }}</span>
              </div>
            </div>

            <div class="rounded-lg border bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
              <Ban class="mr-1.5 inline h-4 w-4" />
              Pembayaran akan dibatalkan dan status order dikembalikan ke <strong>UNPAID</strong>
            </div>
          </div>

          <div class="shrink-0 flex gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="cancelling"
              @click="closeCancelModal"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="cancelling"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="cancelPayment"
            >
              <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
              {{ cancelling ? 'Memproses...' : 'Batalkan Pembayaran' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="showLightbox"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
        @click="closeLightbox"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          @click="closeLightbox"
        >
          <XIcon class="h-6 w-6" />
        </button>
        <img
          v-if="lightboxUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)"
          :src="lightboxUrl"
          alt="Preview"
          class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          @click.stop
        />
        <iframe
          v-else
          :src="lightboxUrl"
          class="h-[90vh] w-[90vw] rounded-lg bg-white"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>
