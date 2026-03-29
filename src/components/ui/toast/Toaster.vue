<script setup lang="ts">
import { useToast } from './useToast'
import Toast from './Toast.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="fixed bottom-0 right-0 z-[100] flex max-h-[100svh] w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col-reverse md:max-w-[420px]">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :id="toast.id"
        :title="toast.title"
        :description="toast.description"
        :variant="toast.variant"
        @dismiss="dismiss"
      />
    </TransitionGroup>
  </div>
</template>
