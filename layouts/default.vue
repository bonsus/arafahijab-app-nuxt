<!-- layouts/default.vue -->
<template>
  <div>
    <header class="bg-blue-600 text-white p-4">Default Header</header>
    <main class="p-4">
      <slot />
    </main>
    <footer class="bg-gray-100 text-center p-4">Default Footer</footer>
  </div>
</template>
