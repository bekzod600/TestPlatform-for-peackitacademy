<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileQuestion,
  ClipboardList,
  BarChart3,
  Users,
  UsersRound,
  TrendingUp,
  Trophy,
  Target,
  CalendarCheck,
} from 'lucide-vue-next'
import { supabase } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

const FINISHED = ['completed', 'timed_out', 'violation']

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(true)

interface AttemptRow {
  id: number
  percentage: number | null
  status: string
  started_at: string
  user_id: number
  test_id: number
  user: { full_name: string; user_group_id: number | null; user_group: { name: string } | null } | null
  test: { name: string; passing_score: number | null } | null
}

const groupsCount = ref(0)
const questionsCount = ref(0)
const myTestsCount = ref(0)
const activeTestsCount = ref(0)
const studentsTotal = ref(0)
const studentsActive = ref(0)

const attempts = ref<AttemptRow[]>([])

async function loadDashboard() {
  isLoading.value = true
  const userId = authStore.user?.id
  if (!userId) {
    isLoading.value = false
    return
  }

  try {
    // --- Phase 1: independent queries ---
    const [groupsRes, testsRes, qCountRes] = await Promise.all([
      supabase.from('user_groups').select('id').eq('teacher_id', userId),
      supabase.from('tests').select('id, is_active').eq('created_by', userId),
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('created_by', userId),
    ])

    const groupIds = (groupsRes.data ?? []).map((g: { id: number }) => g.id)
    const myTests = (testsRes.data ?? []) as { id: number; is_active: boolean }[]
    const myTestIds = myTests.map((t) => t.id)

    groupsCount.value = groupIds.length
    myTestsCount.value = myTests.length
    activeTestsCount.value = myTests.filter((t) => t.is_active).length
    questionsCount.value = qCountRes.count ?? 0

    // --- Phase 2: dependent queries ---
    const [studentsRes, attemptsRes] = await Promise.all([
      groupIds.length
        ? supabase
            .from('users')
            .select('id, is_active')
            .eq('role', 'student')
            .in('user_group_id', groupIds)
        : Promise.resolve({ data: [] as { id: number; is_active: boolean }[] }),
      myTestIds.length
        ? supabase
            .from('test_attempts')
            .select(
              'id, percentage, status, started_at, user_id, test_id, user:users(full_name, user_group_id, user_group:user_groups(name)), test:tests(name, passing_score)',
            )
            .in('test_id', myTestIds)
            .in('status', FINISHED)
            .order('started_at', { ascending: true })
            .limit(2000)
        : Promise.resolve({ data: [] as AttemptRow[] }),
    ])

    const studentRows = (studentsRes.data ?? []) as { id: number; is_active: boolean }[]
    studentsTotal.value = studentRows.length
    studentsActive.value = studentRows.filter((s) => s.is_active).length

    attempts.value = (attemptsRes.data ?? []) as unknown as AttemptRow[]
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    isLoading.value = false
  }
}

// ---------------------------------------------------------------
// Derived statistics
// ---------------------------------------------------------------

const finished = computed(() => attempts.value)

const avgScore = computed(() => {
  if (!finished.value.length) return 0
  const sum = finished.value.reduce((s, a) => s + Number(a.percentage ?? 0), 0)
  return Math.round(sum / finished.value.length)
})

const passRate = computed(() => {
  if (!finished.value.length) return 0
  const passed = finished.value.filter((a) => {
    const threshold = a.test?.passing_score ?? 60
    return Number(a.percentage ?? 0) >= threshold
  }).length
  return Math.round((passed / finished.value.length) * 100)
})

const violationCount = computed(() =>
  finished.value.filter((a) => a.status === 'violation').length,
)

