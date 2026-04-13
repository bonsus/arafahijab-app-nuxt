<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  invoice: { id: string, no: string, open: boolean }
}>()

const errors = reactive({
  status: [],
})
const emit = defineEmits(['refresh'])
const loading = ref(false)
const deleteInvoice = async (id: string) => {
  try {
    loading.value = true
    await $fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    toast.success('Invoice deleted successfully')
    emit('refresh')
  } catch (err:any) {
    if (err?.data?.error) {
      toast.error(err.data.error)
    } else {
      toast.error('Error deleting invoice')
    }
  } finally {
    props.invoice.open = false
    loading.value = false
  }
}
const dial = computed(() => props.invoice.open)
</script>
<template>
  <Dialog v-model:open="invoice.open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete invoice "{{ props.invoice.no }}"? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="justify-end">
        <DialogClose as-child>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
        <Button @click="deleteInvoice(props.invoice.id)" :disabled="loading" variant="destructive" class="ms-2">
          Delete Invoice
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
