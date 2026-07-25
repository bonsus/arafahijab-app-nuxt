<script setup lang="ts">
import { Plus, Loader2, Eye, Trash2 } from 'lucide-vue-next'
import type { Invoice, InvoiceItemType, InvoiceStatus, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const invoices = ref<Invoice[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const statusFilter = ref('')
const search = ref('')

const statuses: InvoiceStatus[] = ['draft', 'open', 'paid', 'void', 'uncollectible']
const itemTypes: InvoiceItemType[] = ['plan', 'addon', 'setup_fee', 'manual_charge', 'discount', 'credit']

const statusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  void: 'bg-gray-100 text-gray-500',
  uncollectible: 'bg-red-50 text-red-700',
}

async function fetchInvoices() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), perpage: String(perPage.value) }
    if (statusFilter.value) params.status = statusFilter.value
    if (search.value) params.search = search.value
    const res = await api.get<AdminResponse<AdminPaginated<Invoice>>>('/admin/subscription/invoices', params)
    invoices.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat invoice')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchInvoices)
watch([page, perPage, statusFilter], fetchInvoices)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchInvoices() }, 400)
}

// ---- Create manual invoice ----
const modalOpen = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  business_id: '',
  subscription_id: '',
  due_days: 7,
  tax: 0,
  discount: 0,
  company_name: '',
  billing_name: '',
  billing_email: '',
  billing_address: '',
  items: [{ type: 'manual_charge' as InvoiceItemType, description: '', quantity: 1, unit_price: 0 }],
})

function openCreate() {
  Object.assign(form, {
    business_id: '', subscription_id: '', due_days: 7, tax: 0, discount: 0,
    company_name: '', billing_name: '', billing_email: '', billing_address: '',
  })
  form.items = [{ type: 'manual_charge', description: '', quantity: 1, unit_price: 0 }]
  formErrors.value = {}
  modalOpen.value = true
}

function addItem() {
  form.items.push({ type: 'manual_charge', description: '', quantity: 1, unit_price: 0 })
}
function removeItem(idx: number) {
  form.items.splice(idx, 1)
}

const computedSubtotal = computed(() => form.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0))
const computedTotal = computed(() => computedSubtotal.value - (Number(form.discount) || 0) + (Number(form.tax) || 0))

async function save() {
  saving.value = true
  formErrors.value = {}
  const payload: Record<string, unknown> = {
    business_id: form.business_id,
    due_days: form.due_days,
    tax: form.tax,
    discount: form.discount,
    company_name: form.company_name,
    billing_name: form.billing_name,
    billing_email: form.billing_email,
    billing_address: form.billing_address,
    items: form.items,
  }
  if (form.subscription_id) payload.subscription_id = form.subscription_id
  try {
    await api.post('/admin/subscription/invoices/create', payload)
    toast.success('Invoice dibuat')
    modalOpen.value = false
    fetchInvoices()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal membuat invoice')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Invoice</h1>
        <p class="mt-1 text-sm text-gray-500">Tagihan langganan & manual.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Invoice Manual
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="flex flex-wrap gap-2 border-b border-gray-100 p-3">
        <input v-model="search" type="text" placeholder="Cari nomor invoice..." class="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" @input="onSearch" />
        <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Semua status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Nomor</th>
            <th class="px-4 py-3">Business</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Jatuh Tempo</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!invoices.length">
            <td colspan="6" class="px-4 py-10 text-center text-gray-400">Belum ada invoice.</td>
          </tr>
          <tr v-for="inv in invoices" :key="inv.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900">{{ inv.invoice_number }}</td>
            <td class="px-4 py-3 text-gray-600">{{ inv.company_name || inv.business_id }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900">{{ inv.currency }} {{ formatCurrency(inv.total) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusBadge[inv.status] || 'bg-gray-100 text-gray-600'">{{ inv.status }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ formatDate(inv.due_date || '') }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end">
                <NuxtLink :to="`/admin/subscription/invoices/${inv.id}`" class="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50" title="Detail">
                  <Eye class="h-4 w-4" />
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <AdminModal v-model="modalOpen" title="Buat Invoice Manual" max-width="max-w-3xl">
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Business ID</label>
            <input v-model="form.business_id" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.business_id" class="mt-1 text-xs text-red-600">{{ formErrors.business_id.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Subscription ID (opsional)</label>
            <input v-model="form.subscription_id" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Perusahaan</label>
            <input v-model="form.company_name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Penagihan</label>
            <input v-model="form.billing_name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Email Penagihan</label>
            <input v-model="form.billing_email" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Alamat Penagihan</label>
            <input v-model="form.billing_address" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <!-- Items -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <label class="text-sm font-medium text-gray-700">Item</label>
            <button class="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50" @click="addItem">
              <Plus class="h-3.5 w-3.5" /> Tambah Item
            </button>
          </div>
          <div v-for="(it, idx) in form.items" :key="idx" class="mb-2 grid grid-cols-12 gap-2">
            <select v-model="it.type" class="col-span-3 rounded-lg border border-gray-300 px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none">
              <option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <input v-model="it.description" type="text" placeholder="Deskripsi" class="col-span-4 rounded-lg border border-gray-300 px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
            <input v-model.number="it.quantity" type="number" min="1" placeholder="Qty" class="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
            <input v-model.number="it.unit_price" type="number" min="0" placeholder="Harga" class="col-span-2 rounded-lg border border-gray-300 px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none" />
            <button class="col-span-1 flex items-center justify-center rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="removeItem(idx)"><Trash2 class="h-4 w-4" /></button>
          </div>
          <p v-if="formErrors.items" class="mt-1 text-xs text-red-600">{{ formErrors.items.join(', ') }}</p>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Jatuh Tempo (hari)</label>
            <input v-model.number="form.due_days" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Diskon</label>
            <input v-model.number="form.discount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Pajak</label>
            <input v-model.number="form.tax" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div class="rounded-lg bg-gray-50 p-3 text-sm">
          <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>{{ formatCurrency(computedSubtotal) }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Diskon</span><span>- {{ formatCurrency(form.discount) }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Pajak</span><span>+ {{ formatCurrency(form.tax) }}</span></div>
          <div class="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900"><span>Total</span><span>{{ formatCurrency(computedTotal) }}</span></div>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="modalOpen = false">Batal</button>
        <button :disabled="saving" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Simpan
        </button>
      </template>
    </AdminModal>
  </div>
</template>
