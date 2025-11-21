<template>
  <div
    :class="[
      'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
      props.class
    ]"
  ></div>
</template>

<script setup lang="ts">
interface Props {
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: ""
})
</script>
