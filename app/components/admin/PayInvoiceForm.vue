<script setup lang="ts">
import { toast } from 'vue-sonner'
const props = defineProps<{
  invoice: any
}>()

const form = ref({
  id: props.invoice?.id || '',
  paid_at: props.invoice?.paid_at ? formatForDatetimeLocal(props.invoice.paid_at) : new Date().toISOString().slice(0, 16),
  payment_provider: props.invoice?.payment_provider || '',
  payment_method: props.invoice?.payment_method || '',
})
const loading = ref(false)
const error = ref('')
const errors = ref({} as any)
const updatePayInvoice = async () => {
  try {
    loading.value = true
    const dataForm = {
      ...form.value,
      paid_at: form.value.paid_at ? formatToAsiaJakarta(form.value.paid_at) : null,
    }
    const res = await $fetch(`/api/admin/invoices/${props.invoice.id}/pay`, {
      method: 'POST',
      body: dataForm
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
const {data: midtrans, pending: midtransPending} = await useFetch('/api/options/midtrans-bank', {
  method: 'GET'
})
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
      </div>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Rincian Pembayaran -->
      <div class="border-t pt-4 space-y-2 text-sm">
        <div class="flex justify-between font-semibold items-center">
          <span>Total</span>
          <span>{{formatCurrency(invoice.amount)}}</span>
        </div>
        <div class="flex justify-between items-center">
          <Label>Paid At</Label>
          <div>
            <Input v-model="form.paid_at" type="datetime-local" class="w-[200px]" />
            <p v-if="errors.paid_at" class="text-red-500 text-xs">{{ errors.paid_at[0] }}</p>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <Label>Payment Provider</Label>
          <div>
            <Select v-model="form.payment_provider" class="w-[200px]">
              <SelectTrigger>
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="midtrans">Midtrans</SelectItem>
                <SelectItem value="default">Transfer Bank</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.payment_provider" class="text-red-500 text-xs">{{ errors.payment_provider[0] }}</p>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <Label>Payment Method</Label>
          <div>
            <Select v-model="form.payment_method" class="w-[200px]">
              <SelectTrigger>
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                <template v-for="item in midtrans">
                  <SelectItem :value="item.code">{{ item.name }}</SelectItem>
                </template>
                <SelectItem value="transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.payment_method" class="text-red-500 text-xs">{{ errors.payment_method[0] }}</p>
          </div>
        </div>
        <Button @click="updatePayInvoice" :disabled="loading" class="w-full relative">
          <Spinner v-if="loading" class="me-2 absolute left-4" />
          Update Payment
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
