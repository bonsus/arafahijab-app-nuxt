<script setup lang="ts">
import { Stage, Layer, Rect, Text, Group, Transformer } from 'vue-konva'
import { Loader2, Save, X, ZoomIn, ZoomOut } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ─── Types ───
interface Warehouse {
  id: string
  name: string
  width: number
  height: number
  zones: Zone[]
}

interface Zone {
  id: string
  name: string
  code: string
  x: number
  y: number
  width: number
  height: number
  color: string
  orientation: string
  racks: Rack[]
}

interface Rack {
  id: string
  zone_id: string
  name: string
  code: string
  x: number
  y: number
  width: number
  height: number
  color: string
  orientation: string
  bins: Bin[]
}

interface Bin {
  id: string
  rack_id: string
  code: string
  x: number
  y: number
  width: number
  height: number
  color: string
  orientation: string
}

type SelectedItem = 
  | { type: 'zone', item: Zone }
  | { type: 'rack', item: Rack }
  | { type: 'bin', item: Bin }
  | null

// ─── State ───
const route = useRoute()
const api = useApi()
const toast = useToast()

const warehouseId = computed(() => route.params.id as string)
const warehouses = ref<{ id: string; name: string }[]>([])
const warehouse = ref<Warehouse | null>(null)
const loading = ref(true)
const loadingWarehouses = ref(true)

// Selection & editing
const selected = ref<SelectedItem>(null)
const showModal = ref(false)
const editForm = reactive({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  color: '',
  orientation: '',
})
const saving = ref(false)

// Flat arrays for rendering
const zones = ref<Zone[]>([])
const racks = ref<Rack[]>([])
const bins = ref<Bin[]>([])

// Zoom & Pan state
const scale = ref(1)
const minScale = 0.5
const maxScale = 3
const stageX = ref(0)
const stageY = ref(0)

// Refs for Konva nodes
const stageRef = ref<any>(null)
const transformerRef = ref<any>(null)
const selectedNodeRef = ref<any>(null)

// Pan state
const isPanning = ref(false)
const lastPanPoint = ref({ x: 0, y: 0 })
const wasPanning = ref(false)

// Drag original position tracking
const dragStartPos = ref<{ x: number; y: number } | null>(null)
const childOriginalPositions = ref<Map<string, { x: number; y: number }>>(new Map())

// ─── Fetch warehouse list ───
async function fetchWarehouses() {
  loadingWarehouses.value = true
  try {
    const res = await api.get<{ data: { data: { id: string; name: string }[] } }>('/warehouses/index', { per_page: '100' })
    warehouses.value = res.data?.data || []
  } catch {
    warehouses.value = []
  } finally {
    loadingWarehouses.value = false
  }
}

// ─── Fetch layout ───
async function fetchLayout() {
  if (!warehouseId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: Warehouse }>(`/warehouses/${warehouseId.value}/layout`)
    warehouse.value = res.data
    
    // Transform nested structure to flat arrays
    zones.value = []
    racks.value = []
    bins.value = []
    
    if (warehouse.value?.zones) {
      for (const zone of warehouse.value.zones) {
        zones.value.push(zone)
        
        if (zone.racks) {
          for (const rack of zone.racks) {
            racks.value.push(rack)
            
            if (rack.bins) {
              bins.value.push(...rack.bins)
            }
          }
        }
      }
    }
    
    console.log('Layout loaded:', {
      zones: zones.value.length,
      racks: racks.value.length,
      bins: bins.value.length,
      zonesData: zones.value,
      racksData: racks.value,
      binsData: bins.value
    })
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat layout gudang')
    warehouse.value = null
  } finally {
    loading.value = false
  }
}

// ─── Navigate to warehouse ───
function goToWarehouse(id: string) {
  navigateTo(`/wms/layout/${id}`)
}

// ─── Selection handlers ───
function selectItem(item: Zone | Rack | Bin, type: 'zone' | 'rack' | 'bin', node?: any) {
  selected.value = { type, item } as any
  editForm.x = item.x
  editForm.y = item.y
  editForm.width = item.width
  editForm.height = item.height
  editForm.color = item.color
  editForm.orientation = item.orientation
  
  // Attach transformer to selected node
  if (node && transformerRef.value) {
    selectedNodeRef.value = node
    const transformer = transformerRef.value.getNode()
    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }
}

