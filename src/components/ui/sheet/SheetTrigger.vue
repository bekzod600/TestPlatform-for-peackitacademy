<script setup lang="ts">
import { DialogTrigger as SheetTriggerPrimitive, type DialogTriggerProps } from 'radix-vue'

const props = defineProps<DialogTriggerProps>()
</script>

<template>
  <SheetTriggerPrimitive v-bind="props">
    <slot />
  </SheetTriggerPrimitive>
</template>
