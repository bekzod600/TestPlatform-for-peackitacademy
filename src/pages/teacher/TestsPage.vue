<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-vue-next'
import {
  fetchTests,
  createTest,
  updateTest,
  deleteTest,
  fetchSubjects,
  fetchQuestions,
  syncTestQuestions,
  fetchQuestionIdsForTest,
} from '@/api/admin.api'
import type { QuestionWithDetails } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { PAGINATION } from '@/lib/constants'
import type {
  TestWithDetails,
  Subject,
  TestInsert,
  TestUpdate,
  TestListFilters,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------

const auth = useAuthStore()

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------

const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)

// Tests data & pagination
const tests = ref<TestWithDetails[]>([])
const pagination = ref({
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE as number,
  total_count: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
})

// Filters
const searchQuery = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const filters = reactive<TestListFilters>({
  search: '',
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE,
  sort_by: 'created_at',
  sort_order: 'desc',
})

// Subjects for the form select
const subjects = ref<Subject[]>([])

// Slide-over (sheet) state
const isSheetOpen = ref(false)
const editingTest = ref<TestWithDetails | null>(null)
const isEditing = computed(() => editingTest.value !== null)

// Form state
const form = reactive({
  name: '',
  description: '',
  subject_id: null as number | null,
  is_active: true,
})

const formErrors = reactive<Record<string, string>>({})

// Question picker state
const selectedQuestionIds = ref<number[]>([])
const availableQuestions = ref<QuestionWithDetails[]>([])
const isLoadingQuestions = ref(false)
const questionSearchQuery = ref('')

const filteredAvailableQuestions = computed(() => {
  const q = questionSearchQuery.value.toLowerCase().trim()
  if (!q) return availableQuestions.value
  return availableQuestions.value.filter(
    (question) => question.question_text.toLowerCase().includes(q),
  )
})

async function loadAvailableQuestions() {
  isLoadingQuestions.value = true
  try {
    const result = await fetchQuestions({ page: 1, page_size: 500, created_by: auth.user?.id })
    if (result.success) {
      availableQuestions.value = result.data
    }
  } catch (err) {
    console.error('Failed to load questions:', err)
  } finally {
    isLoadingQuestions.value = false
  }
}

function toggleQuestion(questionId: number) {
  const idx = selectedQuestionIds.value.indexOf(questionId)
  if (idx === -1) {
    selectedQuestionIds.value.push(questionId)
  } else {
    selectedQuestionIds.value.splice(idx, 1)
  }
}

// Delete confirmation modal
const isDeleteModalOpen = ref(false)
const testToDelete = ref<TestWithDetails | null>(null)

// Error / success messages
const errorMessage = ref('')
const successMessage = ref('')

// ---------------------------------------------------------------
// Computed
// ---------------------------------------------------------------

const paginationRange = computed(() => {
  const current = pagination.value.page
  const total = pagination.value.total_pages
  const pages: (number | string)[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return pages
})

// ---------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------

async function loadTests() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const result: PaginatedResponse<TestWithDetails> = await fetchTests({
      ...filters,
      created_by: auth.user?.id,
    })
    if (result.success) {
      tests.value = result.data
      pagination.value = result.pagination
    } else {
      errorMessage.value = result.error ?? 'Testlarni yuklashda xatolik yuz berdi'
    }
  } catch (err) {
    errorMessage.value = 'Testlarni yuklashda xatolik yuz berdi'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

async function loadSubjects() {
  try {
    const result = await fetchSubjects()
    if (result.success && result.data) {
      subjects.value = result.data
    }
  } catch (err) {
    console.error('Failed to load subjects:', err)
  }
}

// ---------------------------------------------------------------
// Search handling
// ---------------------------------------------------------------

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    filters.search = searchQuery.value
    filters.page = 1
    loadTests()
  }, 300)
}

// ---------------------------------------------------------------
// Pagination handling
// ---------------------------------------------------------------

function goToPage(page: number) {
  if (page < 1 || page > pagination.value.total_pages) return
  filters.page = page
  loadTests()
}

// ---------------------------------------------------------------
// Sheet (slide-over) handling
// ---------------------------------------------------------------

async function openCreateSheet() {
  editingTest.value = null
  resetForm()
  selectedQuestionIds.value = []
  questionSearchQuery.value = ''
  if (!availableQuestions.value.length) await loadAvailableQuestions()
  isSheetOpen.value = true
}

async function openEditSheet(test: TestWithDetails) {
  editingTest.value = test
  form.name = test.name
  form.description = test.description ?? ''
  form.subject_id = test.subject_id
  form.is_active = test.is_active
  clearFormErrors()
  questionSearchQuery.value = ''
  const linkedResult = await fetchQuestionIdsForTest(test.id)
  selectedQuestionIds.value = linkedResult.success && linkedResult.data ? linkedResult.data : []
  if (!availableQuestions.value.length) await loadAvailableQuestions()
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  editingTest.value = null
  resetForm()
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.subject_id = null
  form.is_active = true
  clearFormErrors()
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((key) => delete formErrors[key])
}