function openModal(item: Zone | Rack | Bin, type: 'zone' | 'rack' | 'bin') {
  selected.value = { type, item } as any
  editForm.x = item.x
  editForm.y = item.y
  editForm.width = item.width
  editForm.height = item.height
  editForm.color = item.color
  editForm.orientation = item.orientation
  showModal.value = true
}

function clearSelection(e?: any) {
  // Don't clear if we just finished panning
  if (wasPanning.value) {
    wasPanning.value = false
    return
  }
  
  // Only clear if clicked on empty stage area
  if (e && e.target !== e.target.getStage()) {
    return
  }
  
  selected.value = null
  showModal.value = false
  selectedNodeRef.value = null
  
  if (transformerRef.value) {
    const transformer = transformerRef.value.getNode()
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }
}

// ─── Zoom handlers ───
function zoomIn() {
  if (scale.value < maxScale) {
    scale.value = Math.min(scale.value + 0.2, maxScale)
  }
}

function zoomOut() {
  if (scale.value > minScale) {
    scale.value = Math.max(scale.value - 0.2, minScale)
  }
}

function resetZoom() {
  scale.value = 1
  stageX.value = 0
  stageY.value = 0
}

// ─── Wheel zoom handler ───
function handleWheel(e: any) {
  e.evt.preventDefault()
  
  const stage = e.target.getStage()
  const oldScale = scale.value
  const pointer = stage.getPointerPosition()
  
  const mousePointTo = {
    x: (pointer.x - stageX.value) / oldScale,
    y: (pointer.y - stageY.value) / oldScale,
  }
  
  // Zoom direction
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = direction > 0 
    ? Math.min(oldScale * 1.1, maxScale) 
    : Math.max(oldScale / 1.1, minScale)
  
  scale.value = newScale
  
  // Adjust position to zoom toward mouse
  stageX.value = pointer.x - mousePointTo.x * newScale
  stageY.value = pointer.y - mousePointTo.y * newScale
}

// ─── Pan handlers ───
function handleStageMouseDown(e: any) {
  // Check if clicked on empty area (not on shape)
  if (e.target === e.target.getStage()) {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    isPanning.value = true
    wasPanning.value = false
    lastPanPoint.value = { x: pointer.x, y: pointer.y }
  }
}

function handleStageMouseMove(e: any) {
  if (!isPanning.value) return
  
  wasPanning.value = true
  const stage = e.target.getStage()
  const pointer = stage.getPointerPosition()
  
  const dx = pointer.x - lastPanPoint.value.x
  const dy = pointer.y - lastPanPoint.value.y
  
  stageX.value += dx
  stageY.value += dy
  
  lastPanPoint.value = { x: pointer.x, y: pointer.y }
}

function handleStageMouseUp() {
  isPanning.value = false
}

// ─── Helper: Find parent zone/rack ───
function findZoneForRack(rack: Rack): Zone | undefined {
  return zones.value.find(z => z.id === rack.zone_id)
}

function findRackForBin(bin: Bin): Rack | undefined {
  return racks.value.find(r => r.id === bin.rack_id)
}

// ─── Drag handlers ───
function handleZoneDragStart(zone: Zone, e: any) {
  dragStartPos.value = { x: zone.x, y: zone.y }
  
  // Store original positions of all child racks and bins
  childOriginalPositions.value.clear()
  const zoneRacks = racks.value.filter(r => r.zone_id === zone.id)
  for (const rack of zoneRacks) {
    childOriginalPositions.value.set(rack.id, { x: rack.x ?? 0, y: rack.y ?? 0 })
    
    // Store bin positions too
    const rackBins = bins.value.filter(b => b.rack_id === rack.id)
    for (const bin of rackBins) {
      childOriginalPositions.value.set(bin.id, { x: bin.x ?? 0, y: bin.y ?? 0 })
    }
  }
}

