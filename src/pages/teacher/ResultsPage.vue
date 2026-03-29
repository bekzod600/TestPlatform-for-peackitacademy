<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-vue-next'
import { fetchAttempts } from '@/api/admin.api'
import { fetchAttemptDetails } from '@/api/student.api'
import { exportToExcel } from '@/composables/useExcel'
import { supabase } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { ExcelColumn } from '@/composables/useExcel'
import type { TestAttemptWithDetails, TestAnswerWithDetails } from '@/types'

const auth = useAuthStore()

const isLoading = ref(true)
const attempts = ref<TestAttemptWithDetails[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const expandedId = ref<number | null>(null)
const detailsCache = ref<Record<number, TestAnswerWithDetails[]>>({})
const detailLoading = ref<Record<number, boolean>>({})

async function loadResults() {
  isLoading.value = true
  try {
    // First, fetch the test IDs created by this teacher
    const { data: myTests } = await supabase
      .from('tests')
      .select('id')
      .eq('created_by', auth.user?.id)

    // If the teacher has no tests, show empty state
    if (!myTests || myTests.length === 0) {
      attempts.value = []
      return
    }

    const myTestIds = myTests.map((t: { id: number }) => t.id)

    // Fetch attempts filtered by the teacher's test IDs
    const result = await fetchAttempts({
      sort_by: 'created_at',
      sort_order: 'desc',
    })
    if (result.success && result.data) {
      // Filter attempts to only include those for the teacher's tests
      attempts.value = result.data.filter(a => myTestIds.includes(a.test_id))
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
  return result
})

// Stats
const stats = computed(() => {
  const finished = attempts.value.filter(a => ['completed', 'timed_out', 'violation'].includes(a.status))
  if (!finished.length) return null
  const avg = finished.reduce((s, a) => s + (a.percentage ?? 0), 0) / finished.length
  const best = Math.max(...finished.map(a => a.percentage ?? 0))
  return {
    total: finished.length,
    avg: Math.round(avg),
    best: Math.round(best),
    inProgress: attempts.value.filter(a => a.status === 'in_progress').length,
  }
})

// Excel export
async function exportResults() {
  const columns: ExcelColumn<TestAttemptWithDetails>[] = [
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
  await exportToExcel(filtered.value, columns, 'natijalar')
}

onMounted(loadResults)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-foreground">Natijalar</h2>
        <p class="text-sm text-muted-foreground">Barcha test natijalari</p>
      </div>
      <button
        @click="exportResults"
        :disabled="!filtered.length"
        class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <Download class="h-4 w-4" />
        Excel
      </button>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-2xl font-bold text-foreground">{{ stats.total }}</p>
        <p class="text-xs text-muted-foreground">Jami urinishlar</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-2xl font-bold text-foreground">{{ stats.avg }}%</p>
        <p class="text-xs text-muted-foreground">O'rtacha natija</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-2xl font-bold text-foreground">{{ stats.best }}%</p>
        <p class="text-xs text-muted-foreground">Eng yaxshi</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-2xl font-bold text-foreground">{{ stats.inProgress }}</p>
        <p class="text-xs text-muted-foreground">Davom etmoqda</p>
      </div>
    </div>

    <!-- Filters -->
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
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Results -->
    <div v-else class="space-y-3">
      <div v-if="!filtered.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <BarChart3 class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Natijalar yo'q</h3>
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
  </div>
</template>
