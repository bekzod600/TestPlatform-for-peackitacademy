<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  AlertTriangle,
} from 'lucide-vue-next'
import {
  fetchGroupsByTeacher,
  createGroupAsTeacher,
  updateGroupAsTeacher,
  deleteGroupAsTeacher,
} from '@/api/admin.api'
import { useAuthStore } from '@/stores/auth'
import type { UserGroupWithTeacher, UserGroupInsert, UserGroupUpdate } from '@/types'

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
const auth = useAuthStore()
const teacherId = computed(() => auth.user?.id as number)

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)

const groups = ref<UserGroupWithTeacher[]>([])
const searchQuery = ref('')

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return groups.value
  const q = searchQuery.value.toLowerCase()
  return groups.value.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      (g.description ?? '').toLowerCase().includes(q),
  )
})

// Slide-over
const isSheetOpen = ref(false)
const editingGroup = ref<UserGroupWithTeacher | null>(null)
const isEditing = computed(() => editingGroup.value !== null)

const form = reactive({
  name: '',
  description: '',
  is_active: true,
})
const formErrors = reactive<Record<string, string>>({})

// Delete modal
const isDeleteModalOpen = ref(false)
const groupToDelete = ref<UserGroupWithTeacher | null>(null)

// Messages
const errorMessage = ref('')
const successMessage = ref('')

// ---------------------------------------------------------------
// API
// ---------------------------------------------------------------
async function loadGroups() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await fetchGroupsByTeacher(teacherId.value)
    if (result.success && result.data) {
      groups.value = result.data
    } else {
      errorMessage.value = result.error ?? 'Guruhlarni yuklashda xatolik'
    }
  } catch (err) {
    errorMessage.value = 'Guruhlarni yuklashda xatolik'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------
function openCreateSheet() {
  editingGroup.value = null
  resetForm()
  isSheetOpen.value = true
}

function openEditSheet(group: UserGroupWithTeacher) {
  editingGroup.value = group
  form.name = group.name
  form.description = group.description ?? ''
  form.is_active = group.is_active
  clearFormErrors()
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  editingGroup.value = null
  resetForm()
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.is_active = true
  clearFormErrors()
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
}

// ---------------------------------------------------------------
// Validation
// ---------------------------------------------------------------
function validateForm(): boolean {
  clearFormErrors()
  let valid = true
  if (!form.name.trim()) {
    formErrors.name = 'Guruh nomi kiritilishi shart'
    valid = false
  }
  return valid
}

// ---------------------------------------------------------------
// Submit
// ---------------------------------------------------------------
async function handleSubmit() {
  if (!validateForm()) return
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isEditing.value && editingGroup.value) {
      const payload: UserGroupUpdate = {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
      }
      const result = await updateGroupAsTeacher(editingGroup.value.id, payload, teacherId.value)
      if (result.success) {
        successMessage.value = 'Guruh muvaffaqiyatli yangilandi'
        closeSheet()
        await loadGroups()
      } else {
        errorMessage.value = result.error ?? 'Guruhni yangilashda xatolik'
      }
    } else {
      const payload: Omit<UserGroupInsert, 'teacher_id'> = {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
      }
      const result = await createGroupAsTeacher(payload, teacherId.value)
      if (result.success) {
        successMessage.value = "Guruh muvaffaqiyatli qo'shildi"
        closeSheet()
        await loadGroups()
      } else {
        errorMessage.value = result.error ?? "Guruh qo'shishda xatolik"
      }
    }
  } catch (err) {
    errorMessage.value = 'Kutilmagan xatolik yuz berdi'
    console.error(err)
  } finally {
    isSaving.value = false
  }
}

// ---------------------------------------------------------------
// Delete
// ---------------------------------------------------------------
function openDeleteModal(group: UserGroupWithTeacher) {
  groupToDelete.value = group
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  groupToDelete.value = null
}

