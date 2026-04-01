<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
} from 'lucide-vue-next'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  fetchUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  fetchTeachers,
  fetchAssignmentsByGroup,
  updateAssignment,
  deleteAssignment,
} from '@/api/admin.api'
import { useAuthStore } from '@/stores/auth'
import type {
  UserGroupWithTeacher,
  UserGroupInsert,
  SafeUser,
  TestAssignmentWithDetails,
} from '@/types'

const authStore = useAuthStore()

const isLoading = ref(true)
const groups = ref<UserGroupWithTeacher[]>([])
const teachers = ref<SafeUser[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const deletingId = ref<number | null>(null)
const isDeleting = ref(false)
const errorMessage = ref('')

// Assignments state
const expandedGroupId = ref<number | null>(null)
const groupAssignments = ref<Record<number, TestAssignmentWithDetails[]>>({})
const loadingAssignments = ref<Record<number, boolean>>({})

// Assignment edit state
const showAssignmentEditForm = ref(false)
const editingAssignment = ref<TestAssignmentWithDetails | null>(null)
const assignmentForm = ref({ start_time: '', end_time: '' })
const isSavingAssignment = ref(false)
const assignmentError = ref('')

// Assignment delete state
const showAssignmentDeleteModal = ref(false)
const deletingAssignmentId = ref<number | null>(null)
const deletingAssignmentGroupId = ref<number | null>(null)
const isDeletingAssignment = ref(false)

const form = ref<UserGroupInsert>({
  name: '',
  description: '',
  is_active: true,
  teacher_id: null,
})

function resetForm() {
  form.value = { name: '', description: '', is_active: true, teacher_id: null }
  editingId.value = null
  errorMessage.value = ''
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(group: UserGroupWithTeacher) {
  editingId.value = group.id
  form.value = {
    name: group.name,
    description: group.description ?? '',
    is_active: group.is_active,
    teacher_id: group.teacher_id,
  }
  errorMessage.value = ''
  showForm.value = true
}

function confirmDelete(id: number) {
  deletingId.value = id
  showDeleteModal.value = true
}

async function loadGroups() {
  isLoading.value = true
  try {
    const [groupResult, teacherResult] = await Promise.all([
      fetchUserGroups(),
      fetchTeachers(),
    ])
    if (groupResult.success && groupResult.data) groups.value = groupResult.data
    if (teacherResult.success && teacherResult.data) teachers.value = teacherResult.data
  } catch (err) {
    console.error('Error loading groups:', err)
  } finally {
    isLoading.value = false
  }
}

async function saveGroup() {
  if (!form.value.name.trim()) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    let result
    if (editingId.value) {
      result = await updateUserGroup(editingId.value, form.value, authStore.user?.id ?? null)
    } else {
      result = await createUserGroup(form.value, authStore.user?.id ?? null)
    }
    if (!result.success) {
      errorMessage.value = result.error ?? 'Xatolik yuz berdi'
      return
    }
    showForm.value = false
    resetForm()
    await loadGroups()
  } catch (err) {
    console.error('Error saving group:', err)
    errorMessage.value = 'Kutilmagan xatolik yuz berdi'
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    await deleteUserGroup(deletingId.value, authStore.user?.id ?? null)
    showDeleteModal.value = false
    deletingId.value = null
    await loadGroups()
  } catch (err) {
    console.error('Error deleting group:', err)
  } finally {
    isDeleting.value = false
  }
}

// --- Assignment methods ---

async function toggleGroupExpand(groupId: number) {
  if (expandedGroupId.value === groupId) {
    expandedGroupId.value = null
    return
  }
  expandedGroupId.value = groupId
  await loadAssignmentsForGroup(groupId)
}

async function loadAssignmentsForGroup(groupId: number) {
  loadingAssignments.value[groupId] = true
  try {
    const result = await fetchAssignmentsByGroup(groupId)
    if (result.success && result.data) {
      groupAssignments.value[groupId] = result.data
    }
  } catch (err) {
    console.error('Error loading assignments:', err)
  } finally {
    loadingAssignments.value[groupId] = false
  }
}

function getAssignmentStatus(a: TestAssignmentWithDetails) {
  const now = new Date()
  const start = new Date(a.start_time)
  const end = new Date(a.end_time)
  if (now < start) return { label: 'Kutilmoqda', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' }
  if (now > end) return { label: 'Tugagan', class: 'bg-red-500/10 text-red-600 dark:text-red-400' }
  return { label: 'Faol', class: 'bg-green-500/10 text-green-600 dark:text-green-400' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })
}

function openEditAssignment(a: TestAssignmentWithDetails) {
  editingAssignment.value = a
  assignmentForm.value = {
    start_time: a.start_time.slice(0, 16),
    end_time: a.end_time.slice(0, 16),
  }
  assignmentError.value = ''
  showAssignmentEditForm.value = true
}

async function saveAssignment() {
  if (!editingAssignment.value) return
  if (!assignmentForm.value.start_time || !assignmentForm.value.end_time) return

  const startDate = new Date(assignmentForm.value.start_time)
  const endDate = new Date(assignmentForm.value.end_time)
  if (endDate <= startDate) {
    assignmentError.value = 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak'
    return
  }

  isSavingAssignment.value = true
  assignmentError.value = ''
  try {
    const result = await updateAssignment(editingAssignment.value.id, {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    })
    if (!result.success) {
      assignmentError.value = result.error ?? 'Xatolik yuz berdi'
      return
    }
    showAssignmentEditForm.value = false
    editingAssignment.value = null
    if (expandedGroupId.value) {
      await loadAssignmentsForGroup(expandedGroupId.value)
    }
  } catch (err) {
    console.error('Error updating assignment:', err)
    assignmentError.value = 'Kutilmagan xatolik yuz berdi'
  } finally {
    isSavingAssignment.value = false
  }
}

function confirmDeleteAssignment(assignmentId: number, groupId: number) {
  deletingAssignmentId.value = assignmentId
  deletingAssignmentGroupId.value = groupId
  showAssignmentDeleteModal.value = true
}

async function handleDeleteAssignment() {
  if (!deletingAssignmentId.value) return
  isDeletingAssignment.value = true
  try {
    await deleteAssignment(deletingAssignmentId.value)
    showAssignmentDeleteModal.value = false
    if (deletingAssignmentGroupId.value) {
      await loadAssignmentsForGroup(deletingAssignmentGroupId.value)
    }
    deletingAssignmentId.value = null
    deletingAssignmentGroupId.value = null
  } catch (err) {
    console.error('Error deleting assignment:', err)
  } finally {
    isDeletingAssignment.value = false
  }
}

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return groups.value
  const q = searchQuery.value.toLowerCase()
  return groups.value.filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.description?.toLowerCase().includes(q) ||
    g.teacher?.full_name?.toLowerCase().includes(q)
  )
})

