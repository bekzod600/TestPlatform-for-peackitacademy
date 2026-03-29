<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { SelectSeparator as SelectSeparatorPrimitive, type SelectSeparatorProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends SelectSeparatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <SelectSeparatorPrimitive
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>
