<script setup lang="ts">
import { Truck, Loader2, RefreshCw, X, Package, Check } from 'lucide-vue-next'

export interface ShippingService {
  provider: string
  type: string
  courierName: string
  courierCode: string
  serviceName: string
  serviceCode: string
  cod: boolean
  price: number
  minDuration: number
  maxDuration: number
}

export interface ShippingGroup {
  instant: ShippingService[]
  regular: ShippingService[]
  express: ShippingService[]
  same_day: ShippingService[]
  cargo: ShippingService[]
}

const props = defineProps<{
  district: string
  zipcode: string
  weight: number
  modelValue: ShippingService | null
}>()

const emit = defineEmits<{
  'update:modelValue': [service: ShippingService | null]
}>()

const api = useApi()

const open = ref(false)
const loading = ref(false)
const services = ref<ShippingGroup | null>(null)
const error = ref('')
const activeGroup = ref<string>('regular')
const brokenIcons = ref<Set<string>>(new Set())

const typeLabels: Record<string, string> = {
  instant: 'Instan',
  regular: 'Regular',
  express: 'Express',
  same_day: 'Same Day',
  cargo: 'Kargo',
}

const groupOrder = ['instant', 'regular', 'express', 'same_day', 'cargo'] as const

const availableGroups = computed(() =>
  groupOrder.filter(g => (services.value?.[g] || []).length > 0)
)

const activeServices = computed(() =>
  services.value?.[activeGroup.value as keyof ShippingGroup] || []
)

async function openModal() {
  open.value = true
  if (!services.value) await calculate()
}

async function calculate() {
  if (!props.district || !props.zipcode || !props.weight) return
  loading.value = true
  error.value = ''
  try {
    const res = await api.post<{ data: ShippingGroup }>('/ongkir/calculate', {
      district: props.district,
      zipcode: props.zipcode,
      weight: props.weight,
    })
    services.value = res.data
    // auto-select first available group
    const first = groupOrder.find(g => (res.data?.[g] || []).length > 0)
    if (first) activeGroup.value = first
  }
  catch (err: any) {
    error.value = err.message || 'Gagal menghitung ongkir'
    services.value = null
  }
  finally {
    loading.value = false
  }
}

function selectService(service: ShippingService) {
  emit('update:modelValue', service)
  open.value = false
}

function courierIcon(code: string): string {
  return `/images/couriers/${code}.png`
}

function onIconError(code: string) {
  brokenIcons.value = new Set([...brokenIcons.value, code])
}

function hasIcon(code: string): boolean {
  return !brokenIcons.value.has(code)
}

