<script setup lang="ts">
import {
  Plus, Pencil, Trash2, Loader2, ChevronRight, MapPinned, Layers, Grid3x3, Package, GripVertical, RefreshCw,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// --- Types ---
interface Warehouse {
  id: string
  name: string
  description: string
}

interface Zone {
  id: string
  warehouse_id: string
  name: string
  code: string
  sort: number
  rack_count: number
  created_at: string
}

interface Rack {
  id: string
  warehouse_id: string
  zone_id: string
  name: string
  code: string
  sort: number
  bin_count: number
  created_at: string
}

interface Bin {
  id: string
  warehouse_id: string
  zone_id: string
  rack_id: string
  code: string
  sort: number
  created_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// ─── Warehouse selector ───
const warehouses = ref<Warehouse[]>([])
const selectedWarehouseId = ref<string | null>(null)
const loadingWarehouses = ref(true)

async function fetchWarehouses() {
  loadingWarehouses.value = true
  try {
    const res = await api.get<{ data: { data: Warehouse[] } }>('/warehouses/index', { per_page: '100' })
    warehouses.value = res.data?.data || []
    if (warehouses.value.length && !selectedWarehouseId.value) {
      selectedWarehouseId.value = warehouses.value[0]!.id
    }
  } catch {
    warehouses.value = []
  } finally {
    loadingWarehouses.value = false
  }
}

watch(selectedWarehouseId, (id) => {
  selectedZoneId.value = null
  selectedRackId.value = null
  zones.value = []
  racks.value = []
  bins.value = []
  if (id) fetchZones()
})

// ─── Zones ───
const zones = ref<Zone[]>([])
const selectedZoneId = ref<string | null>(null)
const loadingZones = ref(false)

async function fetchZones() {
  if (!selectedWarehouseId.value) return
  loadingZones.value = true
  try {
    const res = await api.get<{ data: Zone[] }>(`/warehouses/${selectedWarehouseId.value}/zones/index`)
    zones.value = res.data || []
  } catch {
    zones.value = []
  } finally {
    loadingZones.value = false
  }
}

watch(selectedZoneId, (id) => {
  selectedRackId.value = null
  racks.value = []
  bins.value = []
  if (id) fetchRacks()
})

// ─── Racks ───
const racks = ref<Rack[]>([])
const selectedRackId = ref<string | null>(null)
const loadingRacks = ref(false)

async function fetchRacks() {
  if (!selectedZoneId.value) return
  loadingRacks.value = true
  try {
    const res = await api.get<{ data: Rack[] }>(`/warehouses/${selectedZoneId.value}/racks/index`)
    racks.value = res.data || []
  } catch {
    racks.value = []
  } finally {
    loadingRacks.value = false
  }
}

watch(selectedRackId, (id) => {
  bins.value = []
  if (id) fetchBins()
})

// ─── Bins ───
const bins = ref<Bin[]>([])
const loadingBins = ref(false)

async function fetchBins() {
  if (!selectedRackId.value) return
  loadingBins.value = true
  try {
    const res = await api.get<{ data: Bin[] }>(`/warehouses/${selectedRackId.value}/bins/index`)
    bins.value = res.data || []
  } catch {
    bins.value = []
  } finally {
    loadingBins.value = false
  }
}

// ─── Zone CRUD ───
const showZoneModal = ref(false)
const editingZoneId = ref<string | null>(null)
const savingZone = ref(false)
const zoneForm = reactive({ name: '', code: '', sort: 0 })

function openCreateZone() {
  editingZoneId.value = null
  zoneForm.name = ''
  zoneForm.code = ''
  zoneForm.sort = zones.value.length + 1
  showZoneModal.value = true
}

async function openEditZone(z: Zone) {
  editingZoneId.value = z.id
  zoneForm.name = z.name
  zoneForm.code = z.code
  zoneForm.sort = z.sort
  showZoneModal.value = true
}

async function saveZone() {
  savingZone.value = true
  try {
    if (editingZoneId.value) {
      await api.put(`/warehouses/zones/${editingZoneId.value}`, {
        warehouse_id: selectedWarehouseId.value,
        name: zoneForm.name,
        code: zoneForm.code,
        sort: zoneForm.sort,
      })
      toast.success('Zone berhasil diperbarui')
    } else {
      await api.post('/warehouses/zones/create', {
        warehouse_id: selectedWarehouseId.value,
        name: zoneForm.name,
        code: zoneForm.code,
        sort: zoneForm.sort,
      })
      toast.success('Zone berhasil ditambahkan')
    }
    showZoneModal.value = false
    fetchZones()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan zone')
  } finally {
    savingZone.value = false
  }
}

async function deleteZone(z: Zone) {
  const ok = await confirm({
    title: 'Hapus Zone',
    message: `Yakin ingin menghapus zone "${z.name}"? Semua rack dan bin di dalamnya juga akan terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/warehouses/zones/${z.id}`)
    toast.success('Zone berhasil dihapus')
    if (selectedZoneId.value === z.id) selectedZoneId.value = null
    fetchZones()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus zone')
  }
}

// ─── Rack CRUD ───
const showRackModal = ref(false)
const editingRackId = ref<string | null>(null)
const savingRack = ref(false)
const rackForm = reactive({ name: '', code: '', sort: 0 })

function openCreateRack() {
  editingRackId.value = null
  rackForm.name = ''
  rackForm.code = ''
  rackForm.sort = racks.value.length + 1
  showRackModal.value = true
}

async function openEditRack(r: Rack) {
  editingRackId.value = r.id
  rackForm.name = r.name
  rackForm.code = r.code
  rackForm.sort = r.sort
  showRackModal.value = true
}

async function saveRack() {
  savingRack.value = true
  try {
    if (editingRackId.value) {
      await api.put(`/warehouses/racks/${editingRackId.value}`, {
        name: rackForm.name,
        code: rackForm.code,
        sort: rackForm.sort,
      })
      toast.success('Rack berhasil diperbarui')
    } else {
      await api.post('/warehouses/racks/create', {
        zone_id: selectedZoneId.value,
        name: rackForm.name,
        code: rackForm.code,
        sort: rackForm.sort,
      })
      toast.success('Rack berhasil ditambahkan')
    }
    showRackModal.value = false
    fetchRacks()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan rack')
  } finally {
    savingRack.value = false
  }
}

async function deleteRack(r: Rack) {
  const ok = await confirm({
    title: 'Hapus Rack',
    message: `Yakin ingin menghapus rack "${r.name}"? Semua bin di dalamnya juga akan terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/warehouses/racks/${r.id}`)
    toast.success('Rack berhasil dihapus')
    if (selectedRackId.value === r.id) selectedRackId.value = null
    fetchRacks()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus rack')
  }
}

// ─── Bin CRUD ───
const showBinModal = ref(false)
const editingBinId = ref<string | null>(null)
const savingBin = ref(false)
const binForm = reactive({ code: '', sort: 0 })

function openCreateBin() {
  editingBinId.value = null
  binForm.code = ''
  binForm.sort = bins.value.length + 1
  showBinModal.value = true
}

async function openEditBin(b: Bin) {
  editingBinId.value = b.id
  binForm.code = b.code
  binForm.sort = b.sort
  showBinModal.value = true
}

async function saveBin() {
  savingBin.value = true
  try {
    if (editingBinId.value) {
      await api.put(`/warehouses/bins/${editingBinId.value}`, {
        code: binForm.code,
        sort: binForm.sort,
      })
      toast.success('Bin berhasil diperbarui')
    } else {
      await api.post('/warehouses/bins/create', {
        rack_id: selectedRackId.value,
        code: binForm.code,
        sort: binForm.sort,
      })
      toast.success('Bin berhasil ditambahkan')
    }
    showBinModal.value = false
    fetchBins()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan bin')
  } finally {
    savingBin.value = false
  }
}

async function deleteBin(b: Bin) {
  const ok = await confirm({
    title: 'Hapus Bin',
    message: `Yakin ingin menghapus bin "${b.code}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/warehouses/bins/${b.id}`)
    toast.success('Bin berhasil dihapus')
    fetchBins()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus bin')
  }
}

// ─── Drag & Drop Sort ───
const dragType = ref<'zone' | 'rack' | 'bin' | null>(null)
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(type: 'zone' | 'rack' | 'bin', index: number, e: DragEvent) {
  dragType.value = type
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(type: 'zone' | 'rack' | 'bin', index: number, e: DragEvent) {
  if (dragType.value !== type) return
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragEnd() {
  dragType.value = null
  dragIndex.value = null
  dragOverIndex.value = null
}

async function onDrop(type: 'zone' | 'rack' | 'bin', index: number) {
  if (dragType.value !== type || dragIndex.value === null || dragIndex.value === index) {
    onDragEnd()
    return
  }

  const from = dragIndex.value
  let list: { id: string }[]
  let endpoint: string

  if (type === 'zone') {
    list = zones.value
    endpoint = `/warehouses/${selectedWarehouseId.value}/zones/update-sort-mass`
  } else if (type === 'rack') {
    list = racks.value
    endpoint = `/warehouses/${selectedZoneId.value}/racks/update-sort-mass`
  } else {
    list = bins.value
    endpoint = `/warehouses/${selectedRackId.value}/bins/update-sort-mass`
  }

  const item = list.splice(from, 1)[0]!
  list.splice(index, 0, item)
  onDragEnd()

  try {
    await api.put(endpoint, { ids: list.map(i => i.id) })
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah urutan')
    // refetch to restore server order
    if (type === 'zone') fetchZones()
    else if (type === 'rack') fetchRacks()
    else fetchBins()
  }
}

// ─── Helpers ───
const selectedWarehouse = computed(() => warehouses.value.find(w => w.id === selectedWarehouseId.value))
const selectedZone = computed(() => zones.value.find(z => z.id === selectedZoneId.value))
const selectedRack = computed(() => racks.value.find(r => r.id === selectedRackId.value))

onMounted(() => fetchWarehouses())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Lokasi Gudang</h1>
        <p class="text-sm text-gray-500">Kelola zone, rack, dan bin di setiap gudang.</p>
      </div>

      <!-- Warehouse selector -->
      <div class="w-full sm:w-72">
        <select
          v-model="selectedWarehouseId"
          class="form-select"
          :disabled="loadingWarehouses"
        >
          <option :value="null" disabled>Pilih Gudang</option>
          <option v-for="w in warehouses" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading warehouses -->
    <div v-if="loadingWarehouses" class="flex items-center justify-center py-16">
      <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- No warehouse -->
    <div v-else-if="!warehouses.length" class="py-16 text-center text-sm text-gray-400">
      Belum ada gudang. Tambahkan gudang terlebih dahulu di menu Gudang.
    </div>

    <!-- Main content: 3-column cascade  -->
    <div v-else-if="selectedWarehouseId" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- ═══ ZONES COLUMN ═══ -->
      <div class="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <!-- Column header -->
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div class="flex items-center gap-2">
            <Layers class="h-4 w-4 text-blue-500" />
            <h2 class="text-sm font-semibold text-gray-900">Zone</h2>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{{ zones.length }}</span>
          </div>
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Refresh"
              @click="fetchZones"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingZones }" />
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Tambah Zone"
              @click="openCreateZone"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Zone list -->
        <div class="flex-1 overflow-y-auto" style="max-height: 60vh;">
          <div v-if="loadingZones" class="flex items-center justify-center py-10">
            <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
          </div>
          <div v-else-if="!zones.length" class="py-10 text-center text-xs text-gray-400">
            Belum ada zone.
          </div>
          <div v-else>
            <button
              v-for="(z, zi) in zones"
              :key="z.id"
              type="button"
              draggable="true"
              class="group flex w-full items-center gap-2 border-b border-gray-50 px-3 py-3 text-left transition-colors hover:bg-gray-50"
              :class="[
                selectedZoneId === z.id ? 'bg-blue-100 ring-1 ring-blue-200 hover:bg-blue-100' : '',
                dragType === 'zone' && dragOverIndex === zi && dragIndex !== zi ? 'border-t-2 border-t-blue-400' : '',
              ]"
              @click="selectedZoneId = z.id"
              @dragstart="onDragStart('zone', zi, $event)"
              @dragover="onDragOver('zone', zi, $event)"
              @drop="onDrop('zone', zi)"
              @dragend="onDragEnd"
            >
              <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900">{{ z.name }}</p>
                <p class="text-xs text-gray-400">{{ z.code }} · {{ z.rack_count || 0 }} rack</p>
              </div>
              <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" :class="{ 'opacity-100': selectedZoneId === z.id }">
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                  title="Edit"
                  @click.stop="openEditZone(z)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Hapus"
                  @click.stop="deleteZone(z)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-gray-300" :class="{ 'text-blue-500': selectedZoneId === z.id }" />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ RACKS COLUMN ═══ -->
      <div class="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div class="flex items-center gap-2">
            <Grid3x3 class="h-4 w-4 text-emerald-500" />
            <h2 class="text-sm font-semibold text-gray-900">Rack</h2>
            <span v-if="selectedZoneId" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{{ racks.length }}</span>
          </div>
          <div v-if="selectedZoneId" class="flex items-center gap-0.5">
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Refresh"
              @click="fetchRacks"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingRacks }" />
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Tambah Rack"
              @click="openCreateRack"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto" style="max-height: 60vh;">
          <div v-if="!selectedZoneId" class="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Layers class="h-8 w-8 text-gray-200" />
            <p class="text-xs text-gray-400">Pilih zone untuk melihat rack.</p>
          </div>
          <div v-else-if="loadingRacks" class="flex items-center justify-center py-10">
            <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
          </div>
          <div v-else-if="!racks.length" class="py-10 text-center text-xs text-gray-400">
            Belum ada rack di zone ini.
          </div>
          <div v-else>
            <button
              v-for="(r, ri) in racks"
              :key="r.id"
              type="button"
              draggable="true"
              class="group flex w-full items-center gap-2 border-b border-gray-50 px-3 py-3 text-left transition-colors hover:bg-gray-50"
              :class="[
                selectedRackId === r.id ? 'bg-emerald-100 ring-1 ring-emerald-200 hover:bg-emerald-100' : '',
                dragType === 'rack' && dragOverIndex === ri && dragIndex !== ri ? 'border-t-2 border-t-emerald-400' : '',
              ]"
              @click="selectedRackId = r.id"
              @dragstart="onDragStart('rack', ri, $event)"
              @dragover="onDragOver('rack', ri, $event)"
              @drop="onDrop('rack', ri)"
              @dragend="onDragEnd"
            >
              <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900">{{ r.name }}</p>
                <p class="text-xs text-gray-400">{{ r.code }} · {{ r.bin_count || 0 }} bin</p>
              </div>
              <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" :class="{ 'opacity-100': selectedRackId === r.id }">
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                  title="Edit"
                  @click.stop="openEditRack(r)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Hapus"
                  @click.stop="deleteRack(r)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-gray-300" :class="{ 'text-emerald-500': selectedRackId === r.id }" />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ BINS COLUMN ═══ -->
      <div class="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div class="flex items-center gap-2">
            <Package class="h-4 w-4 text-amber-500" />
            <h2 class="text-sm font-semibold text-gray-900">Bin</h2>
            <span v-if="selectedRackId" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{{ bins.length }}</span>
          </div>
          <div v-if="selectedRackId" class="flex items-center gap-0.5">
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Refresh"
              @click="fetchBins"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingBins }" />
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              title="Tambah Bin"
              @click="openCreateBin"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto" style="max-height: 60vh;">
          <div v-if="!selectedRackId" class="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Grid3x3 class="h-8 w-8 text-gray-200" />
            <p class="text-xs text-gray-400">Pilih rack untuk melihat bin.</p>
          </div>
          <div v-else-if="loadingBins" class="flex items-center justify-center py-10">
            <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
          </div>
          <div v-else-if="!bins.length" class="py-10 text-center text-xs text-gray-400">
            Belum ada bin di rack ini.
          </div>
          <div v-else>
            <div
              v-for="(b, bi) in bins"
              :key="b.id"
              draggable="true"
              class="group flex cursor-default items-center gap-2 border-b border-gray-50 px-3 py-3 transition-colors hover:bg-gray-50"
              :class="dragType === 'bin' && dragOverIndex === bi && dragIndex !== bi ? 'border-t-2 border-t-amber-400' : ''"
              @dragstart="onDragStart('bin', bi, $event)"
              @dragover="onDragOver('bin', bi, $event)"
              @drop="onDrop('bin', bi)"
              @dragend="onDragEnd"
            >
              <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900">{{ b.code }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                  title="Edit"
                  @click="openEditBin(b)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Hapus"
                  @click="deleteBin(b)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Breadcrumb path indicator -->
    <div v-if="selectedWarehouseId" class="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
      <MapPinned class="h-3.5 w-3.5" />
      <span class="font-medium text-gray-600">{{ selectedWarehouse?.name }}</span>
      <template v-if="selectedZone">
        <ChevronRight class="h-3 w-3" />
        <span class="font-medium text-blue-600">{{ selectedZone.name }}</span>
      </template>
      <template v-if="selectedRack">
        <ChevronRight class="h-3 w-3" />
        <span class="font-medium text-emerald-600">{{ selectedRack.name }}</span>
      </template>
    </div>

    <!-- ═══ MODALS ═══ -->

    <!-- Zone Modal -->
    <Teleport to="body">
      <div v-if="showZoneModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showZoneModal = false">
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ editingZoneId ? 'Edit Zone' : 'Tambah Zone' }}</h2>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Zone <span class="text-red-500">*</span></label>
              <input v-model="zoneForm.name" type="text" class="form-input" placeholder="Nama zone" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Zone <span class="text-red-500">*</span></label>
              <input v-model="zoneForm.code" type="text" class="form-input" placeholder="Contoh: ZA" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
              <input v-model.number="zoneForm.sort" type="number" min="0" class="form-input" />
            </div>
          </div>
          <div class="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showZoneModal = false">
              Batal
            </button>
            <button
              type="button"
              :disabled="savingZone || !zoneForm.name || !zoneForm.code"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="saveZone"
            >
              {{ savingZone ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rack Modal -->
    <Teleport to="body">
      <div v-if="showRackModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showRackModal = false">
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ editingRackId ? 'Edit Rack' : 'Tambah Rack' }}</h2>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Rack <span class="text-red-500">*</span></label>
              <input v-model="rackForm.name" type="text" class="form-input" placeholder="Nama rack" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Rack <span class="text-red-500">*</span></label>
              <input v-model="rackForm.code" type="text" class="form-input" placeholder="Contoh: R1" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
              <input v-model.number="rackForm.sort" type="number" min="0" class="form-input" />
            </div>
          </div>
          <div class="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showRackModal = false">
              Batal
            </button>
            <button
              type="button"
              :disabled="savingRack || !rackForm.name || !rackForm.code"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="saveRack"
            >
              {{ savingRack ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bin Modal -->
    <Teleport to="body">
      <div v-if="showBinModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showBinModal = false">
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ editingBinId ? 'Edit Bin' : 'Tambah Bin' }}</h2>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Bin <span class="text-red-500">*</span></label>
              <input v-model="binForm.code" type="text" class="form-input" placeholder="Contoh: B1" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
              <input v-model.number="binForm.sort" type="number" min="0" class="form-input" />
            </div>
          </div>
          <div class="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showBinModal = false">
              Batal
            </button>
            <button
              type="button"
              :disabled="savingBin || !binForm.code"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="saveBin"
            >
              {{ savingBin ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.form-select {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
