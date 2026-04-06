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
import ImageUploader from '@/components/ImageUploader.vue'
import { useImageUpload, IMAGE_BUCKETS } from '@/composables/useImageUpload'
import { importFromExcel } from '@/composables/useExcel'
import {
  fetchQuestions,
  fetchTests,
  fetchCategories,
  fetchSubjects,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createOption,
  updateOption,
  deleteOption,
  syncQuestionTests,
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
  Subject,
  CategoryWithSubject,
  QuestionListFilters,
} from '@/types'

// ---------------------------------------------------------------------------
// Composables & stores
// ---------------------------------------------------------------------------
const auth = useAuthStore()
const { toast } = useToast()
const { uploadImage, deleteImage, replaceImage, isUploading: isImageUploading, uploadError: imageUploadError } = useImageUpload()

// ---------------------------------------------------------------------------
// Reference data (for selects / filters)
// ---------------------------------------------------------------------------
const tests = ref<Test[]>([])
const subjects = ref<Subject[]>([])
const categories = ref<CategoryWithSubject[]>([])

async function loadReferenceData() {
  const [testsRes, subjRes, catsRes] = await Promise.all([
    fetchTests({ page: 1, page_size: 500 }),
    fetchSubjects(),
    fetchCategories(),
  ])
  if (testsRes.success) tests.value = testsRes.data as unknown as Test[]
  if (subjRes.success && subjRes.data) subjects.value = subjRes.data
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
  test_ids: [] as number[],
  category_id: null as number | null,
  explanation: '',
  is_active: true,
  image_url: null as string | null,
})

const pendingImageFile = ref<File | null>(null)
const imageRemoved = ref(false)

const optionDrafts = ref<OptionDraft[]>([])

function resetForm() {
  form.question_text = ''
  form.question_type = QUESTION_TYPES.MULTIPLE_CHOICE
  form.difficulty = DIFFICULTY_LEVELS.EASY
  form.points = QUESTION_POINTS.DEFAULT
  form.test_ids = []
  form.category_id = null
  form.explanation = ''
  form.is_active = true
  form.image_url = null
  pendingImageFile.value = null
  imageRemoved.value = false
  optionDrafts.value = [
    { option_text: '', is_correct: false, sort_order: 0 },
    { option_text: '', is_correct: false, sort_order: 1 },
  ]
}

function onQuestionImageSelected(file: File) {
  pendingImageFile.value = file
  imageRemoved.value = false
}

