<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DropdownMenuSeparator as DropdownMenuSeparatorPrimitive, type DropdownMenuSeparatorProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends DropdownMenuSeparatorProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <DropdownMenuSeparatorPrimitive
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>
