<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', +$event.target.value)"
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
  >
    <option value="">Savol guruhini tanlang</option>
    <option v-for="group in groups" :key="group.id" :value="group.id">
      {{ group.name }}
    </option>
  </select>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  groups: {
    type: Array,
    default: () => []
  }
})

defineEmits(['update:modelValue'])
</script>
