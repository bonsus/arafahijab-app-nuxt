<script setup lang="ts">
const sidebar = useSidebar()
const { fetchStores } = useWebsiteStore()

onMounted(() => {
  if (window.innerWidth >= 1024) {
    sidebar.open()
  }
  fetchStores()
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <WebsiteSidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <WebsiteTopbar />

      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