// ----- KPI cards -----
const kpis = computed(() => [
  { key: 'groups', label: 'Guruhlar', value: groupsCount.value, icon: UsersRound, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', route: '/teacher/groups' },
  { key: 'students', label: "O'quvchilar", value: studentsTotal.value, sub: `${studentsActive.value} faol`, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', route: '/teacher/students' },
  { key: 'tests', label: 'Testlarim', value: myTestsCount.value, sub: `${activeTestsCount.value} faol`, icon: ClipboardList, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', route: '/teacher/tests' },
  { key: 'questions', label: 'Savollarim', value: questionsCount.value, icon: FileQuestion, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', route: '/teacher/questions' },
  { key: 'attempts', label: 'Urinishlar', value: finished.value.length, icon: BarChart3, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', route: '/teacher/results' },
  { key: 'avg', label: "O'rtacha natija", value: `${avgScore.value}%`, icon: Target, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', route: '/teacher/results' },
  { key: 'pass', label: "O'tish foizi", value: `${passRate.value}%`, icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', route: '/teacher/results' },
  { key: 'violation', label: 'Qoidabuzarlik', value: violationCount.value, icon: TrendingUp, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', route: '/teacher/results' },
])

// ----- Chart: Score distribution (Doughnut) -----
const scoreDistData = computed(() => {
  const buckets = [0, 0, 0, 0]
  for (const a of finished.value) {
    const pct = Number(a.percentage ?? 0)
    if (pct < 40) buckets[0]++
    else if (pct < 60) buckets[1]++
    else if (pct < 80) buckets[2]++
    else buckets[3]++
  }
  return {
    labels: ['0–39%', '40–59%', '60–79%', '80–100%'],
    datasets: [{
      data: buckets,
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
      ],
      borderWidth: 0,
    }],
  }
})

// ----- Chart: Per-group average (Bar) -----
const groupPerfData = computed(() => {
  const map = new Map<string, { sum: number; count: number }>()
  for (const a of finished.value) {
    const name = a.user?.user_group?.name ?? 'Guruhsiz'
    const pct = Number(a.percentage ?? 0)
    const e = map.get(name)
    if (e) { e.sum += pct; e.count++ }
    else map.set(name, { sum: pct, count: 1 })
  }
  const labels: string[] = []
  const data: number[] = []
  for (const [name, v] of map) {
    labels.push(name)
    data.push(Math.round(v.sum / v.count))
  }
  return {
    labels,
    datasets: [{
      label: "O'rtacha natija (%)",
      data,
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  }
})

// ----- Chart: Weekly trend (Line) -----
const weeklyTrendData = computed(() => {
  const now = new Date()
  const weeks: { label: string; start: Date; end: Date }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(now.getDate() - i * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, start, end })
  }
  const avgs = weeks.map((w) => {
    const wa = finished.value.filter((a) => {
      const d = new Date(a.started_at)
      return d >= w.start && d <= w.end
    })
    if (!wa.length) return 0
    return Math.round(wa.reduce((s, a) => s + Number(a.percentage ?? 0), 0) / wa.length)
  })
  return {
    labels: weeks.map((w) => w.label),
    datasets: [{
      label: "O'rtacha natija (%)",
      data: avgs,
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointRadius: 4,
    }],
  }
})

// ----- Top students -----
const topStudents = computed(() => {
  const map = new Map<number, { name: string; group: string; sum: number; count: number }>()
  for (const a of finished.value) {
    const e = map.get(a.user_id)
    const pct = Number(a.percentage ?? 0)
    if (e) { e.sum += pct; e.count++ }
    else map.set(a.user_id, {
      name: a.user?.full_name ?? 'Student',
      group: a.user?.user_group?.name ?? '—',
      sum: pct,
      count: 1,
    })
  }
  return Array.from(map.values())
    .map((s) => ({ ...s, avg: Math.round(s.sum / s.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
})

// ----- Recent attempts -----
const recentAttempts = computed(() =>
  [...finished.value]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 6),
)

// ----- Chart options -----
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const, labels: { padding: 16, usePointStyle: true } } },
}
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: string | number) => `${v}%` } } },
  plugins: { legend: { display: false } },
}
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: string | number) => `${v}%` } } },
  plugins: { legend: { display: false } },
}