function onQuestionImageRemoved() {
  pendingImageFile.value = null
  imageRemoved.value = true
  form.image_url = null
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
  form.test_ids = (q.tests ?? []).map(t => t.id)
  form.category_id = q.category_id
  form.explanation = q.explanation ?? ''
  form.is_active = q.is_active
  form.image_url = q.image_url ?? null
  pendingImageFile.value = null
  imageRemoved.value = false

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
    toast({ title: "Kamida 2 ta variant bo'lishi kerak", variant: 'destructive' })
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
    toast({ title: "Kamida bitta to'g'ri javob belgilanishi kerak", variant: 'destructive' })
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
      // --- Handle image upload / removal ---
      let imageUrl: string | null = form.image_url
      if (pendingImageFile.value) {
        const oldUrl = imageUrl
        const newUrl = await replaceImage(
          pendingImageFile.value,
          oldUrl,
          IMAGE_BUCKETS.QUESTIONS,
          `question-${editingId.value}`,
        )
        if (!newUrl) {
          toast({ title: 'Xatolik', description: imageUploadError.value ?? 'Rasmni yuklashda xatolik', variant: 'destructive' })
          return
        }
        imageUrl = newUrl
      } else if (imageRemoved.value && imageUrl) {
        await deleteImage(imageUrl, IMAGE_BUCKETS.QUESTIONS)
        imageUrl = null
      }

      // Update question
      const payload: QuestionUpdate = {
        question_text: form.question_text,
        question_type: form.question_type,
        difficulty: form.difficulty,
        points: form.points,
        category_id: form.category_id,
        explanation: form.explanation || null,
        is_active: form.is_active,
        image_url: imageUrl,
      }
      const res = await updateQuestion(editingId.value, payload)
      if (!res.success) {
        toast({ title: 'Xatolik', description: res.error ?? 'Savolni yangilashda xatolik', variant: 'destructive' })
        return
      }
      questionId = editingId.value
    } else {
      // Create question first (need the ID for the image path)
      const payload: QuestionInsert = {
        question_text: form.question_text,
        question_type: form.question_type,
        difficulty: form.difficulty,
        points: form.points,
        category_id: form.category_id,
        explanation: form.explanation || null,
        is_active: form.is_active,
        created_by: auth.user?.id ?? null,
        image_url: null, // set after upload
      }
      const res = await createQuestion(payload)
      if (!res.success || !res.data) {
        toast({ title: 'Xatolik', description: res.error ?? 'Savol yaratishda xatolik', variant: 'destructive' })
        return
      }
      questionId = res.data.id

      // Upload image after question created
      if (pendingImageFile.value) {
        const imageUrl = await uploadImage(
          pendingImageFile.value,
          IMAGE_BUCKETS.QUESTIONS,
          `question-${questionId}`,
        )
        if (imageUrl) {
          await updateQuestion(questionId, { image_url: imageUrl })
        }
      }
    }

    // Save answer options + sync test links
    await Promise.all([
      syncAnswerOptions(questionId),
      syncQuestionTests(questionId, form.test_ids),
    ])

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
    // Storage dan savol rasmini o'chirish
    if (deletingQuestion.value.image_url) {
      await deleteImage(deletingQuestion.value.image_url, IMAGE_BUCKETS.QUESTIONS)
    }

    const res = await deleteQuestion(deletingQuestion.value.id)
    if (res.success) {
      toast({ title: "Savol o'chirildi", variant: 'success' })
      closeDeleteModal()
      await loadQuestions()
    } else {
      toast({ title: 'Xatolik', description: res.error ?? "O'chirishda xatolik", variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: "O'chirishda xatolik", variant: 'destructive' })
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
// Har bir savol uchun variantlar dinamik ustunlarga chiqariladi.
// Max variantlar sonini aniqlab, Variant1...VariantN va "To'g'ri javob" ustunlari qo'shiladi.
// ---------------------------------------------------------------------------
async function exportQuestions() {
  // Barcha savollar orasida maksimal variant sonini topamiz
  const maxOptions = questions.value.reduce((max, q) => {
    return Math.max(max, q.answer_options?.length ?? 0)
  }, 0)

  // Asosiy ustunlar
  const rows = questions.value.map((q) => {
    const sorted = (q.answer_options ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

    // To'g'ri javob nomlarini topamiz (Variant1, Variant2, ...)
    const correctLabels: string[] = []
    sorted.forEach((opt, idx) => {
      if (opt.is_correct) correctLabels.push(`Variant${idx + 1}`)
    })

    const row: Record<string, string | number> = {
      ID: q.id,
      'Savol matni': q.question_text,
      Turi: QUESTION_TYPE_LABELS[q.question_type as QuestionType] ?? q.question_type,
      Qiyinlik: DIFFICULTY_LABELS[q.difficulty as DifficultyLevel] ?? q.difficulty,
      Ball: q.points,
      Test: (q.tests ?? []).map(t => t.name).join(', '),
      Kategoriya: q.category?.name ?? '',
    }

    // Variant ustunlari
    for (let i = 0; i < maxOptions; i++) {
      row[`Variant${i + 1}`] = sorted[i]?.option_text ?? ''
    }

    row["To'g'ri javob"] = correctLabels.join(', ')
    row['Tushuntirish'] = q.explanation ?? ''
    row['Holat'] = q.is_active ? 'Faol' : 'Nofaol'

    return row
  })

  // useExcel dan foydalanmasdan to'g'ridan-to'g'ri SheetJS ishlatamiz (dinamik ustunlar uchun)
  const XLSX = await import('xlsx')

  if (!rows.length) {
    toast({ title: 'Eksport qilish uchun savollar topilmadi', variant: 'destructive' })
    return
  }

  const ws = XLSX.utils.json_to_sheet(rows)

  // Ustun kengliklarini avtomatik sozlash
  const header = Object.keys(rows[0])
  ws['!cols'] = header.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 60) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Savollar')
  XLSX.writeFile(wb, 'savollar.xlsx')

  toast({ title: `${rows.length} ta savol eksport qilindi`, variant: 'success' })
}

// ---------------------------------------------------------------------------
// Excel Shablon Export (Import uchun bo'sh shablon)
// Minimum format + kengaytirilgan ustunlar, 2 ta namuna qator bilan
// ---------------------------------------------------------------------------
async function exportTemplate() {
  const XLSX = await import('xlsx')

  // Shablon sarlavhasi (minimum + ixtiyoriy ustunlar)
  // Namuna qatorlar — foydalanuvchi uchun ko'rsatma
  const sampleRows = [
    {
      'Savol matni': '2 + 2 = ?',
      'Variant1': '3',
      'Variant2': '4',
      'Variant3': '5',
      'Variant4': '6',
      "To'g'ri javob": '2',          // 2-chi variant (Variant2) to'g'ri
      'Qiyinlik': 'Oson',             // Oson | O\'rta | Qiyin
      'Ball': '1',
      'Tushuntirish': '2 + 2 = 4',
      'Holat': 'Faol',                // Faol | Nofaol
      'Fan': 'Matematika',            // Fan nomi (ixtiyoriy)
      'Test': 'Arifmetika asoslari',  // Test nomi (ixtiyoriy)
    },
    {
      'Savol matni': 'O\'zbekiston poytaxti qaysi shahar?',
      'Variant1': 'Samarqand',
      'Variant2': 'Buxoro',
      'Variant3': 'Toshkent',
      'Variant4': '',
      "To'g'ri javob": '3',          // 3-chi variant (Variant3) to'g'ri
      'Qiyinlik': "O'rta",
      'Ball': '1',
      'Tushuntirish': '',
      'Holat': 'Faol',
      'Fan': 'Geografiya',
      'Test': '',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleRows)

  // Ustun kengliklarini sozlash
  const keys = Object.keys(sampleRows[0])
  ws['!cols'] = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...sampleRows.map((r) => String((r as Record<string, string>)[key] ?? '').length),
    )
    return { wch: Math.min(maxLen + 4, 60) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Shablon')
  XLSX.writeFile(wb, 'savollar_shablon.xlsx')

  toast({ title: 'Shablon yuklab olindi', variant: 'success' })
}

// ---------------------------------------------------------------------------
// Excel Import
//
// Qo'llab-quvvatlanadigan formatlar:
//   MINIMUM (majburiy): "Savol matni" | Variant1 | Variant2 | "To'g'ri javob" (raqam: 1, 2, ...)
//   KENGAYTIRILGAN (ixtiyoriy): + Qiyinlik | Ball | Tushuntirish | Holat | Fan | Test
//
// "To'g'ri javob" ustuni:
//   - Bitta raqam:       1        → Variant1 to'g'ri
//   - Vergul bilan:      1,3      → Variant1 va Variant3 to'g'ri
//   - Variant nomi bilan: Variant2 → Variant2 to'g'ri (avvalgi format ham ishlaydi)
//
// "Fan" ustuni (ixtiyoriy):
//   - Fan nomi yozilsa, shu fanga tegishli testlardan qidiriladi
// "Test" ustuni (ixtiyoriy):
//   - Test nomi yozilsa, test_id o'rnatiladi
//   - Agar "Fan" ham berilsa, faqat shu fanga tegishli testlardan qidiriladi
// ---------------------------------------------------------------------------
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)

function triggerImport() {
  fileInput.value?.click()
}

/**
 * "To'g'ri javob" ustun qiymatini tahlil qiladi.
 * Raqam (1, 2, 3) ham, Variant nomi (Variant1, Variant2) ham qabul qilinadi.
 * Qaytaradi: to'g'ri bo'lgan variantlarning 0-based index to'plami.
 */
function parseCorrectAnswers(raw: string, variantCount: number): Set<number> {
  const result = new Set<number>()
  if (!raw.trim()) return result

  const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    // Sof raqam: "1", "2", "3" — 1-based indeks
    if (/^\d+$/.test(part)) {
      const idx = parseInt(part, 10) - 1 // 0-based ga o'tkazish
      if (idx >= 0 && idx < variantCount) result.add(idx)
    }
    // Variant nomi: "Variant1", "variant2" — avvalgi format mos kelishi uchun
    else if (/^variant(\d+)$/i.test(part)) {
      const match = part.match(/^variant(\d+)$/i)
      if (match) {
        const idx = parseInt(match[1], 10) - 1
        if (idx >= 0 && idx < variantCount) result.add(idx)
      }
    }
  }

  return result
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    const rows = await importFromExcel<Record<string, unknown>>(file)
    if (!rows.length) {
      toast({ title: "Bo'sh fayl", description: "Excel faylda ma'lumot topilmadi", variant: 'destructive' })
      return
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      // --- 1. Savol matni (majburiy) ---
      const questionText = String(row['Savol matni'] ?? '').trim()
      if (!questionText || questionText === 'Savol matni bu yerga yoziladi') {
        skipped++
        continue
      }

      // --- 2. Variant ustunlarini topish (Variant1, Variant2, ...) ---
      const variantKeys = Object.keys(row)
        .filter((k) => /^Variant\d+$/i.test(k))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''), 10)
          const numB = parseInt(b.replace(/\D/g, ''), 10)
          return numA - numB
        })

      const variantTexts = variantKeys
        .map((k) => String(row[k] ?? '').trim())
        .filter(Boolean)

      if (variantTexts.length < 2) {
        errors.push(`"${questionText.slice(0, 40)}..." — kamida 2 ta variant kerak`)
        skipped++
        continue
      }

      // --- 3. To'g'ri javobni aniqlash ---
      const correctRaw = String(row["To'g'ri javob"] ?? row['correct'] ?? '').trim()
      const correctIndexes = parseCorrectAnswers(correctRaw, variantTexts.length)

      if (correctIndexes.size === 0) {
        errors.push(`"${questionText.slice(0, 40)}..." — to'g'ri javob ko'rsatilmagan`)
        skipped++
        continue
      }

      // --- 4. Ixtiyoriy maydonlar ---
      const diffStr = String(row['Qiyinlik'] ?? '').toLowerCase()
      let difficulty: DifficultyLevel = DIFFICULTY_LEVELS.EASY
      if (diffStr.includes('medium') || diffStr.includes("o'rta") || diffStr.includes('orta')) {
        difficulty = DIFFICULTY_LEVELS.MEDIUM
      } else if (diffStr.includes('hard') || diffStr.includes('qiyin')) {
        difficulty = DIFFICULTY_LEVELS.HARD
      }

      const points = Number(row['Ball'] ?? QUESTION_POINTS.DEFAULT) || QUESTION_POINTS.DEFAULT
      const explanation = String(row['Tushuntirish'] ?? '').trim() || null
      const isActive = String(row['Holat'] ?? 'Faol').toLowerCase() !== 'nofaol'

      // --- 5. Fan va Test bo'yicha testlarni aniqlash ---
      const subjectName = String(row['Fan'] ?? '').trim().toLowerCase()
      const testNamesRaw = String(row['Test'] ?? '').trim()
      const resolvedTestIds: number[] = []

      if (testNamesRaw) {
        // Vergul bilan ajratilgan bir nechta test nomi qo'llab-quvvatlanadi
        const testNameList = testNamesRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        for (const tn of testNameList) {
          let candidateTests = tests.value
          if (subjectName) {
            const matchedSubject = subjects.value.find(
              (s) => s.name.toLowerCase() === subjectName,
            )
            if (matchedSubject) {
              candidateTests = tests.value.filter(
                (t) => t.subject_id === matchedSubject.id,
              )
            }
          }
          const matchedTest = candidateTests.find(
            (t) => t.name.toLowerCase() === tn,
          )
          if (matchedTest) resolvedTestIds.push(matchedTest.id)
        }
      }

      // --- 6. Savol yaratish ---
      const payload: QuestionInsert = {
        question_text: questionText,
        question_type: QUESTION_TYPES.MULTIPLE_CHOICE,
        difficulty,
        points,
        category_id: null,
        explanation,
        is_active: isActive,
        created_by: auth.user?.id ?? null,
        image_url: null,
      }

      const res = await createQuestion(payload)
      if (!res.success || !res.data) {
        errors.push(`"${questionText.slice(0, 40)}..." — saqlashda xatolik`)
        skipped++
        continue
      }

      imported++

      // --- 7. Variantlarni saqlash + test bog'lanishlarni yaratish ---
      const optionPromises = []
      for (let i = 0; i < variantTexts.length; i++) {
        optionPromises.push(createOption({
          question_id: res.data.id,
          option_text: variantTexts[i],
          is_correct: correctIndexes.has(i),
          sort_order: i,
        }))
      }
      if (resolvedTestIds.length > 0) {
        optionPromises.push(syncQuestionTests(res.data.id, resolvedTestIds))
      }
      await Promise.all(optionPromises)
    }

    // --- Natija xabari ---
    if (imported > 0) {
      toast({
        title: `${imported} ta savol import qilindi`,
        description: skipped > 0 ? `${skipped} ta qator o'tkazib yuborildi` : undefined,
        variant: 'success',
      })
    } else {
      const hint = errors.length
        ? errors.slice(0, 3).join(' | ')
        : "Fayl formatini tekshiring: 'Savol matni', 'Variant1', 'Variant2', \"To'g'ri javob\" ustunlari bo'lishi kerak"
      toast({ title: "Hech qanday savol import qilinmadi", description: hint, variant: 'destructive' })
    }

    await loadQuestions()
  } catch (err) {
    toast({ title: 'Import xatosi', description: "Excel faylni o'qishda xatolik", variant: 'destructive' })
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
        <!-- Import tugmasi -->
        <button
          @click="triggerImport"
          :disabled="isImporting"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Loader2 v-if="isImporting" class="w-4 h-4 animate-spin" />
          <Upload v-else class="w-4 h-4" />
          Import
        </button>
        <!-- Shablon yuklab olish -->
        <button
          @click="exportTemplate"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          title="Import uchun bo'sh shablon yuklab olish"
        >
          <Download class="w-4 h-4" />
          Shablon
        </button>
        <!-- Export tugmasi -->
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
            <!-- Question text with optional image thumbnail -->
            <div class="flex items-start gap-3">
              <img
                v-if="q.image_url"
                :src="q.image_url"
                alt="Savol rasmi"
                class="h-14 w-14 shrink-0 rounded-lg object-cover border border-border"
              />
              <p class="text-sm font-medium text-foreground leading-relaxed">
                {{ truncate(q.question_text) }}
              </p>
            </div>

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

              <!-- Test names -->
              <span
                v-for="t in (q.tests ?? [])"
                :key="t.id"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              >
                {{ t.name }}
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
                <label class="text-sm font-medium text-foreground">
                  Testlar
                  <span v-if="form.test_ids.length" class="font-normal text-muted-foreground">({{ form.test_ids.length }} ta tanlangan)</span>
                </label>
                <div class="max-h-40 overflow-y-auto rounded-lg border border-input bg-background p-2 space-y-1">
                  <label
                    v-for="t in tests"
                    :key="t.id"
                    class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      :value="t.id"
                      v-model="form.test_ids"
                      class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <span class="text-sm text-foreground">{{ t.name }}</span>
                  </label>
                  <p v-if="!tests.length" class="text-xs text-muted-foreground px-2 py-1">Testlar topilmadi</p>
                </div>
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

            <!-- Question Image -->
            <ImageUploader
              :model-value="form.image_url"
              :is-uploading="isImageUploading"
              :error="imageUploadError"
              label="Savol rasmi (ixtiyoriy)"
              hint="JPEG, PNG, WebP — max 5 MB"
              shape="square"
              size="lg"
              @file-selected="onQuestionImageSelected"
              @remove="onQuestionImageRemoved"
            />

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