function handleZoneDragMove(zone: Zone, e: any) {
  if (!dragStartPos.value) return
  
  const node = e.target
  const newX = node.x()
  const newY = node.y()
  
  // Calculate delta from original position
  const deltaX = newX - dragStartPos.value.x
  const deltaY = newY - dragStartPos.value.y
  
  // Update zone position
  zone.x = newX
  zone.y = newY
  
  // Move all racks that belong to this zone
  const zoneRacks = racks.value.filter(r => r.zone_id === zone.id)
  for (const rack of zoneRacks) {
    const original = childOriginalPositions.value.get(rack.id)
    if (original) {
      rack.x = original.x + deltaX
      rack.y = original.y + deltaY
    }
    
    // Move all bins in this rack
    const rackBins = bins.value.filter(b => b.rack_id === rack.id)
    for (const bin of rackBins) {
      const binOriginal = childOriginalPositions.value.get(bin.id)
      if (binOriginal) {
        bin.x = binOriginal.x + deltaX
        bin.y = binOriginal.y + deltaY
      }
    }
  }
}

async function handleZoneDragEnd(zone: Zone, e: any) {
  const node = e.target
  const newX = Math.round(node.x())
  const newY = Math.round(node.y())
  
  // Calculate actual delta after rounding
  const deltaX = dragStartPos.value ? newX - dragStartPos.value.x : 0
  const deltaY = dragStartPos.value ? newY - dragStartPos.value.y : 0
  
  // Update zone position
  zone.x = newX
  zone.y = newY
  
  // Update all racks and bins with the FINAL delta (after rounding)
  const zoneRacks = racks.value.filter(r => r.zone_id === zone.id)
  for (const rack of zoneRacks) {
    const rackOriginal = childOriginalPositions.value.get(rack.id)
    if (rackOriginal) {
      rack.x = rackOriginal.x + deltaX
      rack.y = rackOriginal.y + deltaY
    }
    
    // Update bins in this rack
    const rackBins = bins.value.filter(b => b.rack_id === rack.id)
    for (const bin of rackBins) {
      const binOriginal = childOriginalPositions.value.get(bin.id)
      if (binOriginal) {
        bin.x = binOriginal.x + deltaX
        bin.y = binOriginal.y + deltaY
      }
    }
  }
  
  if (selected.value?.type === 'zone' && selected.value.item.id === zone.id) {
    editForm.x = newX
    editForm.y = newY
  }
  
  // Update transformer position
  if (transformerRef.value && selectedNodeRef.value === node) {
    transformerRef.value.getNode().forceUpdate()
  }
  
  dragStartPos.value = null
  childOriginalPositions.value.clear()
  
  // Save all moved racks and bins
  for (const rack of zoneRacks) {
    try {
      await api.put(`/warehouses/racks/${rack.id}/update-map`, {
        x: rack.x,
        y: rack.y,
        width: rack.width,
        height: rack.height,
        color: rack.color,
        orientation: rack.orientation,
      })
    } catch {
      // Silent fail
    }
    
    // Save bins
    const rackBins = bins.value.filter(b => b.rack_id === rack.id)
    for (const bin of rackBins) {
      try {
        await api.put(`/warehouses/bins/${bin.id}/update-map`, {
          x: bin.x,
          y: bin.y,
          width: bin.width,
          height: bin.height,
          color: bin.color,
          orientation: bin.orientation,
        })
      } catch {
        // Silent fail
      }
    }
  }
  
  try {
    await api.put(`/warehouses/zones/${zone.id}/update-map`, {
      x: newX,
      y: newY,
      width: zone.width,
      height: zone.height,
      color: zone.color,
      orientation: zone.orientation,
    })
    toast.success('Posisi zone diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan posisi zone')
    fetchLayout()
  }
}

function handleRackDragStart(rack: Rack, e: any) {
  dragStartPos.value = { x: rack.x ?? 0, y: rack.y ?? 0 }
  
  // Store original positions of all child bins
  childOriginalPositions.value.clear()
  const rackBins = bins.value.filter(b => b.rack_id === rack.id)
  for (const bin of rackBins) {
    childOriginalPositions.value.set(bin.id, { x: bin.x ?? 0, y: bin.y ?? 0 })
  }
}

function handleRackDragMove(rack: Rack, e: any) {
  if (!dragStartPos.value) return
  
  const node = e.target
  const newX = node.x()
  const newY = node.y()
  
  // Calculate delta from original position
  const deltaX = newX - dragStartPos.value.x
  const deltaY = newY - dragStartPos.value.y
  
  // Update rack position
  rack.x = newX
  rack.y = newY
  
  // Move all bins that belong to this rack in realtime
  const rackBins = bins.value.filter(b => b.rack_id === rack.id)
  for (const bin of rackBins) {
    const original = childOriginalPositions.value.get(bin.id)
    if (original) {
      bin.x = original.x + deltaX
      bin.y = original.y + deltaY
    }
  }
}

