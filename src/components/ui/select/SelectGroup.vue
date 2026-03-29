<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { SelectGroup as SelectGroupPrimitive, type SelectGroupProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends SelectGroupProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <SelectGroupPrimitive
    :class="cn('p-1 w-full', props.class)"
  >
    <slot />
  </SelectGroupPrimitive>
</template>
