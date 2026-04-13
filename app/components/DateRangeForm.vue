<script setup lang="ts">
import {
  CalendarDate,
  type DateValue,
  isEqualMonth,
  getLocalTimeZone,
  today,
} from '@internationalized/date'

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import { type DateRange, RangeCalendarRoot, useDateFormatter } from 'reka-ui'

import { createMonth, type Grid, toDate } from 'reka-ui/date'
import { type Ref, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import {
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
} from '@/components/ui/range-calendar'


const props = defineProps<{
  date?: {
    start_date: string
    end_date: string
  }
}>()
const open = ref(false)
const value = ref({
  start: props.date?.start_date ? new CalendarDate(...(props.date.start_date.split('-').map(Number) as [number, number, number])) : new CalendarDate(2022, 1, 20),
  end: props.date?.end_date ? new CalendarDate(...(props.date.end_date.split('-').map(Number) as [number, number, number])) : new CalendarDate(2022, 1, 20).add({ days: 20 }),
  // start: new CalendarDate(2022, 1, 20),
  // end: new CalendarDate(2022, 1, 20).add({ days: 20 }),
}) as Ref<DateRange>

const locale = ref('en-US')
const formatter = useDateFormatter(locale.value)

const placeholder = ref(value.value.start) as Ref<DateValue>
const secondMonthPlaceholder = ref(value.value.end) as Ref<DateValue>

const firstMonth = ref(
  createMonth({
    dateObj: placeholder.value,
    locale: locale.value,
    fixedWeeks: true,
    weekStartsOn: 0,
  }),
) as Ref<Grid<DateValue>>
const secondMonth = ref(
  createMonth({
    dateObj: secondMonthPlaceholder.value,
    locale: locale.value,
    fixedWeeks: true,
    weekStartsOn: 0,
  }),
) as Ref<Grid<DateValue>>

function updateMonth(reference: 'first' | 'second', months: number) {
  if (reference === 'first') {
    placeholder.value = placeholder.value.add({ months })
  }
  else {
    secondMonthPlaceholder.value = secondMonthPlaceholder.value.add({
      months,
    })
  }
}

watch(placeholder, (_placeholder) => {
  firstMonth.value = createMonth({
    dateObj: _placeholder,
    weekStartsOn: 0,
    fixedWeeks: false,
    locale: locale.value,
  })
  if (isEqualMonth(secondMonthPlaceholder.value, _placeholder)) {
    secondMonthPlaceholder.value = secondMonthPlaceholder.value.add({
      months: 1,
    })
  }
})

watch(secondMonthPlaceholder, (_secondMonthPlaceholder) => {
  secondMonth.value = createMonth({
    dateObj: _secondMonthPlaceholder,
    weekStartsOn: 0,
    fixedWeeks: false,
    locale: locale.value,
  })
  if (isEqualMonth(_secondMonthPlaceholder, placeholder.value))
    placeholder.value = placeholder.value.subtract({ months: 1 })
})

watch( () => value.value, (newValue) => {
    if (props.date) {
      props.date.start_date = newValue?.start ? newValue.start.toString() : ''
      props.date.end_date = newValue?.end ? newValue.end.toString() : ''
    }
  },
  { deep: true, immediate: true }
)

const items = [
  { value: 0, label: 'Today', range: { start: 0, end: 0 } },
  { value: 1, label: 'Yesterday', range: { start: -1, end: -1 } },
  { value: 2, label: 'Last 7 days', range: { start: -6, end: 0 } },
  { value: 3, label: 'Last 30 days', range: { start: -29, end: 0 } },
  { value: 4, label: 'This Month', range: { start: -new Date().getDate() + 1, end: 0 } },
  { value: 5, label: 'Last Month', range: { start: -new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate() - new Date().getDate(), end: -new Date().getDate() } },
  { value: 6, label: 'Last 90 days', range: { start: -89, end: 0 } },
  { value: 7, label: 'This Year', range: { start: -(new Date().getDate() + new Date().getMonth() * 30 + (new Date().getMonth() > 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate() * (new Date().getMonth() - 1) : 0)) + 1, end: 0 } },
  { value: 8, label: 'Last Year', range: { start: -(365 + new Date().getDate() + new Date().getMonth() * 30 + (new Date().getMonth() > 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate() * (new Date().getMonth() - 1) : 0)), end: -(new Date().getDate() + new Date().getMonth() * 30 + (new Date().getMonth() > 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate() * (new Date().getMonth() - 1) : 0)) } },
]

</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="
          cn(
            'w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )
        "
      >
        <Calendar class="mr-2 h-4 w-4" />
        <template v-if="value.start">
          <template v-if="value.end">
            {{
              formatter.custom(toDate(value.start), {
                dateStyle: "medium",
              })
            }}
            -
            {{
              formatter.custom(toDate(value.end), {
                dateStyle: "medium",
              })
            }}
          </template>

          <template v-else>
            {{
              formatter.custom(toDate(value.start), {
                dateStyle: "medium",
              })
            }}
          </template>
        </template>
        <template v-else>
          Pick a date
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Select
        @update:model-value="(v) => {
          if (!v) return;
          const item = items.find(i => i.value.toString() === v);
          if (!item) return;
          const startDate = today(getLocalTimeZone()).add({ days: item.range.start });
          const endDate = today(getLocalTimeZone()).add({ days: item.range.end });
          value = {
            start: startDate,
            end: endDate
          };
        }"
      >
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="item in items" :key="item.value" :value="item.value.toString()">
        {{ item.label }}
        </SelectItem>
        </SelectContent>
      </Select>
      <RangeCalendarRoot v-slot="{ weekDays }" v-model="value" v-model:placeholder="placeholder" class="p-3">
        <div
          class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0"
        >
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <button
                :class="
                  cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  )
                "
                @click="updateMonth('first', -1)"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <div :class="cn('text-sm font-medium')">
                {{
                  formatter.fullMonthAndYear(
                    toDate(firstMonth.value),
                  )
                }}
              </div>
              <button
                :class="
                  cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  )
                "
                @click="updateMonth('first', 1)"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
            <RangeCalendarGrid>
              <RangeCalendarGridHead>
                <RangeCalendarGridRow>
                  <RangeCalendarHeadCell
                    v-for="day in weekDays"
                    :key="day"
                    class="w-full"
                  >
                    {{ day }}
                  </RangeCalendarHeadCell>
                </RangeCalendarGridRow>
              </RangeCalendarGridHead>
              <RangeCalendarGridBody>
                <RangeCalendarGridRow
                  v-for="(
                    weekDates, index
                  ) in firstMonth.rows"
                  :key="`weekDate-${index}`"
                  class="mt-2 w-full"
                >
                  <RangeCalendarCell
                    v-for="weekDate in weekDates"
                    :key="weekDate.toString()"
                    :date="weekDate"
                  >
                    <RangeCalendarCellTrigger
                      :day="weekDate"
                      :month="firstMonth.value"
                    />
                  </RangeCalendarCell>
                </RangeCalendarGridRow>
              </RangeCalendarGridBody>
            </RangeCalendarGrid>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <button
                :class="
                  cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  )
                "
                @click="updateMonth('second', -1)"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <div :class="cn('text-sm font-medium')">
                {{
                  formatter.fullMonthAndYear(
                    toDate(secondMonth.value),
                  )
                }}
              </div>

              <button
                :class="
                  cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  )
                "
                @click="updateMonth('second', 1)"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
            <RangeCalendarGrid>
              <RangeCalendarGridHead>
                <RangeCalendarGridRow>
                  <RangeCalendarHeadCell
                    v-for="day in weekDays"
                    :key="day"
                    class="w-full"
                  >
                    {{ day }}
                  </RangeCalendarHeadCell>
                </RangeCalendarGridRow>
              </RangeCalendarGridHead>
              <RangeCalendarGridBody>
                <RangeCalendarGridRow
                  v-for="(
                    weekDates, index
                  ) in secondMonth.rows"
                  :key="`weekDate-${index}`"
                  class="mt-2 w-full"
                >
                  <RangeCalendarCell
                    v-for="weekDate in weekDates"
                    :key="weekDate.toString()"
                    :date="weekDate"
                  >
                    <RangeCalendarCellTrigger
                      :day="weekDate"
                      :month="secondMonth.value"
                    />
                  </RangeCalendarCell>
                </RangeCalendarGridRow>
              </RangeCalendarGridBody>
            </RangeCalendarGrid>
          </div>
        </div>
      </RangeCalendarRoot>
      <div class="p-3">
        <Button @click="open = false" size="sm" class="w-full">OK</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
