<script setup lang="ts">
/**
 * ImageUploader — reusable drag-and-drop / click-to-upload component
 *
 * Props:
 *   modelValue   — current image URL (shown as preview)
 *   isUploading  — external loading state (while parent saves to DB)
 *   label        — optional label text
 *   hint         — optional hint below the uploader
 *   shape        — 'circle' | 'square' (default: 'circle')
 *   size         — 'sm' | 'md' | 'lg' (default: 'md')
 *   disabled     — disable all interaction
 *   error        — validation / upload error message to show
 *
 * Emits:
 *   file-selected(file: File)  — emitted when a valid file is chosen
 *   remove()                   — emitted when the user clicks remove
 */

import { ref, computed } from 'vue'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-vue-next'
import { validateImageFile } from '@/composables/useImageUpload'

// ---------------------------------------------------------------------------
// Props & Emits
// ---------------------------------------------------------------------------
const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    isUploading?: boolean
    label?: string
    hint?: string
    shape?: 'circle' | 'square'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    error?: string | null
  }>(),
  {
    modelValue: null,
    isUploading: false,
    label: undefined,
    hint: undefined,
    shape: 'circle',
    size: 'md',
    disabled: false,
    error: null,
  },
)

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
  (e: 'remove'): void
}>()

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const localError = ref<string | null>(null)
const localPreview = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const previewSrc = computed(() => localPreview.value ?? props.modelValue ?? null)

const hasImage = computed(() => !!previewSrc.value)

const containerSizeClass = computed(() => {
  const map = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }
  return map[props.size]
})

const shapeClass = computed(() =>
  props.shape === 'circle' ? 'rounded-full' : 'rounded-xl',
)

const errorText = computed(() => localError.value ?? props.error ?? null)

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function openPicker() {
  if (props.disabled || props.isUploading) return
  fileInput.value?.click()
}

function processFile(file: File) {
  localError.value = null

  const validationErr = validateImageFile(file)
  if (validationErr) {
    localError.value = validationErr.message
    return
  }

  // Create local preview
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
  }
  localPreview.value = URL.createObjectURL(file)

  emit('file-selected', file)
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) processFile(file)
  // Reset input so the same file can be re-selected if needed
  target.value = ''
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (!props.disabled && !props.isUploading) {
    isDragging.value = true
  }
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  if (props.disabled || props.isUploading) return

  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function handleRemove(event: Event) {
  event.stopPropagation()
  localError.value = null
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
    localPreview.value = null
  }
  emit('remove')
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Label -->
    <span v-if="label" class="text-sm font-medium text-foreground">{{ label }}</span>

    <div class="flex items-center gap-4">
      <!-- Upload zone -->
      <div
        :class="[
          'relative shrink-0 cursor-pointer overflow-hidden border-2 transition-all duration-200',
          containerSizeClass,
          shapeClass,
          isDragging
            ? 'border-primary bg-primary/5 scale-105'
            : hasImage
              ? 'border-transparent'
              : 'border-dashed border-border hover:border-primary/60 hover:bg-accent/40',
          (disabled || isUploading) && 'pointer-events-none opacity-60',
          errorText && !hasImage && 'border-destructive',
        ]"
        @click="openPicker"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        role="button"
        :tabindex="disabled ? -1 : 0"
        @keydown.enter.prevent="openPicker"
        @keydown.space.prevent="openPicker"
        :aria-label="hasImage ? 'Rasmni almashtirish' : 'Rasm yuklash'"
      >
        <!-- Preview image -->
        <img
          v-if="hasImage && !isUploading"
          :src="previewSrc!"
          alt="Preview"
          :class="['absolute inset-0 h-full w-full object-cover', shapeClass]"
        />

        <!-- Uploading spinner overlay -->
        <div
          v-if="isUploading"
          class="absolute inset-0 flex items-center justify-center bg-background/70"
        >
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>

        <!-- Empty state / hover overlay -->
        <div
          v-if="!isUploading"
          :class="[
            'absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200',
            hasImage
              ? 'bg-black/40 opacity-0 hover:opacity-100'
              : 'bg-transparent opacity-100',
          ]"
        >
          <Upload
            :class="[
              'h-5 w-5',
              hasImage ? 'text-white' : 'text-muted-foreground',
            ]"
          />
          <span
            v-if="!hasImage"
            class="mt-1 text-center text-[10px] leading-tight text-muted-foreground px-1"
          >
            {{ isDragging ? 'Qo\'yib yuboring' : 'Bosing yoki\nsuring' }}
          </span>
        </div>

        <!-- No-image placeholder icon -->
        <div
          v-if="!hasImage && !isUploading"
          class="absolute inset-0 flex items-center justify-center"
        >
          <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
        </div>
      </div>

      <!-- Right side: action buttons + info -->
      <div class="flex flex-col gap-2 min-w-0">
        <!-- Choose button -->
        <button
          type="button"
          @click="openPicker"
          :disabled="disabled || isUploading"
          class="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Upload class="h-3.5 w-3.5" />
          {{ hasImage ? 'Almashtirish' : 'Rasm tanlash' }}
        </button>

        <!-- Remove button (only shown when there's an image) -->
        <button
          v-if="hasImage"
          type="button"
          @click="handleRemove"
          :disabled="disabled || isUploading"
          class="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <X class="h-3.5 w-3.5" />
          O'chirish
        </button>

        <!-- Hint -->
        <p v-if="hint" class="text-[11px] text-muted-foreground leading-snug">
          {{ hint }}
        </p>

        <!-- Error -->
        <p v-if="errorText" class="text-[11px] text-destructive leading-snug">
          {{ errorText }}
        </p>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
