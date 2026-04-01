<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'radix-vue'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-vue-next'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from 'date-fns'
import { uz } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Props {
  modelValue: string
  placeholder?: string
  min?: string
  class?: string
  error?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Sanani tanlang',
  min: '',
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const currentMonth = ref(new Date())

// Parse model value
const selectedDate = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(props.modelValue)
  return isNaN(d.getTime()) ? null : d
})

// Time state
const hours = ref('00')
const minutes = ref('00')

// Sync time from modelValue
watch(() => props.modelValue, (val) => {
  if (val) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      hours.value = String(getHours(d)).padStart(2, '0')
      minutes.value = String(getMinutes(d)).padStart(2, '0')
      currentMonth.value = new Date(d.getFullYear(), d.getMonth(), 1)
    }
  }
}, { immediate: true })

// Display value
const displayValue = computed(() => {
  if (!selectedDate.value) return ''
  return format(selectedDate.value, 'dd.MM.yyyy HH:mm', { locale: uz })
})

// Calendar grid
const weekDays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentMonth.value)
  const monthEnd = endOfMonth(currentMonth.value)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }
  return days
})

const monthLabel = computed(() => {
  return format(currentMonth.value, 'LLLL yyyy', { locale: uz })
})

// Min date
const minDate = computed(() => {
  if (!props.min) return null
  const d = new Date(props.min)
  return isNaN(d.getTime()) ? null : d
})

function isDisabled(day: Date) {
  if (!minDate.value) return false
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
  return dayEnd < minDate.value
}

function prevMonth() {
  currentMonth.value = subMonths(currentMonth.value, 1)
}

function nextMonth() {
  currentMonth.value = addMonths(currentMonth.value, 1)
}

function selectDay(day: Date) {
  if (isDisabled(day)) return

  const h = parseInt(hours.value) || 0
  const m = parseInt(minutes.value) || 0
  let newDate = setHours(day, h)
  newDate = setMinutes(newDate, m)
  newDate.setSeconds(0, 0)

  emitValue(newDate)
}

function updateTime() {
  if (!selectedDate.value) return

  const h = Math.min(23, Math.max(0, parseInt(hours.value) || 0))
  const m = Math.min(59, Math.max(0, parseInt(minutes.value) || 0))
  hours.value = String(h).padStart(2, '0')
  minutes.value = String(m).padStart(2, '0')

  let newDate = new Date(selectedDate.value)
  newDate = setHours(newDate, h)
  newDate = setMinutes(newDate, m)
  newDate.setSeconds(0, 0)

  emitValue(newDate)
}

function emitValue(d: Date) {
  // Emit in datetime-local format: YYYY-MM-DDTHH:mm
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  emit('update:modelValue', `${year}-${month}-${day}T${h}:${min}`)
}

function selectToday() {
  const now = new Date()
  hours.value = String(now.getHours()).padStart(2, '0')
  minutes.value = String(now.getMinutes()).padStart(2, '0')
  currentMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
  selectDay(now)
}

function onHoursInput(e: Event) {
  const target = e.target as HTMLInputElement
  let val = target.value.replace(/\D/g, '')
  if (val.length > 2) val = val.slice(0, 2)
  const num = parseInt(val)
  if (!isNaN(num) && num > 23) val = '23'
  hours.value = val
  updateTime()
}

function onMinutesInput(e: Event) {
  const target = e.target as HTMLInputElement
  let val = target.value.replace(/\D/g, '')
  if (val.length > 2) val = val.slice(0, 2)
  const num = parseInt(val)
  if (!isNaN(num) && num > 59) val = '59'
  minutes.value = val
  updateTime()
}
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger as-child>
      <button
        type="button"
        :id="id"
        :class="cn(
          'flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
          'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !displayValue && 'text-muted-foreground',
          error ? 'border-destructive' : 'border-input',
          props.class,
        )"
      >
        <Calendar class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="flex-1 text-left truncate">{{ displayValue || placeholder }}</span>
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        side="bottom"
        :side-offset="4"
        align="start"
        class="z-[100] w-[280px] rounded-xl border border-border bg-card p-0 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        @interact-outside="isOpen = false"
      >
        <!-- Month navigation -->
        <div class="flex items-center justify-between px-3 pt-3 pb-2">
          <button
            type="button"
            @click="prevMonth"
            class="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="text-sm font-medium text-foreground capitalize">{{ monthLabel }}</span>
          <button
            type="button"
            @click="nextMonth"
            class="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <!-- Week day headers -->
        <div class="grid grid-cols-7 px-2">
          <div
            v-for="wd in weekDays"
            :key="wd"
            class="flex items-center justify-center h-8 text-[11px] font-medium text-muted-foreground"
          >
            {{ wd }}
          </div>
        </div>

        <!-- Calendar days -->
        <div class="grid grid-cols-7 px-2 pb-2">
          <button
            v-for="(day, i) in calendarDays"
            :key="i"
            type="button"
            :disabled="isDisabled(day)"
            @click="selectDay(day)"
            :class="cn(
              'inline-flex items-center justify-center h-8 w-full rounded-md text-sm transition-colors',
              !isSameMonth(day, currentMonth) && 'text-muted-foreground/40',
              isSameMonth(day, currentMonth) && !isDisabled(day) && 'text-foreground',
              isDisabled(day) && 'text-muted-foreground/30 cursor-not-allowed',
              isToday(day) && !selectedDate && 'bg-accent font-medium',
              selectedDate && isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground font-medium',
              !selectedDate || !isSameDay(day, selectedDate) ? 'hover:bg-accent' : '',
            )"
          >
            {{ day.getDate() }}
          </button>
        </div>

        <!-- Divider -->
        <div class="border-t border-border" />

        <!-- Time picker -->
        <div class="flex items-center justify-between px-3 py-2.5">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock class="h-3.5 w-3.5" />
            <span>Vaqt</span>
          </div>
          <div class="flex items-center gap-1">
            <input
              :value="hours"
              @input="onHoursInput"
              @blur="hours = String(parseInt(hours) || 0).padStart(2, '0'); updateTime()"
              type="text"
              inputmode="numeric"
              maxlength="2"
              class="h-8 w-10 rounded-md border border-input bg-background text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="00"
            />
            <span class="text-sm font-medium text-muted-foreground">:</span>
            <input
              :value="minutes"
              @input="onMinutesInput"
              @blur="minutes = String(parseInt(minutes) || 0).padStart(2, '0'); updateTime()"
              type="text"
              inputmode="numeric"
              maxlength="2"
              class="h-8 w-10 rounded-md border border-input bg-background text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="00"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-border px-3 py-2">
          <button
            type="button"
            @click="selectToday"
            class="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Bugun
          </button>
          <button
            type="button"
            @click="isOpen = false"
            class="inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Tayyor
          </button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