async function handleRackDragEnd(rack: Rack, e: any) {
  const node = e.target
  let newX = Math.round(node.x())
  let newY = Math.round(node.y())
  
  // Clamp rack within zone boundaries
  const zone = findZoneForRack(rack)
  if (zone) {
    const rackW = rack.width ?? 80
    const rackH = rack.height ?? 60
    newX = Math.max(zone.x, Math.min(newX, zone.x + zone.width - rackW))
    newY = Math.max(zone.y, Math.min(newY, zone.y + zone.height - rackH))
    
    // Update node position to clamped value
    node.x(newX)
    node.y(newY)
  }
  
  // Calculate actual delta after clamping
  const deltaX = dragStartPos.value ? newX - dragStartPos.value.x : 0
  const deltaY = dragStartPos.value ? newY - dragStartPos.value.y : 0
  
  // Update rack position first
  rack.x = newX
  rack.y = newY
  
  // Update all bins with the FINAL delta (after clamping)
  const rackBins = bins.value.filter(b => b.rack_id === rack.id)
  for (const bin of rackBins) {
    const original = childOriginalPositions.value.get(bin.id)
    if (original) {
      // Apply final delta from clamped position
      bin.x = original.x + deltaX
      bin.y = original.y + deltaY
    }
  }
  
  dragStartPos.value = null
  childOriginalPositions.value.clear()
  
  // Save positions to API
  for (const bin of rackBins) {
    if (deltaX !== 0 || deltaY !== 0) {
      try {
        await api.put(`/warehouses/bins/${bin.id}/update-map`, {
          x: bin.x,
          y: bin.y,
          width: bin.width,
          height: bin.height,
          color: bin.color,
          orientation: bin.orientation,
        })
      } catch {
        // Silent fail for bin updates
      }
    }
  }
  
  if (selected.value?.type === 'rack' && selected.value.item.id === rack.id) {
    editForm.x = newX
    editForm.y = newY
  }
  
  // Update transformer position
  if (transformerRef.value && selectedNodeRef.value === e.target) {
    transformerRef.value.getNode().forceUpdate()
  }
  
  try {
    await api.put(`/warehouses/racks/${rack.id}/update-map`, {
      x: newX,
      y: newY,
      width: rack.width,
      height: rack.height,
      color: rack.color,
      orientation: rack.orientation,
    })
    toast.success('Posisi rack diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan posisi rack')
    fetchLayout()
  }
}

function handleBinDragStart(bin: Bin, e: any) {
  dragStartPos.value = { x: bin.x ?? 0, y: bin.y ?? 0 }
}

async function handleBinDragEnd(bin: Bin, e: any) {
  const node = e.target
  let newX = Math.round(node.x())
  let newY = Math.round(node.y())
  
  // Clamp bin within rack boundaries
  const rack = findRackForBin(bin)
  if (rack) {
    const binW = bin.width ?? 30
    const binH = bin.height ?? 30
    const rackX = rack.x ?? 0
    const rackY = rack.y ?? 0
    const rackW = rack.width ?? 80
    const rackH = rack.height ?? 60
    
    newX = Math.max(rackX, Math.min(newX, rackX + rackW - binW))
    newY = Math.max(rackY, Math.min(newY, rackY + rackH - binH))
    
    // Update node position to clamped value
    node.x(newX)
    node.y(newY)
  }
  
  dragStartPos.value = null
  
  bin.x = newX
  bin.y = newY
  if (selected.value?.type === 'bin' && selected.value.item.id === bin.id) {
    editForm.x = newX
    editForm.y = newY
  }
  
  // Update transformer position
  if (transformerRef.value && selectedNodeRef.value === e.target) {
    transformerRef.value.getNode().forceUpdate()
  }
  
  try {
    await api.put(`/warehouses/bins/${bin.id}/update-map`, {
      x: newX,
      y: newY,
      width: bin.width,
      height: bin.height,
      color: bin.color,
      orientation: bin.orientation,
    })
    toast.success('Posisi bin diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan posisi bin')
    fetchLayout()
  }
}

