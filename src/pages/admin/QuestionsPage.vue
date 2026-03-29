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
  CirclePlus,
  CircleMinus,
  FileQuestion,
  CheckCircle2,
  Download,
  Upload,
} from 'lucide-vue-next'
import { exportToExcel, importFromExcel } from '@/composables/useExcel'
import type { ExcelColumn } from '@/composables/useExcel'
import {
  fetchQuestions,
  fetchTests,
  fetchCategories,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createOption,
  updateOption,
  deleteOption,
} from '@/api/admin.api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/ui/toast/useToast'
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  QUESTION_POINTS,
  PAGINATION,
} from '@/lib/constants'
import type { QuestionType, DifficultyLevel } from '@/lib/constants'
import type {
  QuestionWithDetails,
  QuestionInsert,
  QuestionUpdate,
  AnswerOptionInsert,
  Test,
  CategoryWithSubject,
  QuestionListFilters,
} from '@/types'

// ---------------------------------------------------------------------------
// Composables & stores
// ---------------------------------------------------------------------------
const auth = useAuthStore()
const { toast } = useToast()

// ---------------------------------------------------------------------------
// Reference data (for selects / filters)
// ---------------------------------------------------------------------------
const tests = ref<Test[]>([])
const categories = ref<CategoryWithSubject[]>([])

async function loadReferenceData() {
  const [testsRes, catsRes] = await Promise.all([
    fetchTests({ page: 1, page_size: 500 }),
    fetchCategories(),
  ])
  if (testsRes.success) tests.value = testsRes.data as unknown as Test[]
  if (catsRes.success && catsRes.data) categories.value = catsRes.data
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
const filters = reactive<QuestionListFilters>({
  search: '',
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE,
  sort_by: 'id',
  sort_order: 'desc',
  test_id: undefined,
  difficulty: undefined,
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
const searchInput = ref('')

watch(searchInput, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.search = val
    filters.page = 1
    loadQuestions()
  }, 300)
})

function onFilterChange() {
  filters.page = 1
  loadQuestions()
}

// ---------------------------------------------------------------------------
// Questions list
// ---------------------------------------------------------------------------
const questions = ref<QuestionWithDetails[]>([])
const isLoading = ref(false)
const pagination = ref({
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE as number,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
})

async function loadQuestions() {
  isLoading.value = true
  try {
    const res = await fetchQuestions({ ...filters })
    if (res.success) {
      questions.value = res.data
      pagination.value = res.pagination
    } else {
      toast({ title: 'Xatolik', description: res.error ?? 'Savollarni yuklashda xatolik', variant: 'destructive' })
    }
  } catch (err) {
    toast({ title: 'Xatolik', description: 'Savollarni yuklashda xatolik', variant: 'destructive' })
  } finally {
    isLoading.value = false
  }
}

function goToPage(page: number) {
  filters.page = page
  loadQuestions()
}

// ---------------------------------------------------------------------------
// Difficulty badge helpers
// ---------------------------------------------------------------------------
function difficultyBadgeClass(difficulty: DifficultyLevel): string {
  const map: Record<string, string> = {
    [DIFFICULTY_LEVELS.EASY]: 'bg-green-500/10 text-green-600 dark:text-green-400',
    [DIFFICULTY_LEVELS.MEDIUM]: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    [DIFFICULTY_LEVELS.HARD]: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }
  return map[difficulty] ?? 'bg-muted text-muted-foreground'
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

// ---------------------------------------------------------------------------
// Slide-over (Add / Edit)
// ---------------------------------------------------------------------------
const isSlideOverOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)

interface OptionDraft {
  id?: number
  option_text: string
  is_correct: boolean
  sort_order: number
  _deleted?: boolean
}

