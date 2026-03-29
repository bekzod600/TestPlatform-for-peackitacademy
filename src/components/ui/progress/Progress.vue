<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import {
  ProgressIndicator,
  ProgressRoot,
  type ProgressRootProps,
} from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends ProgressRootProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
})

const indicatorStyle = computed(() => ({
  transform: `translateX(-${100 - (props.modelValue ?? 0)}%)`,
}))
</script>

<template>
  <ProgressRoot
    v-bind="{ ...props, class: undefined }"
    :class="cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      props.class,
    )"
  >
    <ProgressIndicator
      class="h-full w-full flex-1 bg-primary transition-all"
      :style="indicatorStyle"
    />
  </ProgressRoot>
</template>