// ─── Save property changes ───
async function saveProperties() {
  if (!selected.value) return
  
  saving.value = true
  try {
    const payload = {
      x: Math.round(editForm.x),
      y: Math.round(editForm.y),
      width: Math.round(editForm.width),
      height: Math.round(editForm.height),
      color: editForm.color,
      orientation: editForm.orientation,
    }
    
    if (selected.value.type === 'zone') {
      await api.put(`/warehouses/zones/${selected.value.item.id}/update-map`, payload)
      Object.assign(selected.value.item, payload)
    } else if (selected.value.type === 'rack') {
      await api.put(`/warehouses/racks/${selected.value.item.id}/update-map`, payload)
      Object.assign(selected.value.item, payload)
    } else if (selected.value.type === 'bin') {
      await api.put(`/warehouses/bins/${selected.value.item.id}/update-map`, payload)
      Object.assign(selected.value.item, payload)
    }
    
    toast.success('Properties berhasil disimpan')
    showModal.value = false
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan properties')
  } finally {
    saving.value = false
  }
}

// ─── Transform handler ───
async function handleTransformEnd(item: Zone | Rack | Bin, type: 'zone' | 'rack' | 'bin') {
  if (!selectedNodeRef.value) return
  
  const node = selectedNodeRef.value
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()
  
  // Update dimensions based on scale
  item.width = Math.round(node.width() * scaleX)
  item.height = Math.round(node.height() * scaleY)
  item.x = Math.round(node.x())
  item.y = Math.round(node.y())
  
  // Reset scale to 1 after applying to width/height
  node.scaleX(1)
  node.scaleY(1)
  
  // Update edit form
  if (selected.value?.type === type && (selected.value.item as any).id === (item as any).id) {
    editForm.x = item.x
    editForm.y = item.y
    editForm.width = item.width
    editForm.height = item.height
  }
  
  // Save to API
  const payload = {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    color: item.color,
    orientation: item.orientation,
  }
  
  try {
    const itemId = (item as any).id
    if (type === 'zone') {
      await api.put(`/warehouses/zones/${itemId}/update-map`, payload)
    } else if (type === 'rack') {
      await api.put(`/warehouses/racks/${itemId}/update-map`, payload)
    } else if (type === 'bin') {
      await api.put(`/warehouses/bins/${itemId}/update-map`, payload)
    }
    toast.success('Ukuran diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan ukuran')
    fetchLayout()
  }
}

// ─── Stage config ───
const stageConfig = computed(() => ({
  width: warehouse.value?.width || 1024,
  height: warehouse.value?.height || 600,
  scaleX: scale.value,
  scaleY: scale.value,
  x: stageX.value,
  y: stageY.value,
  draggable: false,
}))

// ─── Lifecycle ───
onMounted(() => {
  fetchWarehouses()
  fetchLayout()
})

