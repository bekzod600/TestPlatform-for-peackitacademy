<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  CalendarCheck,
  Plus,
  Trash2,
  X,
  Loader2,
  Search,
  Clock,
  AlertTriangle,
} from 'lucide-vue-next'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  fetchAssignmentsByTeacher,
  createAssignmentAsTeacher,
  deleteAssignmentAsTeacher,
  fetchGroupsByTeacher,
  fetchTests,
} from '@/api/admin.api'
import { useAuthStore } from '@/stores/auth'
import type {
  TestAssignmentWithDetails,
  TestAssignmentInsert,
  Test,
  UserGroupWithTeacher,
} from '@/types'

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

const assignments = ref<TestAssignmentWithDetails[]>([])
const myTests = ref<Test[]>([])
const myGroups = ref<UserGroupWithTeacher[]>([])
const searchQuery = ref('')

const filteredAssignments = computed(() => {
  if (!searchQuery.value.trim()) return assignments.value
  const q = searchQuery.value.toLowerCase()
  return assignments.value.filter(
    (a) =>
      (a.test?.name ?? '').toLowerCase().includes(q) ||
      (a.user_group?.name ?? '').toLowerCase().includes(q),
  )
})

// Sheet
const isSheetOpen = ref(false)

const form = reactive({
  test_id: null as number | null,
  user_group_id: null as number | null,
  start_time: '',
  end_time: '',
  // Override settings (null = test default ishlatiladi)
  duration_minutes: null as number | null,
  max_questions: null as number | null,
  passing_score: null as number | null,
  max_attempts: null as number | null,
  shuffle_questions: null as boolean | null,
  shuffle_answers: null as boolean | null,
  show_results: null as boolean | null,
})

/** Tanlangan testning default sozlamalari (placeholder uchun) */
const selectedTestDefaults = ref<Test | null>(null)

function onTestChange() {
  const t = myTests.value.find(t => t.id === form.test_id)
  selectedTestDefaults.value = t ?? null
}
const formErrors = reactive<Record<string, string>>({})

// Delete modal
const isDeleteModalOpen = ref(false)
const assignmentToDelete = ref<TestAssignmentWithDetails | null>(null)

// Messages
const errorMessage = ref('')
const successMessage = ref('')

