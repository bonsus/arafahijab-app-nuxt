<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Test UI Components</h1>
    <div class="bg-background text-foreground">halo</div>
    <div class="bg-primary text-foreground">primary</div>
    <div class="bg-primary text-primary-foreground">
      Warna dari CSS var primary
    </div>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Test Input Component:</label>
        <Input v-model="testInput" placeholder="Test input dengan alias @" />
        <Button @click="testInput = ''" class="mt-2">
          Clear Input
        </Button>
      </div>

      <div>
        <p>Input value: {{ testInput }}</p>
      </div>

      <div class="space-y-2">
        <h2 class="text-lg font-semibold">Button Variants:</h2>
        <div class="flex gap-2 flex-wrap">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>

      </div>

      <div class="space-y-2">
        <h2 class="text-lg font-semibold">Button Sizes:</h2>
        <div class="flex gap-2 items-center flex-wrap">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const testInput = ref('')

useHead({
  title: 'Test UI Components'
})
</script>
