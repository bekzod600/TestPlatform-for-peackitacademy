<!-- components/skeleton/AvatarSkeleton.vue -->
<template>
  <BaseSkeleton :class="`rounded-full ${sizeClass}`" />
</template>

<script setup lang="ts">
import BaseSkeleton from "./BaseSkeleton.vue"

interface Props {
  size?: "sm" | "md" | "lg"
}

const props = withDefaults(defineProps<Props>(), {
  size: "md"
})

const sizeClass = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
}[props.size]
</script>