watch(warehouseId, () => {
  fetchLayout()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Layout Gudang</h1>
        <p class="text-sm text-gray-500">Scroll untuk zoom, drag area kosong untuk pan, double-click untuk edit properties.</p>
      </div>

      <!-- Warehouse selector -->
      <div class="w-full sm:w-72">
        <select
          :value="warehouseId"
          class="form-select"
          :disabled="loadingWarehouses"
          @change="(e) => goToWarehouse((e.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Pilih Gudang</option>
          <option v-for="w in warehouses" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- No warehouse selected -->
    <div v-else-if="!warehouseId" class="py-16 text-center text-sm text-gray-400">
      Pilih gudang untuk melihat layout.
    </div>

    <!-- Main layout: Canvas Only -->
    <div v-else-if="warehouse" class="overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="p-6">
          <!-- Info -->
          <div class="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ warehouse.name }}</h2>
              <p class="text-sm text-gray-500">{{ stageConfig.width }} × {{ stageConfig.height }} px</p>
            </div>
            <div class="flex gap-4 text-xs text-gray-600">
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded border-2 border-blue-500" />
                <span>Zone ({{ zones.length }})</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded bg-emerald-500" />
                <span>Rack ({{ racks.length }})</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="h-3 w-3 rounded bg-amber-500" />
                <span>Bin ({{ bins.length }})</span>
              </div>
            </div>
          </div>

          <!-- Zoom Controls -->
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <span class="font-medium">Zoom:</span>
              <span class="tabular-nums">{{ Math.round(scale * 100) }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="scale <= minScale"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                @click="zoomOut"
              >
                <ZoomOut class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="resetZoom"
              >
                Reset
              </button>
              <button
                type="button"
                :disabled="scale >= maxScale"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                @click="zoomIn"
              >
                <ZoomIn class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Konva Stage -->
          <div 
            class="border border-gray-200 bg-gray-50" 
            style="width: fit-content;"
            :style="{ cursor: isPanning ? 'grabbing' : 'grab' }"
          >
            <Stage 
              ref="stageRef" 
              :config="stageConfig" 
              @wheel="handleWheel" 
              @mousedown="handleStageMouseDown"
              @mousemove="handleStageMouseMove"
              @mouseup="handleStageMouseUp"
              @mouseleave="handleStageMouseUp"
              @click="(e: any) => clearSelection(e)"
            >
              <Layer>
                <!-- Zones (draggable borders) -->
                <Rect
                  v-for="zone in zones"
                  :key="`zone-${zone.id}`"
                  :config="{
                    x: zone.x,
                    y: zone.y,
                    width: zone.width,
                    height: zone.height,
                    stroke: selected?.type === 'zone' && selected.item.id === zone.id ? '#1D4ED8' : (zone.color || '#3B82F6'),
                    strokeWidth: selected?.type === 'zone' && selected.item.id === zone.id ? 3 : 2,
                    dash: [10, 5],
                    draggable: true,
                    name: 'zone',
                  }"
                  @click="(e: any) => { e.cancelBubble = true; selectItem(zone, 'zone', e.target); }"
                  @dblclick="(e: any) => { e.cancelBubble = true; openModal(zone, 'zone'); }"
                  @dragstart="(e: any) => handleZoneDragStart(zone, e)"
                  @dragmove="(e: any) => handleZoneDragMove(zone, e)"
                  @dragend="(e: any) => handleZoneDragEnd(zone, e)"
                  @transformend="() => handleTransformEnd(zone, 'zone')"
                />
                <Text
                  v-for="zone in zones"
                  :key="`zone-text-${zone.id}`"
                  :config="{
                    x: zone.x + 6,
                    y: zone.y + 6,
                    text: zone.name,
                    fontSize: 13,
                    fontFamily: 'Inter, sans-serif',
                    fill: zone.color || '#3B82F6',
                    fontStyle: 'bold',
                    listening: false,
                  }"
                />

                <!-- Racks (draggable, clickable) -->
                <Rect
                  v-for="rack in racks"
                  :key="`rack-${rack.id}`"
                  :config="{
                    x: rack.x ?? 0,
                    y: rack.y ?? 0,
                    width: rack.width ?? 80,
                    height: rack.height ?? 60,
                    stroke: selected?.type === 'rack' && selected.item.id === rack.id ? '#047857' : (rack.color || '#10B981'),
                    strokeWidth: selected?.type === 'rack' && selected.item.id === rack.id ? 3 : 2,
                    dash: [8, 4],
                    draggable: true,
                    name: 'rack',
                  }"
                  @click="(e: any) => { e.cancelBubble = true; selectItem(rack, 'rack', e.target); }"
                  @dblclick="(e: any) => { e.cancelBubble = true; openModal(rack, 'rack'); }"
                  @dragstart="(e: any) => handleRackDragStart(rack, e)"
                  @dragmove="(e: any) => handleRackDragMove(rack, e)"
                  @dragend="(e: any) => handleRackDragEnd(rack, e)"
                  @transformend="() => handleTransformEnd(rack, 'rack')"
                />
                <Text
                  v-for="rack in racks"
                  :key="`rack-text-${rack.id}`"
                  :config="{
                    x: (rack.x ?? 0) + 6,
                    y: (rack.y ?? 0) + 6,
                    text: rack.name || rack.code || 'Rack',
                    fontSize: 11,
                    fontFamily: 'Inter, sans-serif',
                    fill: rack.color || '#10B981',
                    fontStyle: 'bold',
                    align: 'left',
                    listening: false,
                  }"
                />

                <!-- Bins (draggable, clickable) -->
                <Rect
                  v-for="bin in bins"
                  :key="`bin-${bin.id}`"
                  :config="{
                    x: bin.x ?? 0,
                    y: bin.y ?? 0,
                    width: bin.width ?? 30,
                    height: bin.height ?? 30,
                    fill: bin.color || '#F59E0B',
                    opacity: selected?.type === 'bin' && selected.item.id === bin.id ? 1 : 0.8,
                    stroke: selected?.type === 'bin' && selected.item.id === bin.id ? '#B45309' : '#D97706',
                    strokeWidth: selected?.type === 'bin' && selected.item.id === bin.id ? 2 : 1,
                    draggable: true,
                    name: 'bin',
                  }"
                  @click="(e: any) => { e.cancelBubble = true; selectItem(bin, 'bin', e.target); }"
                  @dblclick="(e: any) => { e.cancelBubble = true; openModal(bin, 'bin'); }"
                  @dragstart="(e: any) => handleBinDragStart(bin, e)"
                  @dragend="(e: any) => handleBinDragEnd(bin, e)"
                  @transformend="() => handleTransformEnd(bin, 'bin')"
                />
                <Text
                  v-for="bin in bins"
                  :key="`bin-text-${bin.id}`"
                  :config="{
                    x: (bin.x ?? 0) + (bin.width ?? 30) / 2,
                    y: (bin.y ?? 0) + (bin.height ?? 30) / 2,
                    text: bin.code || 'Bin',
                    fontSize: 9,
                    fontFamily: 'Inter, sans-serif',
                    fill: '#000000',
                    align: 'center',
                    verticalAlign: 'middle',
                    offsetX: (bin.code || 'Bin').length * 2.2,
                    offsetY: 4.5,
                    listening: false,
                  }"
                />
                
                <!-- Transformer for resize handles -->
                <Transformer
                  ref="transformerRef"
                  :config="{
                    rotateEnabled: false,
                    borderStroke: '#6366F1',
                    borderStrokeWidth: 2,
                    anchorStroke: '#6366F1',
                    anchorFill: '#FFFFFF',
                    anchorSize: 8,
                    anchorCornerRadius: 4,
                  }"
                />
              </Layer>
            </Stage>
          </div>
        </div>
    </div>

    <!-- Properties Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal && selected" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20" @click="clearSelection">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showModal && selected"
              class="w-full max-w-md rounded-xl bg-white shadow-2xl"
              @click.stop
            >
              <!-- Modal Header -->
              <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-gray-900">Edit Properties</h3>
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="{
                      'bg-blue-50 text-blue-700 ring-1 ring-blue-200': selected.type === 'zone',
                      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200': selected.type === 'rack',
                      'bg-amber-50 text-amber-700 ring-1 ring-amber-200': selected.type === 'bin',
                    }"
                  >
                    {{ selected.type === 'zone' ? 'Zone' : selected.type === 'rack' ? 'Rack' : 'Bin' }}
                  </span>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click="clearSelection"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <!-- Modal Body -->
              <div class="space-y-5 p-6">

                <!-- Name/Code -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">
              {{ selected.type === 'bin' ? 'Kode' : 'Nama' }}
            </label>
            <input
              :value="selected.type === 'bin' ? selected.item.code : selected.item.name"
              type="text"
              class="form-input opacity-60"
              disabled
            />
          </div>

          <!-- Grid: X, Y -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Posisi X</label>
              <input v-model.number="editForm.x" type="number" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Posisi Y</label>
              <input v-model.number="editForm.y" type="number" class="form-input" />
            </div>
          </div>

          <!-- Grid: Width, Height -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Width</label>
              <input v-model.number="editForm.width" type="number" min="10" class="form-input" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Height</label>
              <input v-model.number="editForm.height" type="number" min="10" class="form-input" />
            </div>
          </div>

          <!-- Color -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Warna (hex)</label>
            <div class="flex gap-2">
              <input v-model="editForm.color" type="color" class="h-10 w-12 cursor-pointer rounded border border-gray-300" />
              <input v-model="editForm.color" type="text" placeholder="#3B82F6" class="form-input flex-1" />
            </div>
          </div>

          <!-- Orientation -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Orientasi</label>
            <select v-model="editForm.orientation" class="form-select">
              <option value="">-</option>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>

                <!-- Save button -->
                <button
                  type="button"
                  :disabled="saving"
                  class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="saveProperties"
                >
                  <Save class="h-4 w-4" />
                  {{ saving ? 'Menyimpan...' : 'Simpan Properties' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-select,
.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.form-input::placeholder {
  @apply text-gray-400;
}

.form-input:disabled {
  @apply cursor-not-allowed bg-gray-50;
}
</style>
