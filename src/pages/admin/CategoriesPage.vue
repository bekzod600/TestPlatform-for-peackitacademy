<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  BookOpen,
} from 'lucide-vue-next'
import {
  fetchCategories,
  fetchSubjects,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api/admin.api'
import { useToast } from '@/components/ui/toast/useToast'
import type { CategoryWithSubject, Subject, CategoryInsert } from '@/types'

const { toast } = useToast()

const isLoading = ref(true)
const categories = ref<CategoryWithSubject[]>([])
const subjects = ref<Subject[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const searchQuery = ref('')
const subjectFilter = ref<number | ''>('')
const showDeleteModal = ref(false)
const deletingId = ref<number | null>(null)
const deletingName = ref('')
const isDeleting = ref(false)

const form = ref<CategoryInsert>({
  name: '',
  subject_id: null,
  description: '',
})

function resetForm() {
  form.value = { name: '', subject_id: null, description: '' }
  editingId.value = null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(cat: CategoryWithSubject) {
  editingId.value = cat.id
  form.value = {
    name: cat.name,
    subject_id: cat.subject_id ?? null,
    description: cat.description ?? '',
  }
  showForm.value = true
}

function confirmDelete(cat: CategoryWithSubject) {
  deletingId.value = cat.id
  deletingName.value = cat.name
  showDeleteModal.value = true
}

async function loadData() {
  isLoading.value = true
  try {
    const [catsRes, subjectsRes] = await Promise.all([
      fetchCategories(),
      fetchSubjects(),
    ])
    if (catsRes.success && catsRes.data) categories.value = catsRes.data
    if (subjectsRes.success && subjectsRes.data) subjects.value = subjectsRes.data
  } catch {
    toast({ title: 'Xatolik', description: 'Kategoriyalarni yuklashda xatolik', variant: 'destructive' })
  } finally {
    isLoading.value = false
  }
}

async function saveCategory() {
  if (!form.value.name.trim()) {
    toast({ title: 'Kategoriya nomi kiritilmagan', variant: 'destructive' })
    return
  }
  isSaving.value = true
  try {
    const payload: CategoryInsert = {
      name: form.value.name.trim(),
      subject_id: form.value.subject_id || null,
      description: form.value.description?.trim() || null,
    }

    if (editingId.value) {
      const res = await updateCategory(editingId.value, payload)
      if (res.success) {
        toast({ title: 'Kategoriya yangilandi', variant: 'success' })
      } else {
        toast({ title: 'Xatolik', description: res.error ?? 'Yangilashda xatolik', variant: 'destructive' })
        return
      }
    } else {
      const res = await createCategory(payload)
      if (res.success) {
        toast({ title: 'Kategoriya qo\'shildi', variant: 'success' })
      } else {
        toast({ title: 'Xatolik', description: res.error ?? 'Qo\'shishda xatolik', variant: 'destructive' })
        return
      }
    }
    showForm.value = false
    resetForm()
    await loadData()
  } catch {
    toast({ title: 'Xatolik', description: 'Kutilmagan xatolik', variant: 'destructive' })
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    const res = await deleteCategory(deletingId.value)
    if (res.success) {
      toast({ title: 'Kategoriya o\'chirildi', variant: 'success' })
      showDeleteModal.value = false
      deletingId.value = null
      await loadData()
    } else {
      toast({ title: 'Xatolik', description: res.error ?? 'O\'chirishda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'O\'chirishda xatolik', variant: 'destructive' })
  } finally {
    isDeleting.value = false
  }
}

const filtered = computed(() => {
  let result = categories.value
  if (subjectFilter.value !== '') {
    result = result.filter(c => c.subject_id === Number(subjectFilter.value))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.subject?.name.toLowerCase().includes(q)
    )
  }
  return result
})

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Kategoriyalar</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Jami: {{ categories.length }} ta kategoriya
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

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Kategoriya nomi bo'yicha qidirish..."
          class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
        />
      </div>
      <select
        v-model="subjectFilter"
        class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
      >
        <option value="">Barcha fanlar</option>
        <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
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
        <FolderOpen class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">
        {{ searchQuery || subjectFilter ? 'Natija topilmadi' : 'Kategoriyalar yo\'q' }}
      </h3>
      <p class="text-sm text-muted-foreground mt-1">
        {{ searchQuery || subjectFilter ? 'Boshqa filtr bilan qidiring' : 'Yangi kategoriya qo\'shish uchun tugmani bosing' }}
      </p>
    </div>

    <!-- Categories list -->
    <div v-else class="space-y-3">
      <div
        v-for="cat in filtered"
        :key="cat.id"
        class="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 shrink-0">
            <FolderOpen class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ cat.name }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <!-- Parent subject badge -->
              <span
                v-if="cat.subject"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <BookOpen class="w-3 h-3" />
                {{ cat.subject.name }}
              </span>
              <span v-else class="text-xs text-muted-foreground/60">Fan biriktirilmagan</span>
              <!-- Description -->
              <span
                v-if="cat.description"
                class="text-xs text-muted-foreground truncate max-w-[200px]"
              >
                · {{ cat.description }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="openEdit(cat)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Tahrirlash"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            @click="confirmDelete(cat)"
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
                  {{ editingId ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya' }}
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
                  <label class="text-sm font-medium text-foreground">
                    Kategoriya nomi <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Masalan: Algebra"
                    class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">Fan (ixtiyoriy)</label>
                  <select
                    v-model="form.subject_id"
                    class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  >
                    <option :value="null">Tanlanmagan</option>
                    <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-foreground">Tavsif</label>
                  <textarea
                    v-model="form.description"
                    placeholder="Kategoriya haqida qisqacha ma'lumot..."
                    rows="3"
                    class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-y transition-colors"
                  />
                </div>
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
                  @click="saveCategory"
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
            <h3 class="text-lg font-semibold text-foreground text-center mb-1">Kategoriyani o'chirish</h3>
            <p class="text-sm text-muted-foreground text-center mb-5">
              <span class="font-medium text-foreground">{{ deletingName }}</span> kategoriyasini o'chirishni
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