onMounted(loadGroups)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-foreground">Guruhlar</h2>
        <p class="text-sm text-muted-foreground">Foydalanuvchi guruhlarini boshqarish</p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
      >
        <Plus class="w-4 h-4" />
        Qo'shish
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Groups List -->
    <div v-else class="space-y-3">
      <div v-if="!filtered.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <UsersRound class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Guruhlar yo'q</h3>
        <p class="text-sm text-muted-foreground mt-1">Yangi guruh qo'shing</p>
      </div>

      <div
        v-for="group in filtered"
        :key="group.id"
        class="rounded-xl border border-border bg-card overflow-hidden"
      >
        <!-- Group Header -->
        <div class="flex items-center justify-between p-4">
          <div
            class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            @click="toggleGroupExpand(group.id)"
          >
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <UsersRound class="w-5 h-5 text-primary" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ group.name }}</p>
              <p v-if="group.description" class="text-xs text-muted-foreground truncate">{{ group.description }}</p>
              <p v-if="group.teacher" class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <UserCheck class="w-3 h-3" />
                {{ group.teacher.full_name }}
              </p>
              <p v-else class="text-xs text-muted-foreground/50 mt-0.5">O'qituvchi tayinlanmagan</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                group.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
              ]"
            >
              {{ group.is_active ? 'Faol' : 'Nofaol' }}
            </span>
            <button
              @click="toggleGroupExpand(group.id)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              :title="expandedGroupId === group.id ? 'Yopish' : 'Testlarni ko\'rish'"
            >
              <ChevronUp v-if="expandedGroupId === group.id" class="w-4 h-4" />
              <ChevronDown v-else class="w-4 h-4" />
            </button>
            <button
              @click="openEdit(group)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              @click="confirmDelete(group.id)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Assigned Tests (Expandable) -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1000px]"
          leave-from-class="opacity-100 max-h-[1000px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="expandedGroupId === group.id" class="border-t border-border overflow-hidden">
            <!-- Loading assignments -->
            <div v-if="loadingAssignments[group.id]" class="p-4 space-y-2">
              <div v-for="i in 2" :key="i" class="h-12 bg-muted animate-pulse rounded-lg" />
            </div>

            <!-- No assignments -->
            <div
              v-else-if="!groupAssignments[group.id]?.length"
              class="p-6 text-center"
            >
              <FileText class="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">Bu guruhga hali test tayinlanmagan</p>
            </div>

            <!-- Assignments list -->
            <div v-else class="p-3 space-y-2">
              <div class="px-2 pb-1">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tayinlangan testlar ({{ groupAssignments[group.id].length }})
                </p>
              </div>
              <div
                v-for="a in groupAssignments[group.id]"
                :key="a.id"
                class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-0.5">
                    <FileText class="w-3.5 h-3.5 text-primary shrink-0" />
                    <p class="text-sm font-medium text-foreground truncate">{{ a.test?.name || 'Test' }}</p>
                    <span :class="['px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0', getAssignmentStatus(a).class]">
                      {{ getAssignmentStatus(a).label }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1 ml-5.5 text-xs text-muted-foreground">
                    <Clock class="w-3 h-3" />
                    <span>{{ formatDate(a.start_time) }} — {{ formatDate(a.end_time) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    @click.stop="openEditAssignment(a)"
                    class="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Tahrirlash"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click.stop="confirmDeleteAssignment(a.id, group.id)"
                    class="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Group Form Slide-over -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showForm" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showForm = false" />
          <div class="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 class="text-lg font-semibold text-foreground">
                {{ editingId ? 'Guruhni tahrirlash' : 'Yangi guruh' }}
              </h3>
              <button @click="showForm = false" class="text-muted-foreground hover:text-foreground">
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="saveGroup" class="flex-1 overflow-y-auto p-6 space-y-4">
              <!-- Error -->
              <div
                v-if="errorMessage"
                class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              >
                {{ errorMessage }}
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Nomi</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="Guruh nomi"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Tavsif</label>
                <textarea
                  v-model="form.description"
                  placeholder="Guruh tavsifi"
                  rows="3"
                  class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                />
              </div>

              <!-- Teacher select -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">
                  O'qituvchi
                  <span class="font-normal text-muted-foreground">(ixtiyoriy)</span>
                </label>
                <select
                  v-model="form.teacher_id"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option :value="null">— Tayinlanmagan —</option>
                  <option
                    v-for="t in teachers"
                    :key="t.id"
                    :value="t.id"
                  >
                    {{ t.full_name }} ({{ t.username }})
                  </option>
                </select>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  id="is_active"
                  class="h-4 w-4 rounded border border-input accent-primary"
                />
                <label for="is_active" class="text-sm font-medium text-foreground">Faol</label>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showForm = false"
                class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="saveGroup"
                :disabled="isSaving || !form.name.trim()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Assignment Edit Slide-over -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showAssignmentEditForm" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAssignmentEditForm = false" />
          <div class="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 class="text-lg font-semibold text-foreground">Tayinlashni tahrirlash</h3>
              <button @click="showAssignmentEditForm = false" class="text-muted-foreground hover:text-foreground">
                <X class="w-5 h-5" />
              </button>
            </div>

            <form @submit.prevent="saveAssignment" class="flex-1 overflow-y-auto p-6 space-y-4">
              <div
                v-if="assignmentError"
                class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              >
                {{ assignmentError }}
              </div>

              <!-- Read-only test info -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Test</label>
                <div class="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {{ editingAssignment?.test?.name || '-' }}
                </div>
              </div>

              <!-- Read-only group info -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Guruh</label>
                <div class="flex h-10 w-full items-center rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {{ editingAssignment?.user_group?.name || '-' }}
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Boshlanish vaqti</label>
                <DateTimePicker
                  v-model="assignmentForm.start_time"
                  placeholder="Boshlanish vaqtini tanlang"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Tugash vaqti</label>
                <DateTimePicker
                  v-model="assignmentForm.end_time"
                  placeholder="Tugash vaqtini tanlang"
                  :min="assignmentForm.start_time"
                />
              </div>
            </form>

            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showAssignmentEditForm = false"
                class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="saveAssignment"
                :disabled="isSavingAssignment || !assignmentForm.start_time || !assignmentForm.end_time"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isSavingAssignment" class="w-4 h-4 animate-spin" />
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Group Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showDeleteModal = false"
        >
          <div class="w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <Trash2 class="w-6 h-6 text-destructive" />
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">Guruhni o'chirish</h3>
            <p class="text-sm text-muted-foreground mb-4">Bu amalni qaytarib bo'lmaydi. Davom etasizmi?</p>
            <div class="flex gap-3">
              <button
                @click="showDeleteModal = false"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin mx-auto" />
                <span v-else>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Assignment Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showAssignmentDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showAssignmentDeleteModal = false"
        >
          <div class="w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <Trash2 class="w-6 h-6 text-destructive" />
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">Test tayinlashni o'chirish</h3>
            <p class="text-sm text-muted-foreground mb-4">Bu guruhdan test tayinlash o'chiriladi. Davom etasizmi?</p>
            <div class="flex gap-3">
              <button
                @click="showAssignmentDeleteModal = false"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="handleDeleteAssignment"
                :disabled="isDeletingAssignment"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isDeletingAssignment" class="w-4 h-4 animate-spin mx-auto" />
                <span v-else>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
