<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { DialogDescription as DialogDescriptionPrimitive, type DialogDescriptionProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends DialogDescriptionProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <DialogDescriptionPrimitive
    :class="cn('text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </DialogDescriptionPrimitive>
</template>