function formatDuration(min: number, max: number): string {
  if (min === max) return `${min} hari`
  return `${min}–${max} hari`
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

const canOpen = computed(() => !!props.district && !!props.zipcode && !!props.weight)

watch(() => [props.district, props.zipcode, props.weight], () => {
  services.value = null
  emit('update:modelValue', null)
})
</script>

<template>
  <!-- Trigger / Selected summary -->
  <div>
    <button
      v-if="!modelValue"
      type="button"
      :disabled="!canOpen"
      class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
      @click="openModal"
    >
      <Truck class="h-4 w-4" />
      Pilih Layanan Pengiriman
    </button>

    <p v-if="!canOpen && !modelValue" class="mt-1.5 text-xs text-gray-400">
      <template v-if="!district || !zipcode">Lengkapi kecamatan &amp; kode pos terlebih dahulu</template>
      <template v-else-if="!weight">Tambahkan item produk terlebih dahulu</template>
    </p>

    <!-- Selected summary card -->
    <div
      v-if="modelValue"
      class="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5"
    >
      <img
        :src="courierIcon(modelValue.courierCode)"
        :alt="modelValue.courierName"
        class="h-8 w-8 shrink-0 rounded-lg object-contain"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-semibold text-primary-900">{{ modelValue.courierName }} – {{ modelValue.serviceName }}</p>
        <p class="text-xs text-primary-600">
          {{ modelValue.price === 0 ? 'Gratis' : `Rp${formatCurrency(modelValue.price)}` }}
          · {{ formatDuration(modelValue.minDuration, modelValue.maxDuration) }}
          <span v-if="modelValue.cod" class="ml-1 rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700">COD</span>
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 text-xs font-medium text-primary-500 hover:text-primary-700"
        @click="openModal"
      >
        Ganti
      </button>
    </div>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="open = false"
      >
        <div
          class="flex w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          style="max-height: 85vh"
          @click.stop
        >
          <!-- Header -->
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Truck class="h-4 w-4 text-primary-500" />
            <h3 class="flex-1 text-sm font-semibold text-gray-900">Pilih Layanan Pengiriman</h3>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="open = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 class="h-5 w-5 animate-spin" /> Menghitung ongkir...
          </div>

          <!-- Error -->
          <div v-else-if="error" class="flex-1 px-4 py-10 text-center">
            <p class="mb-3 text-sm text-red-500">{{ error }}</p>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 mx-auto"
              @click="calculate"
            >
              <RefreshCw class="h-4 w-4" /> Coba Lagi
            </button>
          </div>

          <!-- Results -->
          <template v-else-if="services">
            <!-- Group tabs -->
            <div class="shrink-0 flex gap-1 overflow-x-auto border-b border-gray-100 px-4 py-2">
              <button
                v-for="group in availableGroups"
                :key="group"
                type="button"
                class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="activeGroup === group
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'"
                @click="activeGroup = group"
              >
                {{ typeLabels[group] || group }}
                <span class="ml-1 text-[10px] opacity-70">({{ (services[group] || []).length }})</span>
              </button>
            </div>

            <!-- Service list -->
            <div class="min-h-0 flex-1 overflow-y-auto divide-y divide-gray-100">
              <button
                v-for="service in activeServices"
                :key="`${service.courierCode}-${service.serviceCode}`"
                type="button"
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50"
                :class="modelValue?.courierCode === service.courierCode && modelValue?.serviceCode === service.serviceCode
                  ? 'bg-primary-50'
                  : ''"
                @click="selectService(service)"
              >
                <!-- Courier icon -->
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden">
                  <img
                    v-if="hasIcon(service.courierCode)"
                    :src="courierIcon(service.courierCode)"
                    :alt="service.courierName"
                    class="h-8 w-8 object-contain"
                    @error="onIconError(service.courierCode)"
                  />
                  <Truck v-else class="h-5 w-5 text-gray-300" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <p class="text-sm font-semibold text-gray-900">{{ service.courierName }}</p>
                    <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{{ service.serviceName }}</span>
                    <span v-if="service.cod" class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">COD</span>
                  </div>
                  <p class="mt-0.5 text-xs text-gray-400">Estimasi {{ formatDuration(service.minDuration, service.maxDuration) }}</p>
                </div>

                <div class="shrink-0 text-right">
                  <p class="text-sm font-bold text-gray-900">
                    {{ service.price === 0 ? 'Gratis' : `Rp${formatCurrency(service.price)}` }}
                  </p>
                  <Check
                    v-if="modelValue?.courierCode === service.courierCode && modelValue?.serviceCode === service.serviceCode"
                    class="ml-auto mt-0.5 h-4 w-4 text-primary-500"
                  />
                </div>
              </button>

              <!-- Empty group -->
              <div v-if="!activeServices.length" class="py-10 text-center">
                <Package class="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p class="text-sm text-gray-400">Tidak ada layanan tersedia</p>
              </div>
            </div>

            <!-- Footer recalc -->
            <div class="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2.5">
              <p class="text-xs text-gray-400">Berat: {{ weight }}g</p>
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:text-primary-700"
                @click="calculate"
              >
                <RefreshCw class="h-3.5 w-3.5" /> Hitung Ulang
              </button>
            </div>
          </template>

          <!-- Initial / no results -->
          <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <Package class="h-10 w-10 text-gray-200" />
            <p class="text-sm text-gray-400">Belum ada data ongkir</p>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="calculate"
            >
              <RefreshCw class="h-4 w-4" /> Hitung Ongkir
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