async function confirmDelete() {
  if (!groupToDelete.value) return
  isDeleting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await deleteGroupAsTeacher(groupToDelete.value.id, teacherId.value)
    if (result.success) {
      successMessage.value = "Guruh muvaffaqiyatli o'chirildi"
      closeDeleteModal()
      await loadGroups()
    } else {
      errorMessage.value = result.error ?? "Guruhni o'chirishda xatolik"
    }
  } catch (err) {
    errorMessage.value = "Guruhni o'chirishda xatolik"
    console.error(err)
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function dismissSuccess() { successMessage.value = '' }
function dismissError() { errorMessage.value = '' }

watch(successMessage, (val) => {
  if (val) setTimeout(() => { successMessage.value = '' }, 3000)
})

onMounted(loadGroups)
</script>

<template>
  <div class="space-y-6">
    <!-- Success -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="successMessage"
        class="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
      >
        <span>{{ successMessage }}</span>
        <button @click="dismissSuccess" class="ml-2 hover:opacity-70"><X class="h-4 w-4" /></button>
      </div>
    </Transition>

    <!-- Error -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="errorMessage"
        class="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        <span>{{ errorMessage }}</span>
        <button @click="dismissError" class="ml-2 hover:opacity-70"><X class="h-4 w-4" /></button>
      </div>
    </Transition>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Guruhlarim</h1>
        <p class="mt-1 text-sm text-muted-foreground">O'z guruhlaringizni boshqaring</p>
      </div>
      <button
        @click="openCreateSheet"
        class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Guruh qo'shish
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Guruh nomi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-xl border border-border bg-card">
      <div class="divide-y divide-border">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-40 animate-pulse rounded bg-muted" />
          <div class="h-4 w-28 animate-pulse rounded bg-muted" />
          <div class="h-5 w-14 animate-pulse rounded-full bg-muted ml-auto" />
          <div class="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Nomi</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tavsif</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Holat</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="group in filteredGroups"
              :key="group.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 shrink-0">
                    <Users class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ group.name }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-muted-foreground">{{ group.description || '—' }}</span>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    group.is_active
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  ]"
                >
                  {{ group.is_active ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditSheet(group)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Tahrirlash"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="openDeleteModal(group)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty -->
            <tr v-if="filteredGroups.length === 0">
              <td colspan="4" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                  <Users class="h-8 w-8 text-muted-foreground/40" />
                  <p class="text-sm text-muted-foreground">
                    {{ searchQuery ? 'Guruh topilmadi' : "Hozircha guruhlar yo'q. Yangi guruh qo'shing." }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- Slide-over Sheet                                               -->
    <!-- ============================================================= -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isSheetOpen" class="fixed inset-0 z-50">
          <div class="fixed inset-0 bg-black/50" @click="closeSheet" />
          <Transition
            enter-active-class="transition ease-out duration-300 transform"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-200 transform"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
            appear
          >
            <div class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl">
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 class="text-lg font-semibold text-foreground">
                    {{ isEditing ? 'Guruhni tahrirlash' : "Yangi guruh qo'shish" }}
                  </h2>
                  <p class="mt-0.5 text-sm text-muted-foreground">
                    {{ isEditing ? "Ma'lumotlarni o'zgartiring" : "Forma maydonlarini to'ldiring" }}
                  </p>
                </div>
                <button
                  @click="closeSheet"
                  class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <!-- Form -->
              <div class="flex-1 overflow-y-auto px-6 py-6">
                <form @submit.prevent="handleSubmit" class="space-y-5">
                  <!-- Name -->
                  <div class="space-y-2">
                    <label for="group_name" class="text-sm font-medium text-foreground">
                      Guruh nomi
                    </label>
                    <input
                      id="group_name"
                      v-model="form.name"
                      type="text"
                      placeholder="Guruh nomini kiriting"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.name }"
                    />
                    <p v-if="formErrors.name" class="text-xs text-destructive">{{ formErrors.name }}</p>
                  </div>

                  <!-- Description -->
                  <div class="space-y-2">
                    <label for="group_desc" class="text-sm font-medium text-foreground">
                      Tavsif
                      <span class="font-normal text-muted-foreground">(ixtiyoriy)</span>
                    </label>
                    <textarea
                      id="group_desc"
                      v-model="form.description"
                      rows="3"
                      placeholder="Guruh haqida qisqacha ma'lumot"
                      class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>

                  <!-- Is Active -->
                  <div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p class="text-sm font-medium text-foreground">Sozlamalar</p>
                    <div class="flex items-center gap-3">
                      <input
                        id="group_active"
                        v-model="form.is_active"
                        type="checkbox"
                        class="h-4 w-4 rounded border border-input accent-primary"
                      />
                      <label for="group_active" class="text-sm text-foreground">Faol guruh</label>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  @click="closeSheet"
                  type="button"
                  class="inline-flex items-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="handleSubmit"
                  type="button"
                  :disabled="isSaving"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  {{ isEditing ? 'Saqlash' : "Qo'shish" }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ============================================================= -->
    <!-- Delete Modal                                                   -->
    <!-- ============================================================= -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="fixed inset-0 bg-black/50" @click="closeDeleteModal" />
          <Transition
            enter-active-class="transition ease-out duration-200 transform"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150 transform"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
            appear
          >
            <div class="relative z-50 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <div class="flex items-start gap-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle class="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 class="text-base font-semibold text-foreground">Guruhni o'chirish</h3>
                  <p class="mt-2 text-sm text-muted-foreground">
                    <strong class="text-foreground">{{ groupToDelete?.name }}</strong>
                    guruhini o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
                  </p>
                </div>
              </div>
              <div class="mt-6 flex items-center justify-end gap-3">
                <button
                  @click="closeDeleteModal"
                  type="button"
                  class="inline-flex items-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="confirmDelete"
                  type="button"
                  :disabled="isDeleting"
                  class="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin" />
                  O'chirish
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
