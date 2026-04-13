<script setup lang="ts">
import { toast } from 'vue-sonner'
const props = defineProps<{
  invoice: any
}>()

const form = ref({
  id: props.invoice?.id || '',
  plan_id: props.invoice?.plan_id || '',
  date: props.invoice?.date || '',
  price: props.invoice?.price || 0,
  discount: props.invoice?.discount || 0,
  unique_fee: props.invoice?.unique_fee || 0,
  prorated_discount: props.invoice?.prorated_discount || 0,
  amount: props.invoice?.amount || 0,
  plan: props.invoice?.plan || null,
  user: props.invoice?.user || null,
})
const loading = ref(false)
const error = ref('')
const errors = ref({} as any)
const updateInvoice = async () => {
  try {
    loading.value = true
    const res = await $fetch(`/api/admin/invoices/${props.invoice.id}`, {
      method: 'PUT',
      body: form.value
    })
    toast.success('Invoice updated successfully')
    navigateTo('/admin/invoices/' + props.invoice.id)
  } catch (err:any) {
    error.value = err?.data?.error
    if (error.value){
      toast.error(error.value)
    } else {
      toast.error('Failed to update invoice')
    }
    errors.value = err?.data?.errors || {}
  } finally {
    loading.value = false
  }
}
const { data: plans, refresh, pending } = await useFetch('/api/admin/plans', { method: 'GET', params: {perpage:1000} })
const setTotal = () => {
  form.value.amount = form.value.price - form.value.discount - form.value.prorated_discount + form.value.unique_fee
}
watch(() => form.value.plan, (plan) => {
  if (plan) {
    form.value.price = plan.price
  } else {
    form.value.price = 0
  }
  form.value.price = parseFloat(form.value.price.toString())
  setTotal()
})
watch(() => form.value.price, setTotal)
watch(() => form.value.discount, setTotal)
watch(() => form.value.prorated_discount, setTotal)
watch(() => form.value.unique_fee, setTotal)
</script>
<template>
  <!-- edit invoice form -->
  <Card class="w-full max-w-3xl mx-auto border">
    <CardHeader>
      <div class="flex items-start justify-between">
        <div>
          <CardTitle class="mb-2">Invoice #{{ invoice.no }}</CardTitle>
          <CardDescription>
            <ClientOnly>
              <div class="text-muted-foreground mb-3">{{ formatDate(invoice.date) }}</div>
            </ClientOnly>
          </CardDescription>
        </div>
        <!-- <div class="text-right text-sm">
          <div>
            <div class="text-muted-foreground mb-3 uppercase">
              <Badge v-if="invoice.status=='paid'" class="bg-green-600 text-lg px-6">Paid</Badge>
              <Badge v-if="invoice.status=='unpaid'" class="bg-amber-500 text-lg px-6">Unpaid</Badge>
              <Badge v-if="invoice.status=='canceled'" class="bg-red-600 text-lg px-6">Canceled</Badge>
            </div>
            <div class="font-medium">Payment Method</div>
            <div v-if="invoice.payment_provider=='midtrans'" class="text-muted-foreground">
              <div v-if="invoice.payment_method == 'qris'">
                <img v-if="invoice.payment_data?.qris_url" :src="invoice.payment_data?.qris_url" class="w-10 h-10"/>
              </div>
              <div v-else-if="invoice.payment_data?.data?.va_numbers">
                <span v-for="item of invoice.payment_data?.data?.va_numbers" :key="item.id" class="uppercase">
                  {{ item.bank }} - {{ item.va_number }}
                </span>
              </div>
            </div>
            <div v-else class="text-muted-foreground">
              <span>Transfer Bank</span>
            </div>
            <div v-if="invoice.paid_at && invoice.status=='paid'" class="text-muted-foreground text-xs">
              Paid at: {{ formatDate(invoice.paid_at) }}
            </div>
          </div>
        </div> -->
      </div>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Informasi User -->
      <div>
        <h3 class="text-sm font-semibold text-muted-foreground">User</h3>
        <div class="text-sm">
          <div class="font-medium">{{invoice.user?.name}}</div>
          <div>{{invoice.user?.email}}</div>
        </div>
      </div>

      <!-- Daftar Produk / Plan -->
      <div>
        <h3 class="text-sm font-semibold text-muted-foreground">Product / Plan</h3>
        <div class="divide-y text-sm">
          <div class="flex justify-between py-2">
            <div>
              <Select v-model="form.plan" id="plan_id">
                <SelectTrigger>
                  <SelectValue :placeholder="form.plan?.name || 'Select Plan'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="plan in plans.data" :key="plan.id" :value="plan">
                    {{ plan.name }} | {{ plan.days }} days | {{ formatCurrency(plan.price) }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.plan_id" class="text-red-500 text-xs">{{ errors.plan_id[0] }}</p>
            </div>
            <div>
              <Input v-model="form.price" :aria-invalid="!!errors.price" id="price" type="number" placeholder="Price" class="w-32 text-end" />
              <p v-if="errors.price" class="text-red-500 text-xs">{{ errors.price[0] }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Rincian Pembayaran -->
      <div class="border-t pt-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span>Subtotal</span>
          <Input v-model="form.price" disabled id="subtotal" type="number" placeholder="Subtotal" class="w-32 text-end" />
        </div>
        <div class="flex justify-between">
          <span>Diskon</span>
          <Input v-model="form.discount" :aria-invalid="!!errors.discount" id="discount" type="number" placeholder="Discount" class="w-32 text-end" />
        </div>
        <div class="text-end">
          <p v-if="errors.discount" class="text-red-500 text-xs">{{ errors.discount[0] }}</p>
        </div>
        <div class="flex justify-between">
          <span>Prorated Discount</span>
          <Input v-model="form.prorated_discount" :aria-invalid="!!errors.prorated_discount" id="prorated_discount" type="number" placeholder="Prorated Discount" class="w-32 text-end" />
        </div>
        <div class="text-end">
          <p v-if="errors.prorated_discount" class="text-red-500 text-xs">{{ errors.prorated_discount[0] }}</p>
        </div>
        <div class="flex justify-between">
          <span>Unique Fee</span>
          <Input v-model="form.unique_fee" :aria-invalid="!!errors.unique_fee" id="unique_fee" type="number" placeholder="Unique Fee" class="w-32 text-end" />
        </div>
        <div class="text-end">
          <p v-if="errors.unique_fee" class="text-red-500 text-xs">{{ errors.unique_fee[0] }}</p>
        </div>
        <div class="flex justify-between">
          <span>Total</span>
          <Input v-model="form.amount" disabled id="total" type="number" placeholder="Total" class="w-32 text-end" />
        </div>
        <div class="text-end">
          <p v-if="errors.amount" class="text-red-500 text-xs">{{ errors.amount[0] }}</p>
        </div>
      </div>
      <div>
        <Button :disabled="loading" @click="updateInvoice" class="w-full">
          <Spinner v-if="loading" class="mr-2" />
          Update Invoice
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
