<script setup lang="ts">
import { type Component, computed, ref, onMounted, watch } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardContent from '@/components/ui/card/CardContent.vue'

interface Props {
  title: string
  value: number | string
  description?: string
  icon?: Component
  trend?: number
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const displayValue = ref<string>(typeof props.value === 'string' ? props.value : '0')

const iconContainerClass = computed(() => {
  const base = 'flex h-10 w-10 items-center justify-center rounded-full shrink-0'
  switch (props.variant) {
    case 'primary':
      return cn(base, 'bg-primary/10 text-primary')
    case 'success':
      return cn(base, 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400')
    case 'warning':
      return cn(base, 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400')
    case 'destructive':
      return cn(base, 'bg-destructive/10 text-destructive')
    default:
      return cn(base, 'bg-muted text-muted-foreground')
  }
})

const trendClass = computed(() => {
  if (!props.trend) return ''
  return props.trend > 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
})

function animateCounter(target: number, duration: number = 800) {
  const startTime = performance.now()
  const startValue = 0

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    const current = Math.round(startValue + (target - startValue) * eased)

    displayValue.value = current.toLocaleString()

    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      displayValue.value = target.toLocaleString()
    }
  }

  requestAnimationFrame(update)
}

onMounted(() => {
  if (typeof props.value === 'number') {
    animateCounter(props.value)
  }
})

watch(
  () => props.value,
  (newVal) => {
    if (typeof newVal === 'number') {
      animateCounter(newVal)
    } else {
      displayValue.value = newVal
    }
  },
)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
      <div v-if="icon" :class="iconContainerClass">
        <component :is="icon" class="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold tracking-tight">{{ displayValue }}</span>
        <span
          v-if="trend !== undefined && trend !== 0"
          :class="cn('flex items-center gap-0.5 text-xs font-medium', trendClass)"
        >
          <TrendingUp v-if="trend > 0" class="h-3 w-3" />
          <TrendingDown v-else class="h-3 w-3" />
          {{ Math.abs(trend) }}%
        </span>
      </div>
      <p v-if="description" class="mt-1 text-xs text-muted-foreground">
        {{ description }}
      </p>
    </CardContent>
  </Card>
</template>
