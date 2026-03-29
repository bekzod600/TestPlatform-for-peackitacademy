<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
} from 'lucide-vue-next'
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/api/admin.api'
import { useToast } from '@/components/ui/toast/useToast'
import type { Subject, SubjectInsert } from '@/types'

const { toast } = useToast()

const isLoading = ref(true)
const subjects = ref<Subject[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const deletingId = ref<number | null>(null)
const deletingName = ref('')
const isDeleting = ref(false)

const form = ref<SubjectInsert>({
  name: '',
  description: '',
  is_active: true,
})

function resetForm() {
  form.value = { name: '', description: '', is_active: true }
  editingId.value = null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(subject: Subject) {
  editingId.value = subject.id
  form.value = {
    name: subject.name,
    description: subject.description ?? '',
    is_active: subject.is_active,
  }
  showForm.value = true
}

function confirmDelete(subject: Subject) {
  deletingId.value = subject.id
  deletingName.value = subject.name
  showDeleteModal.value = true
}

async function loadSubjects() {
  isLoading.value = true
  try {
    const result = await fetchSubjects()
    if (result.success && result.data) {
      subjects.value = result.data
    }
  } catch (err) {
    toast({ title: 'Xatolik', description: 'Fanlarni yuklashda xatolik', variant: 'destructive' })
  } finally {
    isLoading.value = false
  }
}

async function saveSubject() {
  if (!form.value.name.trim()) {
    toast({ title: 'Fan nomi kiritilmagan', variant: 'destructive' })
    return
  }
  isSaving.value = true
  try {
    if (editingId.value) {
      const res = await updateSubject(editingId.value, form.value)
      if (res.success) {
        toast({ title: 'Fan yangilandi', variant: 'success' })
      } else {
        toast({ title: 'Xatolik', description: res.error ?? 'Yangilashda xatolik', variant: 'destructive' })
        return
      }
    } else {
      const res = await createSubject(form.value)
      if (res.success) {
        toast({ title: 'Fan qo\'shildi', variant: 'success' })
      } else {
        toast({ title: 'Xatolik', description: res.error ?? 'Qo\'shishda xatolik', variant: 'destructive' })
        return
      }
    }
    showForm.value = false
    resetForm()
    await loadSubjects()
  } catch (err) {
    toast({ title: 'Xatolik', description: 'Kutilmagan xatolik', variant: 'destructive' })
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    const res = await deleteSubject(deletingId.value)
    if (res.success) {
      toast({ title: 'Fan o\'chirildi', variant: 'success' })
      showDeleteModal.value = false
      deletingId.value = null
      await loadSubjects()
    } else {
      toast({ title: 'Xatolik', description: res.error ?? 'O\'chirishda xatolik', variant: 'destructive' })
    }
  } catch (err) {
    toast({ title: 'Xatolik', description: 'O\'chirishda xatolik', variant: 'destructive' })
  } finally {
    isDeleting.value = false
  }
}

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return subjects.value
  const q = searchQuery.value.toLowerCase()
  return subjects.value.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description?.toLowerCase().includes(q)
  )
})

onMounted(loadSubjects)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Fanlar</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Jami: {{ subjects.length }} ta fan
        </p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
      >
        <Plus class="w-4 h-4" />
        Qo'shish
      </button>
    </div>

    <!-- Search -->
    <div class="relative max-w-sm">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Fan nomi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filtered.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <BookOpen class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">
        {{ searchQuery ? 'Natija topilmadi' : 'Fanlar yo\'q' }}
      </h3>
      <p class="text-sm text-muted-foreground mt-1">
        {{ searchQuery ? 'Boshqa kalit so\'z bilan qidiring' : 'Yangi fan qo\'shish uchun tugmani bosing' }}
      </p>
    </div>

    <!-- Subjects list -->
    <div v-else class="space-y-3">
      <div
        v-for="subject in filtered"
        :key="subject.id"
        class="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <BookOpen class="w-5 h-5 text-primary" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ subject.name }}</p>
            <p v-if="subject.description" class="text-xs text-muted-foreground truncate">
              {{ subject.description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              subject.is_active
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            ]"
          >
            {{ subject.is_active ? 'Faol' : 'Nofaol' }}
          </span>
          <button
            @click="openEdit(subject)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Tahrirlash"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            @click="confirmDelete(subject)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="O'chirish"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Slide-over Form -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showForm" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50" @click="showForm = false" />
          <Transition
            enter-active-class="transition-transform duration-300"
            leave-active-class="transition-transform duration-300"
            enter-from-class="translate-x-full"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="showForm"
              class="relative w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h3 class="text-lg font-semibold text-foreground">
                  {{ editingId ? 'Fanni tahrirlash' : 'Yangi fan' }}
                </h3>
                <button
                  @click="showForm = false"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <!-- Form body -->
              <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">Fan nomi <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Masalan: Matematika"
                    class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">Tavsif</label>
                  <textarea
                    v-model="form.description"
                    placeholder="Fan haqida qisqacha ma'lumot..."
                    rows="3"
                    class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-y transition-colors"
                  />
                </div>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="form.is_active"
                    type="checkbox"
                    class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  <span class="text-sm font-medium text-foreground">Faol</span>
                </label>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  @click="showForm = false"
                  class="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="saveSubject"
                  :disabled="isSaving || !form.name.trim()"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                  {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="showDeleteModal = false"
        >
          <div class="w-full max-w-sm bg-background rounded-xl shadow-xl border border-border p-6">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
              <Trash2 class="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 class="text-lg font-semibold text-foreground text-center mb-1">Fanni o'chirish</h3>
            <p class="text-sm text-muted-foreground text-center mb-5">
              <span class="font-medium text-foreground">{{ deletingName }}</span> fanini o'chirishni
              xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div class="flex gap-3">
              <button
                @click="showDeleteModal = false"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin mx-auto" />
                <span v-else>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
