<script setup lang="ts">
import {
  ArrowLeft, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const customerId = route.params.id as string

const loading = ref(true)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  external_id: '',
  name: '',
  phone: '',
  email: '',
  username: '',
  status: 'active',
  login_status: 'active',
  type: '',
})

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

async function loadCustomer() {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>(`/customers/${customerId}`)
    const d = res.data
    form.external_id = d.external_id || ''
    form.name = d.name || ''
    form.phone = d.phone || ''
    form.email = d.email || ''
    form.username = d.username || ''
    form.status = d.status || 'active'
    form.login_status = d.login_status || 'active'
    form.type = d.type || 'customer'
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data customer')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  formErrors.value = {}
  try {
    const body: Record<string, any> = {
      external_id: form.external_id,
      name: form.name,
      phone: form.phone,
      email: form.email,
      username: form.username,
      status: form.status,
      login_status: form.login_status,
    }
    await api.put(`/customers/${customerId}`, body)
    toast.success('Customer berhasil diperbarui')
    router.push(`/contact/${customerId}`)
  } catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    toast.error(err.message || 'Gagal memperbarui customer')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadCustomer())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        :to="`/contact/${customerId}`"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Edit Customer</h1>
        <p class="mt-0.5 text-sm text-gray-500">Perbarui data customer</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div class="animate-pulse space-y-4">
        <div class="h-5 w-48 rounded bg-gray-200" />
        <div class="grid grid-cols-2 gap-4">
          <div class="h-10 rounded bg-gray-200" />
          <div class="h-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- LEFT (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Dasar</h2>
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Nama customer" />
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-500">{{ getFieldError('name') }}</p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                  <input v-model="form.email" type="email" class="form-input" placeholder="email@example.com" />
                  <p v-if="getFieldError('email')" class="mt-1 text-xs text-red-500">{{ getFieldError('email') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Telepon</label>
                  <input v-model="form.phone" type="text" class="form-input" placeholder="08xxxx" />
                  <p v-if="getFieldError('phone')" class="mt-1 text-xs text-red-500">{{ getFieldError('phone') }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-if="form.type !== 'supplier'">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
                  <input v-model="form.username" type="text" class="form-input" placeholder="Username" />
                  <p v-if="getFieldError('username')" class="mt-1 text-xs text-red-500">{{ getFieldError('username') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">External ID</label>
                  <input v-model="form.external_id" type="text" class="form-input" placeholder="ID dari sistem lain" />
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT (1/3) -->
        <div class="space-y-6">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Pengaturan</h2>
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe</label>
                <input :value="form.type === 'supplier' ? 'Supplier' : 'Customer'" type="text" class="form-input bg-gray-50" disabled />
                <p class="mt-1 text-xs text-gray-400">Tipe tidak bisa diubah</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select v-model="form.status" class="form-input">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div v-if="form.type !== 'supplier'">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status Login</label>
                <select v-model="form.login_status" class="form-input">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="text-xs text-gray-400">
              Untuk mengubah kategori atau password, gunakan menu di halaman detail.
            </p>
          </div>
        </div>
      </div>

      <!-- Sticky bottom -->
      <div class="sticky bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div class="flex items-center justify-end gap-3">
          <NuxtLink
            :to="`/contact/${customerId}`"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </NuxtLink>
          <button
            type="submit"
            :disabled="saving"
            class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
