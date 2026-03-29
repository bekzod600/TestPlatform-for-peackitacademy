<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DialogTitle as DialogTitlePrimitive, type DialogTitleProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends DialogTitleProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <DialogTitlePrimitive
    :class="cn('text-lg font-semibold leading-none tracking-tight', props.class)"
  >
    <slot />
  </DialogTitlePrimitive>
</template>
