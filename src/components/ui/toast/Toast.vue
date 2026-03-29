<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { type VariantProps, cva } from 'class-variance-authority'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

export const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive: 'destructive group border-destructive bg-destructive text-destructive-foreground',
        success: 'border-success bg-success text-success-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type ToastVariants = VariantProps<typeof toastVariants>

const props = defineProps<{
  id: string
  title?: string
  description?: string
  variant?: ToastVariants['variant']
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  dismiss: [id: string]
}>()
</script>

<template>
  <div
    :class="cn(toastVariants({ variant }), props.class)"
    role="alert"
  >
    <div class="grid gap-1">
      <div v-if="title" class="text-sm font-semibold">
        {{ title }}
      </div>
      <div v-if="description" class="text-sm opacity-90">
        {{ description }}
      </div>
    </div>
    <button
      class="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
      @click="emits('dismiss', id)"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
