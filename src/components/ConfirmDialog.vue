<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import Button from '@/components/ui/button/Button.vue'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Tasdiqlash',
  description: 'Ushbu amalni bajarishni xohlaysizmi?',
  confirmLabel: 'Tasdiqlash',
  cancelLabel: 'Bekor qilish',
  variant: 'default',
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:open': [value: boolean]
}>()

const confirmVariant = computed(() => {
  return props.variant === 'destructive' ? 'destructive' : 'default'
})

function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) {
    emit('cancel')
  }
}

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle :class="cn(variant === 'destructive' && 'text-destructive')">
          {{ title }}
        </DialogTitle>
        <DialogDescription>
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="outline"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelLabel }}
        </Button>
        <Button
          :variant="confirmVariant"
          :disabled="loading"
          @click="handleConfirm"
        >
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
