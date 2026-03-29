<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { AvatarImage as AvatarImagePrimitive } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  src?: string
  alt?: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <AvatarImagePrimitive
    :src="props.src ?? ''"
    :alt="props.alt"
    :class="cn('aspect-square h-full w-full', props.class)"
  />
</template>
