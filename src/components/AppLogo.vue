<script setup lang="ts">
import { GraduationCap } from 'lucide-vue-next'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: true,
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-5 w-5'
    case 'lg':
      return 'h-10 w-10'
    default:
      return 'h-7 w-7'
  }
})

const textSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-base'
    case 'lg':
      return 'text-2xl'
    default:
      return 'text-lg'
  }
})

const gapSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'gap-1.5'
    case 'lg':
      return 'gap-3'
    default:
      return 'gap-2'
  }
})
</script>

<template>
  <div :class="cn('flex items-center', gapSize)">
    <GraduationCap :class="cn('text-primary shrink-0', iconSize)" />
    <span
      v-if="showText"
      :class="cn('font-bold tracking-tight text-foreground', textSize)"
    >
      Peackit Academy
    </span>
  </div>
</template>
