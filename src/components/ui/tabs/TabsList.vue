<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { TabsList as TabsListPrimitive, type TabsListProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends TabsListProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <TabsListPrimitive
    v-bind="{ ...props, class: undefined }"
    :class="cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      props.class,
    )"
  >
    <slot />
  </TabsListPrimitive>
</template>