// ---------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------

function validateForm(): boolean {
  clearFormErrors()
  let valid = true

  if (!form.name.trim()) {
    formErrors.name = 'Test nomi kiritilishi shart'
    valid = false
  }

  if (!form.subject_id) {
    formErrors.subject_id = 'Fan tanlanishi shart'
    valid = false
  }

  return valid
}

// ---------------------------------------------------------------
// Submit form (create / update)
// ---------------------------------------------------------------

async function handleSubmit() {
  if (!validateForm()) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isEditing.value && editingTest.value) {
      // Update
      const payload: TestUpdate = {
        name: form.name,
        description: form.description || null,
        subject_id: form.subject_id,
        is_active: form.is_active,
      }

      const result = await updateTest(editingTest.value.id, payload)
      if (result.success) {
        await syncTestQuestions(editingTest.value.id, selectedQuestionIds.value)
        successMessage.value = 'Test muvaffaqiyatli yangilandi'
        closeSheet()
        await loadTests()
      } else {
        errorMessage.value = result.error ?? 'Testni yangilashda xatolik yuz berdi'
      }
    } else {
      // Create
      const payload: TestInsert = {
        name: form.name,
        description: form.description || null,
        subject_id: form.subject_id,
        duration_minutes: 60,
        max_questions: 50,
        passing_score: 60,
        shuffle_questions: true,
        shuffle_answers: true,
        show_results: true,
        max_attempts: 1,
        is_active: form.is_active,
        created_by: auth.user?.id ?? null,
      }

      const result = await createTest(payload)
      if (result.success && result.data) {
        await syncTestQuestions(result.data.id, selectedQuestionIds.value)
        successMessage.value = "Test muvaffaqiyatli qo'shildi"
        closeSheet()
        await loadTests()
      } else {
        errorMessage.value = result.error ?? "Test qo'shishda xatolik yuz berdi"
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
// Delete handling
// ---------------------------------------------------------------

function openDeleteModal(test: TestWithDetails) {
  testToDelete.value = test
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  testToDelete.value = null
}

async function confirmDelete() {
  if (!testToDelete.value) return

  isDeleting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await deleteTest(testToDelete.value.id)
    if (result.success) {
      successMessage.value = "Test muvaffaqiyatli o'chirildi"
      closeDeleteModal()
      await loadTests()
    } else {
      errorMessage.value = result.error ?? "Testni o'chirishda xatolik yuz berdi"
    }
  } catch (err) {
    errorMessage.value = "Testni o'chirishda xatolik yuz berdi"
    console.error(err)
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function getStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
    : 'bg-red-500/10 text-red-600 dark:text-red-400'
}

function dismissSuccess() {
  successMessage.value = ''
}

function dismissError() {
  errorMessage.value = ''
}

// Auto-dismiss success messages after 3 seconds
watch(successMessage, (val) => {
  if (val) {
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
})

// ---------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------

onMounted(async () => {
  await Promise.all([loadTests(), loadSubjects()])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success Message -->
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
        <button @click="dismissSuccess" class="ml-2 hover:opacity-70">
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- Error Message -->
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
        <button @click="dismissError" class="ml-2 hover:opacity-70">
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Testlar</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Barcha testlarni boshqaring
        </p>
      </div>
      <button
        @click="openCreateSheet"
        class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Qo'shish
      </button>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        type="text"
        placeholder="Test nomi yoki tavsifi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div class="rounded-xl border border-border bg-card">
        <div class="divide-y divide-border">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-6 py-4">
            <div class="h-4 w-40 animate-pulse rounded bg-muted" />
            <div class="h-4 w-28 animate-pulse rounded bg-muted" />
            <div class="h-4 w-20 animate-pulse rounded bg-muted" />
            <div class="h-4 w-16 animate-pulse rounded bg-muted" />
            <div class="h-4 w-16 animate-pulse rounded bg-muted" />
            <div class="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div class="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tests Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nomi
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fan
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Savollar
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Holat
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="test in tests"
              :key="test.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-foreground">{{ test.name }}</span>
                  <span v-if="test.description" class="mt-0.5 text-xs text-muted-foreground line-clamp-1 max-w-xs">
                    {{ test.description }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">
                  {{ test.subject?.name || '—' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">
                  {{ test.questions_count ?? 0 }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusBadgeClass(test.is_active)]"
                >
                  {{ test.is_active ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditSheet(test)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Tahrirlash"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="openDeleteModal(test)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="tests.length === 0">
              <td colspan="5" class="px-6 py-12 text-center">
                <p class="text-sm text-muted-foreground">Testlar topilmadi</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.total_pages > 1"
        class="flex items-center justify-between border-t border-border px-6 py-4"
      >
        <p class="text-sm text-muted-foreground">
          Jami <span class="font-medium text-foreground">{{ pagination.total_count }}</span> ta test
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="!pagination.has_previous"
            class="inline-flex items-center justify-center rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>

          <template v-for="(p, idx) in paginationRange" :key="idx">
            <span
              v-if="p === '...'"
              class="px-2 text-sm text-muted-foreground"
            >
              ...
            </span>
            <button
              v-else
              @click="goToPage(p as number)"
              :class="[
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                pagination.page === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ]"
            >
              {{ p }}
            </button>
          </template>

          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="!pagination.has_next"
            class="inline-flex items-center justify-center rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- Slide-over (Sheet) for Add / Edit Test                        -->
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
        <div
          v-if="isSheetOpen"
          class="fixed inset-0 z-50"
        >
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black/50"
            @click="closeSheet"
          />

          <!-- Panel -->
          <Transition
            enter-active-class="transition ease-out duration-300 transform"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-200 transform"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
            appear
          >
            <div
              class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 class="text-lg font-semibold text-foreground">
                    {{ isEditing ? 'Testni tahrirlash' : "Yangi test qo'shish" }}
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
                    <label for="test_name" class="text-sm font-medium text-foreground">
                      Test nomi
                    </label>
                    <input
                      id="test_name"
                      v-model="form.name"
                      type="text"
                      placeholder="Test nomini kiriting"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.name }"
                    />
                    <p v-if="formErrors.name" class="text-xs text-destructive">
                      {{ formErrors.name }}
                    </p>
                  </div>

                  <!-- Description -->
                  <div class="space-y-2">
                    <label for="test_description" class="text-sm font-medium text-foreground">
                      Tavsif
                      <span class="font-normal text-muted-foreground">(ixtiyoriy)</span>
                    </label>
                    <textarea
                      id="test_description"
                      v-model="form.description"
                      rows="3"
                      placeholder="Test haqida qisqacha tavsif"
                      class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>

                  <!-- Subject -->
                  <div class="space-y-2">
                    <label for="test_subject" class="text-sm font-medium text-foreground">
                      Fan
                    </label>
                    <select
                      id="test_subject"
                      v-model="form.subject_id"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.subject_id }"
                    >
                      <option :value="null" disabled>Fanni tanlang</option>
                      <option
                        v-for="subject in subjects"
                        :key="subject.id"
                        :value="subject.id"
                      >
                        {{ subject.name }}
                      </option>
                    </select>
                    <p v-if="formErrors.subject_id" class="text-xs text-destructive">
                      {{ formErrors.subject_id }}
                    </p>
                  </div>

                  <!-- Is Active -->
                  <div class="flex items-center gap-3">
                    <input
                      id="is_active"
                      v-model="form.is_active"
                      type="checkbox"
                      class="h-4 w-4 rounded border border-input accent-primary"
                    />
                    <label for="is_active" class="text-sm text-foreground">
                      Faol
                    </label>
                  </div>

                  <!-- Question Picker -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-foreground">
                        Savollar
                        <span class="font-normal text-muted-foreground">({{ selectedQuestionIds.length }} ta tanlangan)</span>
                      </label>
                    </div>
                    <div class="relative">
                      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        v-model="questionSearchQuery"
                        type="text"
                        placeholder="Savollarni qidirish..."
                        class="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    <div class="max-h-48 overflow-y-auto rounded-lg border border-input bg-background p-1.5 space-y-0.5">
                      <label
                        v-for="q in filteredAvailableQuestions"
                        :key="q.id"
                        class="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          :checked="selectedQuestionIds.includes(q.id)"
                          @change="toggleQuestion(q.id)"
                          class="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                        />
                        <span class="text-sm text-foreground line-clamp-2">{{ q.question_text }}</span>
                      </label>
                      <p v-if="isLoadingQuestions" class="text-xs text-muted-foreground text-center py-2">Yuklanmoqda...</p>
                      <p v-else-if="filteredAvailableQuestions.length === 0" class="text-xs text-muted-foreground text-center py-2">Savollar topilmadi</p>
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
    <!-- Delete Confirmation Modal                                      -->
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
        <div
          v-if="isDeleteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black/50"
            @click="closeDeleteModal"
          />

          <!-- Modal -->
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
                  <h3 class="text-base font-semibold text-foreground">
                    Testni o'chirish
                  </h3>
                  <p class="mt-2 text-sm text-muted-foreground">
                    <strong class="text-foreground">{{ testToDelete?.name }}</strong>
                    testini o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
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