const form = reactive({
  question_text: '',
  question_type: QUESTION_TYPES.MULTIPLE_CHOICE as QuestionType,
  difficulty: DIFFICULTY_LEVELS.EASY as DifficultyLevel,
  points: QUESTION_POINTS.DEFAULT as number,
  test_id: null as number | null,
  category_id: null as number | null,
  explanation: '',
  is_active: true,
})

const optionDrafts = ref<OptionDraft[]>([])

function resetForm() {
  form.question_text = ''
  form.question_type = QUESTION_TYPES.MULTIPLE_CHOICE
  form.difficulty = DIFFICULTY_LEVELS.EASY
  form.points = QUESTION_POINTS.DEFAULT
  form.test_id = null
  form.category_id = null
  form.explanation = ''
  form.is_active = true
  optionDrafts.value = [
    { option_text: '', is_correct: false, sort_order: 0 },
    { option_text: '', is_correct: false, sort_order: 1 },
  ]
}

function openAdd() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  isSlideOverOpen.value = true
}

function openEdit(q: QuestionWithDetails) {
  isEditing.value = true
  editingId.value = q.id
  form.question_text = q.question_text
  form.question_type = q.question_type
  form.difficulty = q.difficulty
  form.points = q.points
  form.test_id = q.test_id
  form.category_id = q.category_id
  form.explanation = q.explanation ?? ''
  form.is_active = q.is_active

  optionDrafts.value = (q.answer_options ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({
      id: o.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      sort_order: o.sort_order,
    }))

  if (optionDrafts.value.length === 0) {
    optionDrafts.value = [
      { option_text: '', is_correct: false, sort_order: 0 },
      { option_text: '', is_correct: false, sort_order: 1 },
    ]
  }

  isSlideOverOpen.value = true
}

function closeSlideOver() {
  isSlideOverOpen.value = false
}

function addOption() {
  const nextOrder = optionDrafts.value.length
  optionDrafts.value.push({ option_text: '', is_correct: false, sort_order: nextOrder })
}

function removeOption(index: number) {
  if (optionDrafts.value.length <= 2) {
    toast({ title: 'Kamida 2 ta variant bo\'lishi kerak', variant: 'destructive' })
    return
  }
  const opt = optionDrafts.value[index]
  if (opt.id) {
    opt._deleted = true
  } else {
    optionDrafts.value.splice(index, 1)
  }
  // Re-index sort_order
  let idx = 0
  for (const o of optionDrafts.value) {
    if (!o._deleted) {
      o.sort_order = idx++
    }
  }
}

const visibleOptions = computed(() => optionDrafts.value.filter((o) => !o._deleted))

async function saveQuestion() {
  // Validation
  if (!form.question_text.trim()) {
    toast({ title: 'Savol matni kiritilmagan', variant: 'destructive' })
    return
  }
  const activeOpts = optionDrafts.value.filter((o) => !o._deleted)
  if (activeOpts.length < 2) {
    toast({ title: 'Kamida 2 ta variant kerak', variant: 'destructive' })
    return
  }
  const hasCorrect = activeOpts.some((o) => o.is_correct)
  if (!hasCorrect) {
    toast({ title: 'Kamida bitta to\'g\'ri javob belgilanishi kerak', variant: 'destructive' })
    return
  }
  for (const o of activeOpts) {
    if (!o.option_text.trim()) {
      toast({ title: 'Barcha variantlarga matn kiriting', variant: 'destructive' })
      return
    }
  }

  isSaving.value = true
  try {
    let questionId: number

    if (isEditing.value && editingId.value) {
      // Update question
      const payload: QuestionUpdate = {
        question_text: form.question_text,
        question_type: form.question_type,
        difficulty: form.difficulty,
        points: form.points,
        test_id: form.test_id,
        category_id: form.category_id,
        explanation: form.explanation || null,
        is_active: form.is_active,
      }
      const res = await updateQuestion(editingId.value, payload)
      if (!res.success) {
        toast({ title: 'Xatolik', description: res.error ?? 'Savolni yangilashda xatolik', variant: 'destructive' })
        return
      }
      questionId = editingId.value
    } else {
      // Create question
      const payload: QuestionInsert = {
        question_text: form.question_text,
        question_type: form.question_type,
        difficulty: form.difficulty,
        points: form.points,
        test_id: form.test_id,
        category_id: form.category_id,
        explanation: form.explanation || null,
        is_active: form.is_active,
        created_by: auth.user?.id ?? null,
      }
      const res = await createQuestion(payload)
      if (!res.success || !res.data) {
        toast({ title: 'Xatolik', description: res.error ?? 'Savol yaratishda xatolik', variant: 'destructive' })
        return
      }
      questionId = res.data.id
    }

    // Save answer options
    await syncAnswerOptions(questionId)

    toast({ title: isEditing.value ? 'Savol yangilandi' : 'Savol yaratildi', variant: 'success' })
    closeSlideOver()
    await loadQuestions()
  } catch (err) {
    toast({ title: 'Xatolik', description: 'Kutilmagan xatolik yuz berdi', variant: 'destructive' })
  } finally {
    isSaving.value = false
  }
}

