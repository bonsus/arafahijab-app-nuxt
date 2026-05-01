<script setup lang="ts">
/**
 * AppBinPicker
 * Cascade selector: Zone → Rack → Bin untuk warehouse tertentu.
 * Props:
 *   warehouseId   – ID gudang (dibutuhkan untuk load zone)
 *   modelValue    – bin_id yang dipilih (string)
 *   initialZoneId – zone_id awal untuk mode edit (opsional)
 *   initialRackId – rack_id awal untuk mode edit (opsional)
 * Emits:
 *   update:modelValue – bin_id baru (atau '' jika dikosongkan)
 */

interface Zone { id: string; name: string; code: string }
interface Rack { id: string; name: string; code: string }
interface Bin  { id: string; code: string }

const props = defineProps<{
  warehouseId: string
  modelValue: string
  initialZoneId?: string
  initialRackId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [bin: { id: string; code: string; label: string }]
}>()

const api = useApi()

const zones = ref<Zone[]>([])
const racks = ref<Rack[]>([])
const bins  = ref<Bin[]>([])

const selectedZoneId = ref('')
const selectedRackId = ref('')

const loadingZones = ref(false)
const loadingRacks = ref(false)
const loadingBins  = ref(false)

// Flag agar auto-fill hanya terjadi sekali (saat mount pertama)
const hasAutoFilled = ref(false)

// ── Internal loaders (tidak reset state, tidak emit) ─────────────────────────
async function _loadRacks(zoneId: string) {
  loadingRacks.value = true
  try {
    const res = await api.get<{ data: Rack[] }>(`/warehouses/${zoneId}/racks/index`)
    racks.value = res.data || []
  }
  catch { racks.value = [] }
  finally { loadingRacks.value = false }
}

async function _loadBins(rackId: string) {
  loadingBins.value = true
  try {
    const res = await api.get<{ data: Bin[] }>(`/warehouses/${rackId}/bins/index`)
    bins.value = res.data || []
  }
  catch { bins.value = [] }
  finally { loadingBins.value = false }
}

// ── User interaction handlers (reset + emit) ─────────────────────────────────
async function onZoneChange(zoneId: string) {
  selectedZoneId.value = zoneId
  racks.value  = []
  bins.value   = []
  selectedRackId.value = ''
  emit('update:modelValue', '')
  if (!zoneId) return
  await _loadRacks(zoneId)
}

async function onRackChange(rackId: string) {
  selectedRackId.value = rackId
  bins.value = []
  emit('update:modelValue', '')
  if (!rackId) return
  await _loadBins(rackId)
}

function onBinChange(binId: string) {
  emit('update:modelValue', binId)
  if (binId) {
    const bin = bins.value.find(b => b.id === binId)
    const zone = zones.value.find(z => z.id === selectedZoneId.value)
    const rack = racks.value.find(r => r.id === selectedRackId.value)
    const label = [zone?.code, rack?.code, bin?.code].filter(Boolean).join(' / ')
    emit('select', { id: binId, code: bin?.code || '', label })
  }
}

// ── Load zones + optional auto-fill saat edit ─────────────────────────────────
async function loadZones() {
  if (!props.warehouseId) return

  const doAutoFill = !hasAutoFilled.value
    && !!props.initialZoneId
    && !!props.initialRackId
    && !!props.modelValue

  if (!doAutoFill) {
    zones.value = []
    racks.value = []
    bins.value  = []
    selectedZoneId.value = ''
    selectedRackId.value = ''
    emit('update:modelValue', '')
  }

  hasAutoFilled.value = true
  loadingZones.value = true
  try {
    const res = await api.get<{ data: Zone[] }>(`/warehouses/${props.warehouseId}/zones/index`)
    zones.value = res.data || []

    if (doAutoFill) {
      selectedZoneId.value = props.initialZoneId!
      await _loadRacks(props.initialZoneId!)
      selectedRackId.value = props.initialRackId!
      await _loadBins(props.initialRackId!)
      // modelValue (bin_id) sudah di-set via props; bins sudah ter-load → select tampil benar
    }
  }
  catch { zones.value = [] }
  finally { loadingZones.value = false }
}

watch(() => props.warehouseId, (id) => {
  if (id) loadZones()
  else {
    hasAutoFilled.value = false
    zones.value = []
    racks.value = []
    bins.value  = []
    selectedZoneId.value = ''
    selectedRackId.value = ''
    emit('update:modelValue', '')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-1.5 sm:flex-row">
    <!-- Zone -->
    <select
      :value="selectedZoneId"
      :disabled="!warehouseId || loadingZones"
      class="bin-select"
      @change="onZoneChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ loadingZones ? 'Memuat...' : 'Zone' }}</option>
      <option v-for="z in zones" :key="z.id" :value="z.id">{{ z.name || z.code }}</option>
    </select>

    <!-- Rack -->
    <select
      :value="selectedRackId"
      :disabled="!selectedZoneId || loadingRacks"
      class="bin-select"
      @change="onRackChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ loadingRacks ? 'Memuat...' : 'Rak' }}</option>
      <option v-for="r in racks" :key="r.id" :value="r.id">{{ r.name || r.code }}</option>
    </select>

    <!-- Bin -->
    <select
      :value="modelValue"
      :disabled="!selectedRackId || loadingBins"
      class="bin-select"
      @change="onBinChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ loadingBins ? 'Memuat...' : 'Bin' }}</option>
      <option v-for="b in bins" :key="b.id" :value="b.id">{{ b.code }}</option>
    </select>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.bin-select {
  @apply w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-400;
}
</style>
