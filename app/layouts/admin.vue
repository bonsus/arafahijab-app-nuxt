<script setup lang="ts">
const sidebar = useAdminSidebar()

onMounted(() => {
  if (window.innerWidth >= 1024) sidebar.open()
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <AdminSidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <AdminTopbar />
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
