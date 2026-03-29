<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Trophy,
  Target,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { fetchMyAttempts, fetchAttemptDetails } from '@/api/student.api'
import type { TestAttemptWithDetails, TestAnswerWithDetails } from '@/types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const authStore = useAuthStore()

const isLoading = ref(true)
const attempts = ref<TestAttemptWithDetails[]>([])
const expandedAttemptId = ref<number | null>(null)
const attemptDetailsCache = ref<Record<number, TestAnswerWithDetails[]>>({})
const detailLoading = ref<Record<number, boolean>>({})

// Stats
const stats = computed(() => {
  const finished = attempts.value.filter(a =>
    ['completed', 'timed_out', 'violation'].includes(a.status),
  )
  if (!finished.length) return null
  const total = finished.length
  const avgPercentage = finished.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / total
  const best = Math.max(...finished.map(a => a.percentage ?? 0))
  const totalCorrect = finished.reduce((sum, a) => sum + (a.correct_answers ?? 0), 0)
  return {
    total,
    avgPercentage: Math.round(avgPercentage),
    best: Math.round(best),
    totalCorrect,
  }
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

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m} min ${s} sek`
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    completed: 'Yakunlangan',
    timed_out: 'Vaqt tugadi',
    violation: 'Qoidabuzarlik',
    cancelled: 'Bekor qilingan',
  }
  return map[status] || status
}

function getStatusColor(status: string) {
  if (status === 'completed') return 'bg-green-500/10 text-green-600 dark:text-green-400'
  if (status === 'timed_out') return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
  return 'bg-red-500/10 text-red-600 dark:text-red-400'
}

async function toggleDetails(attemptIdVal: number) {
  if (expandedAttemptId.value === attemptIdVal) {
    expandedAttemptId.value = null
    return
  }

  expandedAttemptId.value = attemptIdVal

  // Load details if not cached
  if (!attemptDetailsCache.value[attemptIdVal]) {
    detailLoading.value = { ...detailLoading.value, [attemptIdVal]: true }
    try {
      const result = await fetchAttemptDetails(attemptIdVal)
      if (result.success && result.data) {
        attemptDetailsCache.value = {
          ...attemptDetailsCache.value,
          [attemptIdVal]: result.data.answers,
        }
      }
    } catch (err) {
      console.error('Error loading details:', err)
    } finally {
      detailLoading.value = { ...detailLoading.value, [attemptIdVal]: false }
    }
  }
}

// Score history chart
const scoreHistoryData = computed(() => {
  const sorted = [...attempts.value].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  )
  return {
    labels: sorted.map(a => new Date(a.started_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })),
    datasets: [{
      label: 'Natija (%)',
      data: sorted.map(a => Math.round(a.percentage ?? 0)),
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointRadius: 5,
    }],
  }
})

const scoreChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
  },
  plugins: { legend: { display: false } },
}

async function loadResults() {
  isLoading.value = true
  try {
    const user = authStore.user
    if (!user) return

    const result = await fetchMyAttempts(user.id)
    if (result.success && result.data) {
      attempts.value = result.data.filter(a =>
        ['completed', 'timed_out', 'violation'].includes(a.status),
      )
    }
  } catch (err) {
    console.error('Results load error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadResults)
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-24 bg-muted animate-pulse rounded-xl" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-20 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <div>
        <h2 class="text-xl font-bold text-foreground">Natijalar</h2>
        <p class="text-sm text-muted-foreground">Barcha test natijalari va statistikangiz</p>
      </div>

      <!-- Empty State -->
      <div v-if="!attempts.length" class="rounded-xl border border-border bg-card p-8 lg:p-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <ClipboardList class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Hali natijalar yo'q</h3>
        <p class="text-sm text-muted-foreground mt-1 mb-4">Birinchi testingizni topshiring!</p>
        <button
          @click="$router.push('/student/dashboard')"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          Testlarga o'tish
        </button>
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <ClipboardList class="w-4 h-4 text-primary" />
              </div>
              <div>
                <p class="text-xl font-bold text-foreground">{{ stats?.total }}</p>
                <p class="text-xs text-muted-foreground">Jami testlar</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-warning/10 shrink-0">
                <Target class="w-4 h-4 text-warning" />
              </div>
              <div>
                <p class="text-xl font-bold text-foreground">{{ stats?.avgPercentage }}%</p>
                <p class="text-xs text-muted-foreground">O'rtacha</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 shrink-0">
                <Trophy class="w-4 h-4 text-success" />
              </div>
              <div>
                <p class="text-xl font-bold text-foreground">{{ stats?.best }}%</p>
                <p class="text-xs text-muted-foreground">Eng yaxshi</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/10 shrink-0">
                <CheckCircle2 class="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p class="text-xl font-bold text-foreground">{{ stats?.totalCorrect }}</p>
                <p class="text-xs text-muted-foreground">To'g'ri javoblar</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Score History Chart -->
        <div v-if="attempts.length >= 2" class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-muted-foreground" />
            Natijalar tarixi
          </h3>
          <div class="h-48">
            <Line :data="scoreHistoryData" :options="scoreChartOptions" />
          </div>
        </div>

        <!-- Results List -->
        <div class="space-y-3">
          <div
            v-for="attempt in attempts"
            :key="attempt.id"
            class="rounded-xl border border-border bg-card overflow-hidden"
          >
            <!-- Result Header (clickable) -->
            <button
              @click="toggleDetails(attempt.id)"
              class="w-full flex items-center justify-between p-4 lg:p-5 hover:bg-muted/50 transition-colors text-left"
            >
              <div class="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
                <!-- Score circle -->
                <div
                  :class="[
                    'flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full text-sm lg:text-base font-bold shrink-0',
                    getScoreBg(attempt.percentage ?? 0),
                    getScoreColor(attempt.percentage ?? 0),
                  ]"
                >
                  {{ Math.round(attempt.percentage ?? 0) }}%
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm lg:text-base font-medium text-foreground truncate">
                    {{ attempt.test?.name || 'Test' }}
                  </p>
                  <div class="flex flex-wrap items-center gap-2 lg:gap-3 text-xs text-muted-foreground mt-1">
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {{ new Date(attempt.started_at).toLocaleDateString('uz-UZ') }}
                    </span>
                    <span class="hidden sm:inline">{{ attempt.correct_answers }}/{{ attempt.total_questions }} to'g'ri</span>
                    <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', getStatusColor(attempt.status)]">
                      {{ getStatusLabel(attempt.status) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3 shrink-0 ml-2">
                <span class="sm:hidden text-xs text-muted-foreground">{{ attempt.correct_answers }}/{{ attempt.total_questions }}</span>
                <ChevronDown
                  v-if="expandedAttemptId !== attempt.id"
                  class="w-4 h-4 text-muted-foreground"
                />
                <ChevronUp v-else class="w-4 h-4 text-muted-foreground" />
              </div>
            </button>

            <!-- Expanded Details -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-200 ease-in"
              enter-from-class="opacity-0 max-h-0"
              leave-to-class="opacity-0 max-h-0"
            >
              <div v-if="expandedAttemptId === attempt.id" class="border-t border-border">
                <!-- Quick stats -->
                <div class="grid grid-cols-3 gap-px bg-border">
                  <div class="bg-card p-3 text-center">
                    <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ attempt.correct_answers }}</p>
                    <p class="text-[10px] text-muted-foreground">To'g'ri</p>
                  </div>
                  <div class="bg-card p-3 text-center">
                    <p class="text-lg font-bold text-red-600 dark:text-red-400">{{ attempt.wrong_answers }}</p>
                    <p class="text-[10px] text-muted-foreground">Noto'g'ri</p>
                  </div>
                  <div class="bg-card p-3 text-center">
                    <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">{{ attempt.skipped_answers }}</p>
                    <p class="text-[10px] text-muted-foreground">O'tkazilgan</p>
                  </div>
                </div>

                <!-- Time info -->
                <div class="px-4 py-3 text-xs text-muted-foreground flex items-center gap-4 border-b border-border">
                  <span>Sarflangan vaqt: {{ formatDuration(attempt.time_spent_seconds ?? 0) }}</span>
                  <span v-if="attempt.violation_count">Ogohlantirish: {{ attempt.violation_count }}</span>
                </div>

                <!-- Detailed answers -->
                <div v-if="detailLoading[attempt.id]" class="p-6 text-center">
                  <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
                <div v-else-if="attemptDetailsCache[attempt.id]" class="divide-y divide-border max-h-96 overflow-y-auto">
                  <div
                    v-for="(answer, idx) in attemptDetailsCache[attempt.id]"
                    :key="answer.id"
                    class="p-4"
                  >
                    <div class="flex items-start gap-3">
                      <span
                        :class="[
                          'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 mt-0.5',
                          answer.is_correct === true && 'bg-green-500/10 text-green-600',
                          answer.is_correct === false && 'bg-red-500/10 text-red-600',
                          answer.is_correct === null && 'bg-yellow-500/10 text-yellow-600',
                        ]"
                      >
                        {{ idx + 1 }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm text-foreground mb-2">
                          {{ answer.question?.question_text }}
                        </p>
                        <div class="flex items-center gap-2 text-xs">
                          <CheckCircle2 v-if="answer.is_correct === true" class="w-3.5 h-3.5 text-green-600" />
                          <XCircle v-else-if="answer.is_correct === false" class="w-3.5 h-3.5 text-red-600" />
                          <MinusCircle v-else class="w-3.5 h-3.5 text-yellow-600" />
                          <span class="text-muted-foreground">
                            {{ answer.is_correct === true ? 'To\'g\'ri' : answer.is_correct === false ? 'Noto\'g\'ri' : 'Javob berilmagan' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
