<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

interface Props {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 120,
  strokeWidth: 8,
})

const animatedPercentage = ref(0)

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const center = computed(() => props.size / 2)

const strokeDashoffset = computed(() => {
  const progress = animatedPercentage.value / 100
  return circumference.value * (1 - progress)
})

const strokeColor = computed(() => {
  const pct = props.percentage
  if (pct >= 80) return 'text-green-500 dark:text-green-400'
  if (pct >= 60) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
})


function animateTo(target: number, duration: number = 800) {
  const startTime = performance.now()
  const startValue = animatedPercentage.value

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    animatedPercentage.value = startValue + (target - startValue) * eased

    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      animatedPercentage.value = target
    }
  }

  requestAnimationFrame(update)
}

onMounted(() => {
  animateTo(props.percentage)
})

watch(
  () => props.percentage,
  (newVal) => {
    animateTo(newVal)
  },
)
</script>

<template>
  <div class="inline-flex flex-col items-center gap-2">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="transform -rotate-90"
    >
      <!-- Background track -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="stroke-muted/30"
      />
      <!-- Progress arc -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        :class="strokeColor"
        style="stroke: currentColor; transition: stroke-dashoffset 0.1s ease-out;"
      />
      <!-- Center text -->
      <text
        :x="center"
        :y="center"
        text-anchor="middle"
        dominant-baseline="central"
        class="fill-foreground font-bold"
        :font-size="size * 0.22"
        style="transform: rotate(90deg); transform-origin: center;"
      >
        {{ Math.round(animatedPercentage) }}%
      </text>
    </svg>
    <span
      v-if="label"
      class="text-sm font-medium text-muted-foreground text-center"
    >
      {{ label }}
    </span>
  </div>
</template>
