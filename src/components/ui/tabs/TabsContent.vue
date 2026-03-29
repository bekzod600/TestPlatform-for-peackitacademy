<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { TabsContent as TabsContentPrimitive, type TabsContentProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends TabsContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <TabsContentPrimitive
    v-bind="{ ...props, class: undefined }"
    :class="cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      props.class,
    )"
  >
    <slot />
  </TabsContentPrimitive>
</template>
