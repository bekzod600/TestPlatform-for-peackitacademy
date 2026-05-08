<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Users,
  TrendingUp,
  Target,
  Loader2,
} from 'lucide-vue-next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { fetchAttempts, fetchQuestionAnalytics } from '@/api/admin.api'
import type { QuestionAnalytics } from '@/api/admin.api'
import { fetchAttemptDetails } from '@/api/student.api'
import { exportToExcel } from '@/composables/useExcel'
import { exportToPdf } from '@/composables/usePdf'
import type { ExcelColumn } from '@/composables/useExcel'
import type { PdfColumn } from '@/composables/usePdf'
import type { TestAttemptWithDetails, TestAnswerWithDetails } from '@/types'

const isLoading = ref(true)
const attempts = ref<TestAttemptWithDetails[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const expandedId = ref<number | null>(null)
const detailsCache = ref<Record<number, TestAnswerWithDetails[]>>({})
const detailLoading = ref<Record<number, boolean>>({})

// Enhanced filters
const dateFrom = ref('')
const dateTo = ref('')
const scoreMin = ref<number | null>(null)
const scoreMax = ref<number | null>(null)
const passFilter = ref<'' | 'passed' | 'failed'>('')

// Analytics state
const activeTab = ref('results')
const analyticsTestId = ref<number | null>(null)
const analytics = ref<QuestionAnalytics[]>([])
const analyticsLoading = ref(false)

async function loadResults() {
  isLoading.value = true
  try {
    const result = await fetchAttempts({
      sort_by: 'created_at',
      sort_order: 'desc',
      date_from: dateFrom.value || undefined,
      date_to: dateTo.value || undefined,
    })
    if (result.success && result.data) {
      attempts.value = result.data
    }
  } catch (err) {
    console.error('Error loading results:', err)
  } finally {
    isLoading.value = false
  }
}

async function toggleDetails(attemptId: number) {
  if (expandedId.value === attemptId) {
    expandedId.value = null
    return
  }
  expandedId.value = attemptId

  if (!detailsCache.value[attemptId]) {
    detailLoading.value = { ...detailLoading.value, [attemptId]: true }
    try {
      const result = await fetchAttemptDetails(attemptId)
      if (result.success && result.data) {
        detailsCache.value = { ...detailsCache.value, [attemptId]: result.data.answers }
      }
    } catch (err) {
      console.error('Error loading details:', err)
    } finally {
      detailLoading.value = { ...detailLoading.value, [attemptId]: false }
    }
  }
}

async function loadAnalytics(testId: number) {
  analyticsLoading.value = true
  try {
    const result = await fetchQuestionAnalytics(testId)
    if (result.success && result.data) {
      analytics.value = result.data
    }
  } catch (err) {
    console.error('Error loading analytics:', err)
  } finally {
    analyticsLoading.value = false
  }
}

watch(analyticsTestId, (id) => {
  if (id) loadAnalytics(id)
  else analytics.value = []
})

function getScoreColor(pct: number) {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreBg(pct: number) {
  if (pct >= 80) return 'bg-green-500/10'
  if (pct >= 60) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    completed: { label: 'Yakunlangan', class: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    in_progress: { label: 'Davom etmoqda', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    timed_out: { label: 'Vaqt tugadi', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    violation: { label: 'Qoidabuzarlik', class: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  return map[status] || { label: status, class: 'bg-muted text-muted-foreground' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })
}

const filtered = computed(() => {
  let result = attempts.value
  if (statusFilter.value) {
    result = result.filter(a => a.status === statusFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      (a.user as any)?.full_name?.toLowerCase().includes(q) ||
      a.test?.name?.toLowerCase().includes(q)
    )
  }
  if (scoreMin.value !== null) {
    result = result.filter(a => (a.percentage ?? 0) >= scoreMin.value!)
  }
  if (scoreMax.value !== null) {
    result = result.filter(a => (a.percentage ?? 0) <= scoreMax.value!)
  }
  if (passFilter.value) {
    result = result.filter(a => {
      if (!['completed', 'timed_out', 'violation'].includes(a.status)) return false
      const passing = a.test?.passing_score ?? 60
      const passed = (a.percentage ?? 0) >= passing
      return passFilter.value === 'passed' ? passed : !passed
    })
  }
  return result
})

// Unique tests for analytics selector
const uniqueTests = computed(() => {
  const map = new Map<number, string>()
  for (const a of attempts.value) {
    if (a.test?.id && a.test?.name) {
      map.set(a.test.id, a.test.name)
    }
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

// Enhanced stats
const stats = computed(() => {
  const finished = attempts.value.filter(a => ['completed', 'timed_out', 'violation'].includes(a.status))
  if (!finished.length) return null

  const scores = finished.map(a => a.percentage ?? 0)
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length
  const best = Math.max(...scores)
  const sorted = [...scores].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]

  const passCount = finished.filter(a => {
    const passing = a.test?.passing_score ?? 60
    return (a.percentage ?? 0) >= passing
  }).length

  const uniqueStudents = new Set(finished.map(a => a.user_id)).size
  const uniqueTestsCount = new Set(finished.map(a => a.test_id)).size

  return {
    total: finished.length,
    avg: Math.round(avg),
    best: Math.round(best),
    median: Math.round(median),
    passRate: Math.round((passCount / finished.length) * 100),
    uniqueStudents,
    uniqueTests: uniqueTestsCount,
    inProgress: attempts.value.filter(a => a.status === 'in_progress').length,
  }
})

function clearFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  scoreMin.value = null
  scoreMax.value = null
  passFilter.value = ''
}

const hasActiveFilters = computed(() =>
  searchQuery.value.trim() || statusFilter.value || dateFrom.value || dateTo.value
  || scoreMin.value !== null || scoreMax.value !== null || passFilter.value
)

// Excel export
const exportColumns: ExcelColumn<TestAttemptWithDetails>[] = [
  { key: 'id', label: 'ID' },
  { key: 'user', label: 'Student', transform: (_v, row) => (row.user as any)?.full_name ?? '—' },
  { key: 'test', label: 'Test', transform: (_v, row) => row.test?.name ?? '—' },
  { key: 'status', label: 'Status', transform: (v) => getStatusBadge(v as string).label },
  { key: 'total_questions', label: 'Jami savollar' },
  { key: 'correct_answers', label: "To'g'ri" },
  { key: 'wrong_answers', label: "Noto'g'ri" },
  { key: 'skipped_answers', label: "O'tkazilgan" },
  { key: 'percentage', label: 'Natija (%)', transform: (v) => v != null ? Math.round(Number(v)) : 0 },
  { key: 'started_at', label: 'Boshlangan', transform: (v) => formatDate(v as string) },
]

async function exportExcel() {
  await exportToExcel(filtered.value, exportColumns, 'natijalar')
}

async function exportPdf() {
  const pdfCols: PdfColumn<TestAttemptWithDetails>[] = exportColumns.map(c => ({
    key: c.key,
    label: c.label,
    transform: c.transform,
  }))
  await exportToPdf(filtered.value, pdfCols, 'natijalar', 'Test natijalari')
}

// Reload when date filters change (server-side)
watch([dateFrom, dateTo], () => {
  loadResults()
})

onMounted(loadResults)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-foreground">Natijalar</h2>
        <p class="text-sm text-muted-foreground">Barcha test natijalari</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="exportPdf"
          :disabled="!filtered.length"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <FileText class="h-4 w-4" />
          PDF
        </button>
        <button
          @click="exportExcel"
          :disabled="!filtered.length"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download class="h-4 w-4" />
          Excel
        </button>
      </div>
    </div>

    <!-- Enhanced Stats -->
    <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <BarChart3 class="w-4 h-4 text-muted-foreground" />
          <p class="text-xs text-muted-foreground">Jami urinishlar</p>
        </div>
        <p class="text-2xl font-bold text-foreground">{{ stats.total }}</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <TrendingUp class="w-4 h-4 text-muted-foreground" />
          <p class="text-xs text-muted-foreground">O'rtacha / Median</p>
        </div>
        <p class="text-2xl font-bold text-foreground">{{ stats.avg }}% <span class="text-base font-normal text-muted-foreground">/ {{ stats.median }}%</span></p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <Target class="w-4 h-4 text-muted-foreground" />
          <p class="text-xs text-muted-foreground">O'tish darajasi</p>
        </div>
        <p class="text-2xl font-bold text-foreground">{{ stats.passRate }}%</p>
        <p class="text-[10px] text-muted-foreground">Eng yaxshi: {{ stats.best }}%</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 mb-1">
          <Users class="w-4 h-4 text-muted-foreground" />
          <p class="text-xs text-muted-foreground">Studentlar / Testlar</p>
        </div>
        <p class="text-2xl font-bold text-foreground">{{ stats.uniqueStudents }} <span class="text-base font-normal text-muted-foreground">/ {{ stats.uniqueTests }}</span></p>
        <p v-if="stats.inProgress" class="text-[10px] text-blue-600 dark:text-blue-400">{{ stats.inProgress }} ta davom etmoqda</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Student yoki test nomi..."
            class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <select
          v-model="statusFilter"
          class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Barcha statuslar</option>
          <option value="completed">Yakunlangan</option>
          <option value="in_progress">Davom etmoqda</option>
          <option value="timed_out">Vaqt tugadi</option>
          <option value="violation">Qoidabuzarlik</option>
        </select>
        <select
          v-model="passFilter"
          class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">O'tgan/O'tmagan</option>
          <option value="passed">O'tgan</option>
          <option value="failed">O'tmagan</option>
        </select>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex items-center gap-2">
          <label class="text-xs text-muted-foreground whitespace-nowrap">Sana:</label>
          <input
            v-model="dateFrom"
            type="date"
            class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <span class="text-xs text-muted-foreground">—</span>
          <input
            v-model="dateTo"
            type="date"
            class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-muted-foreground whitespace-nowrap">Ball:</label>
          <input
            v-model.number="scoreMin"
            type="number"
            min="0"
            max="100"
            placeholder="Min"
            class="flex h-10 w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <span class="text-xs text-muted-foreground">—</span>
          <input
            v-model.number="scoreMax"
            type="number"
            min="0"
            max="100"
            placeholder="Max"
            class="flex h-10 w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <XCircle class="w-3.5 h-3.5" />
          Tozalash
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Tabs: Results + Analytics -->
    <Tabs v-else v-model="activeTab" default-value="results">
      <TabsList>
        <TabsTrigger value="results">Natijalar ({{ filtered.length }})</TabsTrigger>
        <TabsTrigger value="analytics">Savol tahlili</TabsTrigger>
      </TabsList>

      <!-- Results Tab -->
      <TabsContent value="results">
        <div class="space-y-3 mt-4">
          <div v-if="!filtered.length" class="text-center py-16">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <BarChart3 class="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-semibold text-foreground">Natijalar yo'q</h3>
            <p v-if="hasActiveFilters" class="text-sm text-muted-foreground mt-1">Filtrlarni o'zgartiring yoki tozalang</p>
          </div>

          <div
            v-for="a in filtered"
            :key="a.id"
            class="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              @click="toggleDetails(a.id)"
              class="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div
                  v-if="a.percentage !== null"
                  :class="['flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shrink-0', getScoreBg(a.percentage ?? 0), getScoreColor(a.percentage ?? 0)]"
                >
                  {{ Math.round(a.percentage ?? 0) }}%
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">
                    {{ (a as any).user?.full_name || 'Student' }} — {{ a.test?.name || 'Test' }}
                  </p>
                  <div class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {{ formatDate(a.started_at) }}
                    </span>
                    <span>{{ a.correct_answers ?? 0 }}/{{ a.total_questions }} to'g'ri</span>
                    <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', getStatusBadge(a.status).class]">
                      {{ getStatusBadge(a.status).label }}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown v-if="expandedId !== a.id" class="w-4 h-4 text-muted-foreground shrink-0" />
              <ChevronUp v-else class="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <!-- Expanded -->
            <div v-if="expandedId === a.id" class="border-t border-border">
              <div class="grid grid-cols-3 gap-px bg-border">
                <div class="bg-card p-3 text-center">
                  <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ a.correct_answers ?? 0 }}</p>
                  <p class="text-[10px] text-muted-foreground">To'g'ri</p>
                </div>
                <div class="bg-card p-3 text-center">
                  <p class="text-lg font-bold text-red-600 dark:text-red-400">{{ a.wrong_answers ?? 0 }}</p>
                  <p class="text-[10px] text-muted-foreground">Noto'g'ri</p>
                </div>
                <div class="bg-card p-3 text-center">
                  <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">{{ a.skipped_answers ?? 0 }}</p>
                  <p class="text-[10px] text-muted-foreground">O'tkazilgan</p>
                </div>
              </div>

              <div v-if="detailLoading[a.id]" class="p-6 text-center">
                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
              <div v-else-if="detailsCache[a.id]" class="divide-y divide-border max-h-96 overflow-y-auto">
                <div v-for="(ans, idx) in detailsCache[a.id]" :key="ans.id" class="p-4">
                  <div class="flex items-start gap-3">
                    <span
                      :class="[
                        'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0',
                        ans.is_correct === true && 'bg-green-500/10 text-green-600',
                        ans.is_correct === false && 'bg-red-500/10 text-red-600',
                        ans.is_correct === null && 'bg-yellow-500/10 text-yellow-600',
                      ]"
                    >
                      {{ idx + 1 }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-foreground">{{ ans.question?.question_text }}</p>
                      <div class="flex items-center gap-2 text-xs mt-1">
                        <CheckCircle2 v-if="ans.is_correct === true" class="w-3.5 h-3.5 text-green-600" />
                        <XCircle v-else-if="ans.is_correct === false" class="w-3.5 h-3.5 text-red-600" />
                        <span class="text-muted-foreground">
                          {{ ans.is_correct === true ? 'To\'g\'ri' : ans.is_correct === false ? 'Noto\'g\'ri' : 'Javob berilmagan' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <!-- Analytics Tab -->
      <TabsContent value="analytics">
        <div class="space-y-4 mt-4">
          <!-- Test selector -->
          <div class="flex items-center gap-3">
            <label class="text-sm font-medium text-foreground whitespace-nowrap">Testni tanlang:</label>
            <select
              v-model.number="analyticsTestId"
              class="flex h-10 flex-1 max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option :value="null">— Tanlang —</option>
              <option v-for="t in uniqueTests" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <!-- Empty state -->
          <div v-if="!analyticsTestId" class="text-center py-16">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <BarChart3 class="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-semibold text-foreground">Testni tanlang</h3>
            <p class="text-sm text-muted-foreground mt-1">Savol tahlilini ko'rish uchun testni tanlang</p>
          </div>

          <!-- Loading -->
          <div v-else-if="analyticsLoading" class="flex items-center justify-center py-16">
            <Loader2 class="w-6 h-6 animate-spin text-primary" />
          </div>

          <!-- No data -->
          <div v-else-if="analytics.length === 0 && analyticsTestId" class="text-center py-16">
            <h3 class="text-lg font-semibold text-foreground">Ma'lumot yo'q</h3>
            <p class="text-sm text-muted-foreground mt-1">Bu test uchun hali natijalar mavjud emas</p>
          </div>

          <!-- Analytics table -->
          <div v-else class="overflow-x-auto rounded-xl border border-border">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/50">
                  <th class="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th class="text-left px-4 py-3 font-medium text-muted-foreground">Savol</th>
                  <th class="text-center px-4 py-3 font-medium text-muted-foreground">Javoblar</th>
                  <th class="text-center px-4 py-3 font-medium text-muted-foreground">To'g'ri %</th>
                  <th class="text-center px-4 py-3 font-medium text-muted-foreground">Noto'g'ri %</th>
                  <th class="text-left px-4 py-3 font-medium text-muted-foreground min-w-[120px]">Ko'rsatkich</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="(q, idx) in analytics" :key="q.question_id" class="hover:bg-muted/30">
                  <td class="px-4 py-3 text-muted-foreground">{{ idx + 1 }}</td>
                  <td class="px-4 py-3 text-foreground max-w-xs truncate">{{ q.question_text }}</td>
                  <td class="px-4 py-3 text-center text-foreground">{{ q.total_answered }}</td>
                  <td class="px-4 py-3 text-center">
                    <span :class="[q.correct_rate >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', 'font-medium']">
                      {{ q.correct_rate }}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-muted-foreground">{{ q.total_answered > 0 ? 100 - q.correct_rate : 0 }}%</td>
                  <td class="px-4 py-3">
                    <div class="w-full bg-muted rounded-full h-2">
                      <div
                        :class="[
                          'h-2 rounded-full transition-all',
                          q.correct_rate >= 80 ? 'bg-green-500' :
                          q.correct_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        ]"
                        :style="{ width: q.correct_rate + '%' }"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
