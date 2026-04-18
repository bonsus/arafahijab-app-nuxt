<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

await navigateTo('/setting/general', { replace: true })
</script>
