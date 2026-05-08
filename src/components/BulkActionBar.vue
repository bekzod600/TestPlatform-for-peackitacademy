<script setup lang="ts">
import { Trash2, CheckCircle, XCircle, X, Loader2 } from 'lucide-vue-next'

interface Props {
  selectedCount: number
  entityLabel: string
  showStatusToggle?: boolean
  isProcessing?: boolean
}

withDefaults(defineProps<Props>(), {
  showStatusToggle: false,
  isProcessing: false,
})

defineEmits<{
  'bulk-delete': []
  'bulk-activate': []
  'bulk-deactivate': []
  'clear-selection': []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="opacity-0 -translate-y-2"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="selectedCount > 0"
      class="flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 mb-4"
    >
      <!-- Count -->
      <span class="text-sm font-medium text-primary whitespace-nowrap">
        {{ selectedCount }} ta {{ entityLabel }} tanlangan
      </span>

      <div class="flex-1" />

      <!-- Action buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <template v-if="showStatusToggle">
          <button
            :disabled="isProcessing"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400 transition-colors disabled:opacity-50"
            @click="$emit('bulk-activate')"
          >
            <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin" />
            <CheckCircle v-else class="w-3.5 h-3.5" />
            Faollashtirish
          </button>
          <button
            :disabled="isProcessing"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400 transition-colors disabled:opacity-50"
            @click="$emit('bulk-deactivate')"
          >
            <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin" />
            <XCircle v-else class="w-3.5 h-3.5" />
            Nofaollashtirish
          </button>
        </template>

        <button
          :disabled="isProcessing"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
          @click="$emit('bulk-delete')"
        >
          <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin" />
          <Trash2 v-else class="w-3.5 h-3.5" />
          O'chirish
        </button>

        <button
          :disabled="isProcessing"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          @click="$emit('clear-selection')"
        >
          <X class="w-3.5 h-3.5" />
          Bekor qilish
        </button>
      </div>
    </div>
  </Transition>
</template>