function getScoreColor(pct: number) {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    completed: { label: 'Yakunlangan', class: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    timed_out: { label: 'Vaqt tugadi', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    violation: { label: 'Qoidabuzarlik', class: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  return map[status] || { label: status, class: 'bg-muted text-muted-foreground' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Xush kelibsiz, {{ authStore.user?.full_name }}!
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="h-24 bg-muted animate-pulse rounded-xl" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>

    <template v-else>
      <!-- KPI cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <button
          v-for="card in kpis"
          :key="card.key"
          @click="router.push(card.route)"
          class="rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors text-left"
        >
          <div class="flex items-center gap-3">
            <div :class="['flex items-center justify-center w-10 h-10 rounded-lg shrink-0', card.bg]">
              <component :is="card.icon" :class="['w-5 h-5', card.color]" />
            </div>
            <div class="min-w-0">
              <p class="text-2xl font-bold text-foreground leading-none">{{ card.value }}</p>
              <p class="text-xs text-muted-foreground mt-1 truncate">{{ card.label }}</p>
              <p v-if="card.sub" class="text-[10px] text-muted-foreground/80 truncate">{{ card.sub }}</p>
            </div>
          </div>
        </button>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-muted-foreground" />
            Natijalar taqsimoti
          </h3>
          <div class="h-56">
            <Doughnut v-if="finished.length" :data="scoreDistData" :options="doughnutOptions" />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <UsersRound class="w-4 h-4 text-muted-foreground" />
            Guruhlar bo'yicha natijalar
          </h3>
          <div class="h-56">
            <Bar v-if="groupPerfData.labels.length" :data="groupPerfData" :options="barOptions" />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-muted-foreground" />
            Haftalik trend
          </h3>
          <div class="h-56">
            <Line v-if="finished.length" :data="weeklyTrendData" :options="lineOptions" />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>
      </div>

      <!-- Lists row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top students -->
        <div class="rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold text-foreground flex items-center gap-2">
              <Trophy class="w-4 h-4 text-yellow-500" />
              Eng yaxshi o'quvchilar
            </h3>
            <button @click="router.push('/teacher/students')" class="text-sm text-primary hover:underline">
              Barchasi
            </button>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="(s, idx) in topStudents"
              :key="idx"
              class="flex items-center justify-between px-6 py-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  :class="[
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                    idx === 0 ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                      : idx === 1 ? 'bg-slate-400/15 text-slate-500 dark:text-slate-300'
                      : idx === 2 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground',
                  ]"
                >
                  {{ idx + 1 }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ s.name }}</p>
                  <p class="text-xs text-muted-foreground truncate">{{ s.group }} · {{ s.count }} urinish</p>
                </div>
              </div>
              <span :class="['text-sm font-bold shrink-0', getScoreColor(s.avg)]">{{ s.avg }}%</span>
            </div>
            <div v-if="!topStudents.length" class="px-6 py-8 text-center text-sm text-muted-foreground">
              Hozircha natijalar yo'q
            </div>
          </div>
        </div>

        <!-- Recent attempts -->
        <div class="rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold text-foreground">So'nggi natijalar</h3>
            <button @click="router.push('/teacher/results')" class="text-sm text-primary hover:underline">
              Barchasi
            </button>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="a in recentAttempts"
              :key="a.id"
              class="flex items-center justify-between px-6 py-3 gap-3"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground truncate">
                  {{ a.user?.full_name || 'Student' }}
                </p>
                <p class="text-xs text-muted-foreground truncate">
                  {{ a.test?.name || 'Test' }} · {{ formatDate(a.started_at) }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span :class="['text-sm font-bold', getScoreColor(Number(a.percentage ?? 0))]">
                  {{ Math.round(Number(a.percentage ?? 0)) }}%
                </span>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', getStatusBadge(a.status).class]">
                  {{ getStatusBadge(a.status).label }}
                </span>
              </div>
            </div>
            <div v-if="!recentAttempts.length" class="px-6 py-8 text-center text-sm text-muted-foreground">
              Hozircha natijalar yo'q
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
