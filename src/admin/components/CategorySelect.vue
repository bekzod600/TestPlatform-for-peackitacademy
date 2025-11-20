<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', +$event.target.value)"
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
  >
    <option value="">Kategoriyasini tanlang</option>
    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
      {{ cat.name }}
    </option>
  </select>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  }
})

defineEmits(['update:modelValue'])
</script>