async function syncAnswerOptions(questionId: number) {
  const promises: Promise<unknown>[] = []

  for (const opt of optionDrafts.value) {
    if (opt._deleted && opt.id) {
      // Delete existing option
      promises.push(deleteOption(opt.id))
    } else if (!opt._deleted && opt.id) {
      // Update existing option
      promises.push(
        updateOption(opt.id, {
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sort_order: opt.sort_order,
        }),
      )
    } else if (!opt._deleted && !opt.id) {
      // Create new option
      const payload: AnswerOptionInsert = {
        question_id: questionId,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        sort_order: opt.sort_order,
      }
      promises.push(createOption(payload))
    }
  }

  await Promise.all(promises)
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------
const isDeleteModalOpen = ref(false)
const deletingQuestion = ref<QuestionWithDetails | null>(null)
const isDeleting = ref(false)

function openDeleteModal(q: QuestionWithDetails) {
  deletingQuestion.value = q
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  deletingQuestion.value = null
}

async function confirmDelete() {
  if (!deletingQuestion.value) return
  isDeleting.value = true
  try {
    const res = await deleteQuestion(deletingQuestion.value.id)
    if (res.success) {
      toast({ title: 'Savol o\'chirildi', variant: 'success' })
      closeDeleteModal()
      await loadQuestions()
    } else {
      toast({ title: 'Xatolik', description: res.error ?? 'O\'chirishda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'O\'chirishda xatolik', variant: 'destructive' })
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------
const pageNumbers = computed(() => {
  const total = pagination.value.total_pages
  const current = pagination.value.page
  const pages: (number | '...')[] = []

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

// ---------------------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------------------
async function exportQuestions() {
  const columns: ExcelColumn<QuestionWithDetails>[] = [
    { key: 'id', label: 'ID' },
    { key: 'question_text', label: 'Savol matni' },
    { key: 'question_type', label: 'Turi', transform: (v) => QUESTION_TYPE_LABELS[v as QuestionType] ?? String(v) },
    { key: 'difficulty', label: 'Qiyinlik', transform: (v) => DIFFICULTY_LABELS[v as DifficultyLevel] ?? String(v) },
    { key: 'points', label: 'Ball' },
    { key: 'test', label: 'Test', transform: (_v, row) => row.test?.name ?? '—' },
    { key: 'category', label: 'Kategoriya', transform: (_v, row) => row.category?.name ?? '—' },
    { key: 'answer_options', label: 'Variantlar soni', transform: (v) => (v as unknown[])?.length ?? 0 },
    { key: 'is_active', label: 'Holat', transform: (v) => v ? 'Faol' : 'Nofaol' },
  ]
  await exportToExcel(questions.value, columns, 'savollar')
}

// ---------------------------------------------------------------------------
// Excel Import
// ---------------------------------------------------------------------------
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    const rows = await importFromExcel<Record<string, unknown>>(file)
    if (!rows.length) {
      toast({ title: 'Bo\'sh fayl', description: 'Excel faylda ma\'lumot topilmadi', variant: 'destructive' })
      return
    }

    let imported = 0
    for (const row of rows) {
      const questionText = String(row['Savol matni'] ?? row['question_text'] ?? '').trim()
      if (!questionText) continue

      // Map difficulty
      const diffStr = String(row['Qiyinlik'] ?? row['difficulty'] ?? 'easy').toLowerCase()
      let difficulty: DifficultyLevel = DIFFICULTY_LEVELS.EASY
      if (diffStr.includes('medium') || diffStr.includes('o\'rta')) difficulty = DIFFICULTY_LEVELS.MEDIUM
      else if (diffStr.includes('hard') || diffStr.includes('qiyin')) difficulty = DIFFICULTY_LEVELS.HARD

      const points = Number(row['Ball'] ?? row['points'] ?? QUESTION_POINTS.DEFAULT) || QUESTION_POINTS.DEFAULT

      const payload: QuestionInsert = {
        question_text: questionText,
        question_type: QUESTION_TYPES.MULTIPLE_CHOICE,
        difficulty,
        points,
        test_id: null,
        category_id: null,
        explanation: String(row['Tushuntirish'] ?? row['explanation'] ?? '') || null,
        is_active: true,
        created_by: auth.user?.id ?? null,
      }

      const res = await createQuestion(payload)
      if (res.success && res.data) {
        imported++

        // Try to import answer options from columns A, B, C, D, etc.
        const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F']
        const correctKey = String(row['To\'g\'ri javob'] ?? row['correct'] ?? '').toUpperCase()

        for (let i = 0; i < optionKeys.length; i++) {
          const optText = String(row[optionKeys[i]] ?? '').trim()
          if (!optText) continue
          await createOption({
            question_id: res.data.id,
            option_text: optText,
            is_correct: optionKeys[i] === correctKey,
            sort_order: i,
          })
        }
      }
    }

    toast({ title: `${imported} ta savol import qilindi`, variant: 'success' })
    await loadQuestions()
  } catch (err) {
    toast({ title: 'Import xatosi', description: 'Excel faylni o\'qishda xatolik', variant: 'destructive' })
  } finally {
    isImporting.value = false
    if (target) target.value = ''
  }
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
onMounted(async () => {
  await loadReferenceData()
  await loadQuestions()
})
</script>

<template>
  <div class="space-y-6">
    <!-- ================================================================= -->
    <!-- Header                                                            -->
    <!-- ================================================================= -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Savollar</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Jami: {{ pagination.total_count }} ta savol
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="handleFileImport"
        />
        <button
          @click="triggerImport"
          :disabled="isImporting"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Loader2 v-if="isImporting" class="w-4 h-4 animate-spin" />
          <Upload v-else class="w-4 h-4" />
          Import
        </button>
        <button
          @click="exportQuestions"
          :disabled="!questions.length"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download class="w-4 h-4" />
          Excel
        </button>
        <button
          @click="openAdd"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus class="w-4 h-4" />
          Qo'shish
        </button>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Filters                                                           -->
    <!-- ================================================================= -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Qidirish..."
          class="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
        />
      </div>

      <!-- Test filter -->
      <select
        v-model="filters.test_id"
        @change="onFilterChange"
        class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
      >
        <option :value="undefined">Barcha testlar</option>
        <option v-for="t in tests" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>

      <!-- Difficulty filter -->
      <select
        v-model="filters.difficulty"
        @change="onFilterChange"
        class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
      >
        <option :value="undefined">Barcha qiyinlik</option>
        <option
          v-for="(value, key) in DIFFICULTY_LEVELS"
          :key="key"
          :value="value"
        >
          {{ DIFFICULTY_LABELS[value] }}
        </option>
      </select>
    </div>

    <!-- ================================================================= -->
    <!-- Loading skeleton                                                  -->
    <!-- ================================================================= -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="h-28 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- ================================================================= -->
    <!-- Empty state                                                       -->
    <!-- ================================================================= -->
    <div
      v-else-if="questions.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <FileQuestion class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">Savollar topilmadi</h3>
      <p class="text-sm text-muted-foreground mt-1">
        Yangi savol qo'shish uchun "Qo'shish" tugmasini bosing
      </p>
    </div>

    <!-- ================================================================= -->
    <!-- Questions list (cards)                                            -->
    <!-- ================================================================= -->
    <div v-else class="space-y-3">
      <div
        v-for="q in questions"
        :key="q.id"
        class="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Main content -->
          <div class="flex-1 min-w-0 space-y-2">
            <!-- Question text -->
            <p class="text-sm font-medium text-foreground leading-relaxed">
              {{ truncate(q.question_text) }}
            </p>

            <!-- Meta row -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Difficulty badge -->
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  difficultyBadgeClass(q.difficulty),
                ]"
              >
                {{ DIFFICULTY_LABELS[q.difficulty] }}
              </span>

              <!-- Question type badge -->
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {{ QUESTION_TYPE_LABELS[q.question_type] }}
              </span>

              <!-- Test name -->
              <span
                v-if="q.test"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              >
                {{ q.test.name }}
              </span>

              <!-- Points -->
              <span class="text-xs text-muted-foreground">
                {{ q.points }} ball
              </span>

              <!-- Answer count -->
              <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 class="w-3 h-3" />
                {{ q.answer_options?.length ?? 0 }} variant
              </span>

              <!-- Active status -->
              <span
                v-if="!q.is_active"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400"
              >
                Nofaol
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEdit(q)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Tahrirlash"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              @click="openDeleteModal(q)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="O'chirish"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Pagination                                                        -->
    <!-- ================================================================= -->
    <div
      v-if="!isLoading && pagination.total_pages > 1"
      class="flex items-center justify-center gap-1 pt-2"
    >
      <button
        :disabled="!pagination.has_previous"
        @click="goToPage(pagination.page - 1)"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <template v-for="(p, i) in pageNumbers" :key="i">
        <span v-if="p === '...'" class="px-2 text-sm text-muted-foreground select-none">...</span>
        <button
          v-else
          @click="goToPage(p)"
          :class="[
            'inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors',
            p === pagination.page
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground',
          ]"
        >
          {{ p }}
        </button>
      </template>

      <button
        :disabled="!pagination.has_next"
        @click="goToPage(pagination.page + 1)"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- ================================================================= -->
    <!-- Slide-over backdrop                                               -->
    <!-- ================================================================= -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isSlideOverOpen"
          class="fixed inset-0 z-40 bg-black/50"
          @click="closeSlideOver"
        />
      </Transition>

      <!-- ================================================================= -->
      <!-- Slide-over panel                                                  -->
      <!-- ================================================================= -->
      <Transition name="slide">
        <div
          v-if="isSlideOverOpen"
          class="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l border-border shadow-xl flex flex-col"
        >
          <!-- Slide-over header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 class="text-lg font-semibold text-foreground">
              {{ isEditing ? 'Savolni tahrirlash' : 'Yangi savol' }}
            </h2>
            <button
              @click="closeSlideOver"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Slide-over body -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <!-- Question text -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Savol matni</label>
              <textarea
                v-model="form.question_text"
                rows="3"
                placeholder="Savol matnini kiriting..."
                class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-y transition-colors"
              />
            </div>

            <!-- Row: question_type + difficulty -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">Savol turi</label>
                <select
                  v-model="form.question_type"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                >
                  <option
                    v-for="(value, key) in QUESTION_TYPES"
                    :key="key"
                    :value="value"
                  >
                    {{ QUESTION_TYPE_LABELS[value] }}
                  </option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">Qiyinlik</label>
                <select
                  v-model="form.difficulty"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                >
                  <option
                    v-for="(value, key) in DIFFICULTY_LEVELS"
                    :key="key"
                    :value="value"
                  >
                    {{ DIFFICULTY_LABELS[value] }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Row: points + test_id -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">Ball</label>
                <input
                  v-model.number="form.points"
                  type="number"
                  :min="QUESTION_POINTS.MIN"
                  :max="QUESTION_POINTS.MAX"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">Test</label>
                <select
                  v-model="form.test_id"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                >
                  <option :value="null">Tanlanmagan</option>
                  <option v-for="t in tests" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
            </div>

            <!-- Category -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Kategoriya</label>
              <select
                v-model="form.category_id"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
              >
                <option :value="null">Tanlanmagan</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <!-- Explanation -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">Tushuntirish (ixtiyoriy)</label>
              <textarea
                v-model="form.explanation"
                rows="2"
                placeholder="Javob uchun tushuntirish..."
                class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-y transition-colors"
              />
            </div>

            <!-- Active checkbox -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.is_active"
                type="checkbox"
                class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span class="text-sm font-medium text-foreground">Faol</span>
            </label>

            <!-- ============================================================= -->
            <!-- Answer Options Builder                                        -->
            <!-- ============================================================= -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-foreground">Javob variantlari</label>
                <button
                  @click="addOption"
                  type="button"
                  class="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <CirclePlus class="w-4 h-4" />
                  Qo'shish
                </button>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(opt, index) in visibleOptions"
                  :key="index"
                  class="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5"
                >
                  <!-- Is correct checkbox -->
                  <label class="flex items-center shrink-0 cursor-pointer" :title="opt.is_correct ? 'To\'g\'ri javob' : 'Noto\'g\'ri javob'">
                    <input
                      v-model="opt.is_correct"
                      type="checkbox"
                      class="h-4 w-4 rounded border-input text-green-600 focus:ring-green-500"
                    />
                  </label>

                  <!-- Option text -->
                  <input
                    v-model="opt.option_text"
                    type="text"
                    :placeholder="`Variant ${index + 1}`"
                    class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
                  />

                  <!-- Remove button -->
                  <button
                    @click="removeOption(optionDrafts.indexOf(opt))"
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Olib tashlash"
                  >
                    <CircleMinus class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p class="text-xs text-muted-foreground">
                To'g'ri javob(lar)ni belgilash uchun chap tomondagi checkboxni bosing.
              </p>
            </div>
          </div>

          <!-- Slide-over footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
            <button
              @click="closeSlideOver"
              type="button"
              class="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Bekor qilish
            </button>
            <button
              @click="saveQuestion"
              :disabled="isSaving"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
              {{ isEditing ? 'Saqlash' : 'Yaratish' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ================================================================= -->
    <!-- Delete confirmation modal                                         -->
    <!-- ================================================================= -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isDeleteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <Transition name="scale">
            <div
              v-if="isDeleteModalOpen"
              class="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg mx-4"
            >
              <h3 class="text-lg font-semibold text-foreground">Savolni o'chirish</h3>
              <p class="mt-2 text-sm text-muted-foreground">
                "{{ truncate(deletingQuestion?.question_text ?? '', 80) }}" savolini o'chirishni xohlaysizmi?
                Bu amalni qaytarib bo'lmaydi.
              </p>

              <div class="flex items-center justify-end gap-3 mt-6">
                <button
                  @click="closeDeleteModal"
                  :disabled="isDeleting"
                  type="button"
                  class="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Bekor qilish
                </button>
                <button
                  @click="confirmDelete"
                  :disabled="isDeleting"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
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

<style scoped>
/* Fade transition (backdrop + modal) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide-over from right */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Scale transition (modal content) */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
