import { ref } from 'vue'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

type ToastInput = Omit<Toast, 'id'>

const toasts = ref<Toast[]>([])

let toastCount = 0

function toast(input: ToastInput) {
  const id = String(toastCount++)
  const newToast: Toast = {
    ...input,
    id,
    duration: input.duration ?? 5000,
  }

  toasts.value = [...toasts.value, newToast]

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismiss(id)
    }, newToast.duration)
  }

  return id
}

function dismiss(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  return {
    toast,
    toasts,
    dismiss,
  }
}
