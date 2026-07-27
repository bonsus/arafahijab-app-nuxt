<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

await navigateTo('/setting/business', { replace: true })
</script>
