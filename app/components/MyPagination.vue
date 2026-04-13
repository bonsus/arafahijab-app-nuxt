<script setup lang="ts">
interface Props {
  data: {
    per_page: any;
    total: any;
    page: any;
    total_page: any;
  };
  pending: boolean;
  query?: {
    page?: number;
  };
}

const props = defineProps<Props>();

const emit = defineEmits(['page-change'])
const refresh = () => {
  emit('page-change', props.query?.page || 1);
};
</script>
<template>
  <div class="flex items-center justify-between mt-4">
    <span class="text-sm text-gray-700">
      Showing {{ props.data.per_page  }} of {{ props.data.total }} items
    </span>
    <div v-if="data.total_page > 1" class="flex items-center space-x-2">
      <Pagination v-if="!pending" v-slot="{ page }" :items-per-page="data.per_page" :total="data.total" :default-page="data.page">
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious @click="query && (query.page = page - 1); refresh()" />
          <template v-for="(item, index) in items" :key="index">
            <PaginationItem
              v-if="item.type === 'page'"
              :value="item.value"
              :is-active="item.value === page"
              @click="query && (query.page = item.value); refresh()"
            >
              {{ item.value }}
            </PaginationItem>
          </template>
          <PaginationEllipsis :index="4" />
          <PaginationNext @click="query && (query.page = page + 1); refresh()" />
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>
