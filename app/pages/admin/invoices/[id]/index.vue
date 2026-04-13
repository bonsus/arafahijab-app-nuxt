<script setup lang="ts">
import { ArrowLeft, BookX, EditIcon, HandCoins, Printer, RotateCcwSquare } from 'lucide-vue-next'
import { formatDate } from '@/utils/formatDate'
import { formatCurrency } from '@/utils/formatCurrency'
import html2canvas from 'html2canvas'

useHead({
  title:"Invoice Detail"
})
definePageMeta({
  middleware: "admin"
})
const route = useRoute()
const invoiceId = route.params.id

const { data: invoice, pending, refresh, error } = await useFetch(`/api/admin/invoices/${invoiceId}`, {
  method: 'GET'
})

const printTarget = ref<HTMLElement | null>(null)
const canvasImage = ref<string | null>(null)
const Print = async() => {
  if (!printTarget.value) return

  const canvas = await html2canvas(printTarget.value, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  canvasImage.value = canvas.toDataURL('image/png')

  requestAnimationFrame(() => {
    window.print()
  })
}

const deleteItem = ref({} as any)
const invoiceStatus = ref({} as any)
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-top justify-between">
        <div class="flex-1">
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/invoices')">
            <ArrowLeft class="me-2" />
            Back to Invoices
          </Button>
          <!-- <div>
            <h1 class="text-2xl font-bold text-gray-900">Invoice Details</h1>
          </div> -->
        </div>
        <div>
          <Button v-if="invoice?.status === 'unpaid'" variant="outline" class="ms-2" @click="navigateTo(`/admin/invoices/${invoice?.id}/edit`)">
            <EditIcon/> Edit Invoice
          </Button>
          <Button variant="outline" class="ms-2" @click="Print()">
            <Printer/> Print Invoice
          </Button>
          <Button v-if="invoice?.status === 'unpaid'" variant="default" class="ms-2" @click="navigateTo(`/admin/invoices/${invoice?.id}/pay`)">
            <HandCoins /> Pay Invoice
          </Button>
          <Button @click="invoiceStatus = { id: invoice.id, no: invoice.no, open: true, status: invoice.status }" v-if="invoice?.status === 'unpaid' || invoice?.status =='canceled' || invoice?.status =='deleted'" variant="outline" class="ms-2">
            <RotateCcwSquare/> Change Status
          </Button>
          <Button @click="deleteItem = { id: invoice.id, no: invoice.no, open: true }" v-if="invoice?.status === 'unpaid' || invoice?.status === 'canceled'" variant="destructive" class="ms-2">
            <BookX /> Delete Invoice
          </Button>
        </div>
      </div>
      <div ref="printTarget" class="w-full max-w-3xl mx-auto border">
        <Card>
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
              <div class="text-right text-sm">
                <div>
                  <div class="text-muted-foreground mb-3 uppercase">
                    <Badge v-if="invoice.status=='paid'" class="bg-green-600 text-lg px-6">Paid</Badge>
                    <Badge v-if="invoice.status=='unpaid'" class="bg-amber-500 text-lg px-6">Unpaid</Badge>
                    <Badge v-if="invoice.status=='canceled'" class="bg-red-600 text-lg px-6">Canceled</Badge>
                    <Badge v-if="invoice.status=='deleted'" class="bg-red-300 text-lg px-6">Deleted</Badge>
                  </div>
                  <div class="font-medium">Payment Method</div>
                  <div v-if="invoice.payment_provider=='midtrans'" class="text-muted-foreground">
                    <!-- <span>Midtrans - {{ invoice.payment_method }}</span> -->
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
              </div>
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
                    <div>{{invoice.plan?.name}}</div>
                    <div class="text-xs text-gray-600">{{ invoice.plan?.days }} days</div>
                  </div>
                  <span>{{formatCurrency(invoice?.price)}}</span>
                </div>
              </div>
            </div>

            <!-- Rincian Pembayaran -->
            <div class="border-t pt-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span>{{formatCurrency(invoice.price)}}</span>
              </div>
              <div class="flex justify-between">
                <span>Diskon</span>
                <span>-{{formatCurrency(invoice.discount)}}</span>
              </div>
              <div v-if="invoice.prorated_discount" class="flex justify-between">
                <span>Prorated Discount</span>
                <span>-{{formatCurrency(invoice.prorated_discount)}}</span>
              </div>
              <div class="flex justify-between">
                <span>Unique Fee</span>
                <span>{{formatCurrency(invoice.unique_fee)}}</span>
              </div>
              <div class="flex justify-between font-semibold">
                <span>Total</span>
                <span>{{formatCurrency(invoice.amount)}}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <div v-if="canvasImage" id="canvasPrintOnly" class="hidden">
      <img :src="canvasImage" />
    </div>
    <AdminInvoiceChangeStatusDialog :invoice="invoiceStatus" @refresh="refresh" />
    <AdminInvoiceDeleteDialog :invoice="deleteItem" @refresh="refresh" />
  </NuxtLayout>
</template>
