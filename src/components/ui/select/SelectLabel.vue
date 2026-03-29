<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { SelectLabel as SelectLabelPrimitive, type SelectLabelProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends SelectLabelProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <SelectLabelPrimitive
    :class="cn('px-2 py-1.5 text-sm font-semibold', props.class)"
  >
    <slot />
  </SelectLabelPrimitive>
</template>