// ---------------------------------------------------------------
// API
// ---------------------------------------------------------------
async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [assignRes, groupRes, testRes] = await Promise.all([
      fetchAssignmentsByTeacher(teacherId.value),
      fetchGroupsByTeacher(teacherId.value),
      fetchTests({ created_by: teacherId.value, page_size: 100, is_active: true }),
    ])

    if (assignRes.success && assignRes.data) {
      assignments.value = assignRes.data
    }
    if (groupRes.success && groupRes.data) {
      myGroups.value = groupRes.data
    }
    if (testRes.success) {
      myTests.value = testRes.data
    }
  } catch (err) {
    errorMessage.value = "Ma'lumotlarni yuklashda xatolik"
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------
function openCreateSheet() {
  resetForm()
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  resetForm()
}

function resetForm() {
  form.test_id = null
  form.user_group_id = null
  form.start_time = ''
  form.end_time = ''
  form.duration_minutes = null
  form.max_questions = null
  form.passing_score = null
  form.max_attempts = null
  form.shuffle_questions = null
  form.shuffle_answers = null
  form.show_results = null
  selectedTestDefaults.value = null
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

  if (!form.test_id) {
    formErrors.test_id = 'Test tanlanishi shart'
    valid = false
  }
  if (!form.user_group_id) {
    formErrors.user_group_id = 'Guruh tanlanishi shart'
    valid = false
  }
  if (!form.start_time) {
    formErrors.start_time = 'Boshlanish vaqti kiritilishi shart'
    valid = false
  }
  if (!form.end_time) {
    formErrors.end_time = 'Tugash vaqti kiritilishi shart'
    valid = false
  }
  if (form.start_time && form.end_time && form.end_time <= form.start_time) {
    formErrors.end_time = 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak'
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
    const payload: TestAssignmentInsert = {
      test_id: form.test_id!,
      user_group_id: form.user_group_id!,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      assigned_by: teacherId.value,
      duration_minutes: form.duration_minutes || null,
      max_questions: form.max_questions || null,
      passing_score: form.passing_score ?? null,
      max_attempts: form.max_attempts || null,
      shuffle_questions: form.shuffle_questions,
      shuffle_answers: form.shuffle_answers,
      show_results: form.show_results,
    }

    const result = await createAssignmentAsTeacher(payload, teacherId.value)
    if (result.success) {
      successMessage.value = 'Test guruhga muvaffaqiyatli biriktirildi'
      closeSheet()
      await loadData()
    } else {
      errorMessage.value = result.error ?? 'Test biriktirishda xatolik'
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
function openDeleteModal(assignment: TestAssignmentWithDetails) {
  assignmentToDelete.value = assignment
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  assignmentToDelete.value = null
}

async function confirmDelete() {
  if (!assignmentToDelete.value) return
  isDeleting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await deleteAssignmentAsTeacher(assignmentToDelete.value.id, teacherId.value)
    if (result.success) {
      successMessage.value = 'Biriktirish muvaffaqiyatli olib tashlandi'
      closeDeleteModal()
      await loadData()
    } else {
      errorMessage.value = result.error ?? 'Biriktirishni o\'chirishda xatolik'
    }
  } catch (err) {
    errorMessage.value = 'Biriktirishni o\'chirishda xatolik'
    console.error(err)
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusInfo(assignment: TestAssignmentWithDetails) {
  const now = new Date()
  const start = new Date(assignment.start_time)
  const end = new Date(assignment.end_time)

  if (now < start) return { label: 'Rejalashtirilgan', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
  if (now > end) return { label: 'Tugagan', cls: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }
  return { label: 'Faol', cls: 'bg-green-500/10 text-green-600 dark:text-green-400' }
}

// Now datetime string for min attribute
const nowDateTimeLocal = computed(() => {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString().slice(0, 16)
})

function dismissSuccess() { successMessage.value = '' }
function dismissError() { errorMessage.value = '' }

watch(successMessage, (val) => {
  if (val) setTimeout(() => { successMessage.value = '' }, 3000)
})

onMounted(loadData)
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
        <h1 class="text-2xl font-bold text-foreground">Test biriktirish</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          O'z testlaringizni o'z guruhlaringizga biriktiring
        </p>
      </div>
      <button
        @click="openCreateSheet"
        class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Biriktirish
      </button>
    </div>

    <!-- Info banner if no tests or groups -->
    <div
      v-if="!isLoading && (myTests.length === 0 || myGroups.length === 0)"
      class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
    >
      <span v-if="myTests.length === 0 && myGroups.length === 0">
        Test biriktirish uchun avval testlar va guruhlar yarating.
      </span>
      <span v-else-if="myTests.length === 0">
        Hozircha sizning testlaringiz yo'q. Testlar bo'limidan test yarating.
      </span>
      <span v-else>
        Hozircha sizning guruhlaringiz yo'q. Guruhlarim bo'limidan guruh yarating.
      </span>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Test yoki guruh nomi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-xl border border-border bg-card">
      <div class="divide-y divide-border">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-36 animate-pulse rounded bg-muted" />
          <div class="h-4 w-28 animate-pulse rounded bg-muted" />
          <div class="h-4 w-32 animate-pulse rounded bg-muted" />
          <div class="h-5 w-20 animate-pulse rounded-full bg-muted ml-auto" />
          <div class="h-8 w-10 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Test</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Guruh</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Boshlanish</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tugash</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Holat</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="assignment in filteredAssignments"
              :key="assignment.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 shrink-0">
                    <CalendarCheck class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div class="min-w-0">
                    <span class="text-sm font-medium text-foreground">{{ assignment.test?.name ?? '—' }}</span>
                    <div
                      v-if="assignment.duration_minutes || assignment.max_questions || assignment.passing_score || assignment.max_attempts"
                      class="flex flex-wrap gap-1 mt-1"
                    >
                      <span v-if="assignment.duration_minutes" class="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">{{ assignment.duration_minutes }} daq</span>
                      <span v-if="assignment.max_questions" class="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">{{ assignment.max_questions }} savol</span>
                      <span v-if="assignment.passing_score" class="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">{{ assignment.passing_score }}%</span>
                      <span v-if="assignment.max_attempts" class="inline-flex items-center rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">{{ assignment.max_attempts }} urinish</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">{{ assignment.user_group?.name ?? '—' }}</span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock class="h-3.5 w-3.5" />
                  {{ formatDateTime(assignment.start_time) }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock class="h-3.5 w-3.5" />
                  {{ formatDateTime(assignment.end_time) }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusInfo(assignment).cls]"
                >
                  {{ getStatusInfo(assignment).label }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <button
                  @click="openDeleteModal(assignment)"
                  class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="O'chirish"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>

            <!-- Empty -->
            <tr v-if="filteredAssignments.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                  <CalendarCheck class="h-8 w-8 text-muted-foreground/40" />
                  <p class="text-sm text-muted-foreground">
                    {{ searchQuery ? 'Natija topilmadi' : "Hozircha biriktirishlar yo'q" }}
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
                  <h2 class="text-lg font-semibold text-foreground">Test biriktirish</h2>
                  <p class="mt-0.5 text-sm text-muted-foreground">
                    Testni guruhga biriktiring va vaqtni belgilang
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
                  <!-- Test -->
                  <div class="space-y-2">
                    <label for="assign_test" class="text-sm font-medium text-foreground">Test</label>
                    <select
                      id="assign_test"
                      v-model="form.test_id"
                      @change="onTestChange"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.test_id }"
                    >
                      <option :value="null" disabled>Testni tanlang</option>
                      <option v-for="t in myTests" :key="t.id" :value="t.id">
                        {{ t.name }}
                      </option>
                    </select>
                    <p v-if="formErrors.test_id" class="text-xs text-destructive">{{ formErrors.test_id }}</p>
                    <p v-if="myTests.length === 0" class="text-xs text-muted-foreground">
                      Testlar yo'q. Avval test yarating.
                    </p>
                  </div>

                  <!-- Group -->
                  <div class="space-y-2">
                    <label for="assign_group" class="text-sm font-medium text-foreground">Guruh</label>
                    <select
                      id="assign_group"
                      v-model="form.user_group_id"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.user_group_id }"
                    >
                      <option :value="null" disabled>Guruhni tanlang</option>
                      <option v-for="g in myGroups" :key="g.id" :value="g.id">
                        {{ g.name }}
                      </option>
                    </select>
                    <p v-if="formErrors.user_group_id" class="text-xs text-destructive">{{ formErrors.user_group_id }}</p>
                    <p v-if="myGroups.length === 0" class="text-xs text-muted-foreground">
                      Guruhlar yo'q. Avval guruh yarating.
                    </p>
                  </div>

                  <!-- Start / End datetime -->
                  <div class="grid grid-cols-1 gap-4">
                    <div class="space-y-2">
                      <label class="text-sm font-medium text-foreground">Boshlanish vaqti</label>
                      <DateTimePicker
                        v-model="form.start_time"
                        placeholder="Boshlanish vaqtini tanlang"
                        :min="nowDateTimeLocal"
                        :error="!!formErrors.start_time"
                      />
                      <p v-if="formErrors.start_time" class="text-xs text-destructive">{{ formErrors.start_time }}</p>
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-medium text-foreground">Tugash vaqti</label>
                      <DateTimePicker
                        v-model="form.end_time"
                        placeholder="Tugash vaqtini tanlang"
                        :min="form.start_time || nowDateTimeLocal"
                        :error="!!formErrors.end_time"
                      />
                      <p v-if="formErrors.end_time" class="text-xs text-destructive">{{ formErrors.end_time }}</p>
                    </div>
                  </div>

                  <!-- Override sozlamalar -->
                  <div v-if="form.test_id" class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div>
                      <p class="text-sm font-medium text-foreground">Test sozlamalari</p>
                      <p class="text-xs text-muted-foreground mt-0.5">Bo'sh qoldirilsa test default qiymati ishlatiladi</p>
                    </div>

                    <!-- Duration & Max Questions -->
                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-foreground">Davomiylik (daq)</label>
                        <input
                          v-model.number="form.duration_minutes"
                          type="number"
                          min="1"
                          max="300"
                          :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.duration_minutes}` : ''"
                          class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-foreground">Savollar soni</label>
                        <input
                          v-model.number="form.max_questions"
                          type="number"
                          min="1"
                          max="500"
                          :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.max_questions}` : ''"
                          class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>

                    <!-- Passing Score & Max Attempts -->
                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-foreground">O'tish balli (%)</label>
                        <input
                          v-model.number="form.passing_score"
                          type="number"
                          min="0"
                          max="100"
                          :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.passing_score}` : ''"
                          class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-foreground">Urinishlar soni</label>
                        <input
                          v-model.number="form.max_attempts"
                          type="number"
                          min="1"
                          max="100"
                          :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.max_attempts}` : ''"
                          class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>

                    <!-- Checkboxes -->
                    <div class="space-y-2.5">
                      <label class="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          :checked="form.shuffle_questions ?? selectedTestDefaults?.shuffle_questions ?? true"
                          @change="form.shuffle_questions = ($event.target as HTMLInputElement).checked"
                          class="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span class="text-sm text-foreground">Savollarni aralashtirish</span>
                      </label>
                      <label class="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          :checked="form.shuffle_answers ?? selectedTestDefaults?.shuffle_answers ?? true"
                          @change="form.shuffle_answers = ($event.target as HTMLInputElement).checked"
                          class="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span class="text-sm text-foreground">Javoblarni aralashtirish</span>
                      </label>
                      <label class="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          :checked="form.show_results ?? selectedTestDefaults?.show_results ?? true"
                          @change="form.show_results = ($event.target as HTMLInputElement).checked"
                          class="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span class="text-sm text-foreground">Natijalarni ko'rsatish</span>
                      </label>
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
                  :disabled="isSaving || myTests.length === 0 || myGroups.length === 0"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  Biriktirish
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
                  <h3 class="text-base font-semibold text-foreground">Biriktirishni olib tashlash</h3>
                  <p class="mt-2 text-sm text-muted-foreground">
                    <strong class="text-foreground">{{ assignmentToDelete?.test?.name }}</strong>
                    testini
                    <strong class="text-foreground">{{ assignmentToDelete?.user_group?.name }}</strong>
                    guruhidan olib tashlashni xohlaysizmi?
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
