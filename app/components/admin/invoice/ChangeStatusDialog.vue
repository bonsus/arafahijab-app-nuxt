<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  invoice: { id: string, no: string, open: boolean, status: string }
}>()

const form = reactive({
  status: props.invoice.status || ''
})
const errors = reactive({
  status: [],
})
const emit = defineEmits(['refresh'])
const loading = ref(false)
const updateStatus = async () => {
  loading.value = true
  try {
    await $fetch('/api/admin/invoices/' + props.invoice.id + '/status', {
      method: 'PUT',
      body: {
        status: form.status,
      }
    })
    emit('refresh')
    toast.success('Status updated successfully')
    form.status = ''
    props.invoice.open = false
  } catch (err:any) {
    toast.error('Error updating status')
    errors.status = err?.data?.errors?.status || []
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <Dialog v-model:open="invoice.open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Change Status</DialogTitle>
        <DialogDescription>
          Update the status for invoice "{{ props.invoice.no }}".
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="flex flex-col space-y-1.5">
          <Label for="name">Status</Label>
          <Select v-model="form.status" :aria-invalid="errors.status?.length > 0" @input="errors.status=[]" id="status">
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="Array.isArray(errors.status) && errors.status" class="text-xs text-destructive">
            <span v-for="(msg, index) in errors.status" :key="index">{{ msg }}</span>
          </p>
        </div>
      </div>
      <DialogFooter class="justify-end">
        <DialogClose as-child>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
        <Button @click="updateStatus()" :disabled="loading" type="submit" class="ms-2">
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
