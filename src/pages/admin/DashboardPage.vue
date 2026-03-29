<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Users,
  FileQuestion,
  UsersRound,
  ClipboardList,
  BarChart3,
  CalendarCheck,
  TrendingUp,
} from 'lucide-vue-next'
import { supabase } from '@/api/client'
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

// Register Chart.js components
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

const router = useRouter()
const isLoading = ref(true)

const stats = ref({
  users: 0,
  questions: 0,
  groups: 0,
  tests: 0,
  assignments: 0,
  attempts: 0,
})

const recentUsers = ref<Record<string, unknown>[]>([])
const recentAttempts = ref<Record<string, unknown>[]>([])

// Chart data
const allAttempts = ref<Record<string, unknown>[]>([])

async function loadDashboard() {
  isLoading.value = true
  try {
    const [
      { count: usersCount },
      { count: questionsCount },
      { count: groupsCount },
      { count: testsCount },
      { count: assignmentsCount },
      { count: attemptsCount },
      { data: users },
      { data: attempts },
      { data: chartAttempts },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('user_groups').select('*', { count: 'exact', head: true }),
      supabase.from('tests').select('*', { count: 'exact', head: true }),
      supabase.from('test_assignments').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('id, full_name, username, role, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('test_attempts').select('*, test:tests(name), user:users(full_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('test_attempts')
        .select('id, percentage, status, started_at, user_id, user:users(full_name, user_group_id, user_group:user_groups(name))')
        .in('status', ['completed', 'timed_out', 'violation'])
        .order('started_at', { ascending: true })
        .limit(500),
    ])

    stats.value = {
      users: usersCount ?? 0,
      questions: questionsCount ?? 0,
      groups: groupsCount ?? 0,
      tests: testsCount ?? 0,
      assignments: assignmentsCount ?? 0,
      attempts: attemptsCount ?? 0,
    }

    recentUsers.value = users ?? []
    recentAttempts.value = attempts ?? []
    allAttempts.value = chartAttempts ?? []
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    isLoading.value = false
  }
}

// ----- Chart: Score distribution (Doughnut) -----
const scoreDistData = computed(() => {
  const buckets = [0, 0, 0, 0]
  for (const a of allAttempts.value) {
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

// ----- Chart: Group performance (Bar) -----
const groupPerfData = computed(() => {
  const groupMap = new Map<string, { sum: number; count: number }>()

  for (const a of allAttempts.value) {
    const user = a.user as Record<string, unknown> | null
    if (!user) continue
    const group = user.user_group as Record<string, unknown> | null
    const groupName = (group?.name as string) ?? 'Guruhsiz'
    const pct = Number(a.percentage ?? 0)

    const existing = groupMap.get(groupName)
    if (existing) {
      existing.sum += pct
      existing.count++
    } else {
      groupMap.set(groupName, { sum: pct, count: 1 })
    }
  }

  const labels: string[] = []
  const data: number[] = []
  for (const [name, val] of groupMap) {
    labels.push(name)
    data.push(Math.round(val.sum / val.count))
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
    const label = `${start.getDate()}/${start.getMonth() + 1}`
    weeks.push({ label, start, end })
  }

  const weeklyAvgs = weeks.map((w) => {
    const weekAttempts = allAttempts.value.filter((a) => {
      const d = new Date(a.started_at as string)
      return d >= w.start && d <= w.end
    })
    if (weekAttempts.length === 0) return 0
    const sum = weekAttempts.reduce((s, a) => s + Number(a.percentage ?? 0), 0)
    return Math.round(sum / weekAttempts.length)
  })

  return {
    labels: weeks.map((w) => w.label),
    datasets: [{
      label: "O'rtacha natija (%)",
      data: weeklyAvgs,
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointRadius: 4,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { padding: 16, usePointStyle: true } },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
  },
  plugins: { legend: { display: false } },
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
  },
  plugins: { legend: { display: false } },
}

const statCards = [
  { key: 'users', label: 'Foydalanuvchilar', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', route: '/admin/users' },
  { key: 'questions', label: 'Savollar', icon: FileQuestion, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', route: '/admin/questions' },
  { key: 'groups', label: 'Guruhlar', icon: UsersRound, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', route: '/admin/user-groups' },
  { key: 'tests', label: 'Testlar', icon: ClipboardList, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', route: '/admin/tests' },
  { key: 'assignments', label: 'Tayinlashlar', icon: CalendarCheck, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', route: '/admin/assignments' },
  { key: 'attempts', label: 'Test urinishlari', icon: BarChart3, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', route: '/admin/results' },
]

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    super_admin: 'bg-red-500/10 text-red-600 dark:text-red-400',
    admin: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    teacher: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    student: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }
  return map[role] || 'bg-muted text-muted-foreground'
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
    in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    timed_out: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    violation: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }
  return map[status] || 'bg-muted text-muted-foreground'
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="h-24 bg-muted animate-pulse rounded-xl" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="card in statCards"
          :key="card.key"
          @click="router.push(card.route)"
          class="rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors text-left"
        >
          <div class="flex items-center gap-3">
            <div :class="['flex items-center justify-center w-10 h-10 rounded-lg shrink-0', card.bg]">
              <component :is="card.icon" :class="['w-5 h-5', card.color]" />
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">{{ stats[card.key as keyof typeof stats] }}</p>
              <p class="text-xs text-muted-foreground">{{ card.label }}</p>
            </div>
          </div>
        </button>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Score Distribution (Doughnut) -->
        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-muted-foreground" />
            Natijalar taqsimoti
          </h3>
          <div class="h-56">
            <Doughnut
              v-if="allAttempts.length"
              :data="scoreDistData"
              :options="doughnutOptions"
            />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>

        <!-- Group Performance (Bar) -->
        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <UsersRound class="w-4 h-4 text-muted-foreground" />
            Guruhlar bo'yicha natijalar
          </h3>
          <div class="h-56">
            <Bar
              v-if="groupPerfData.labels.length"
              :data="groupPerfData"
              :options="barOptions"
            />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>

        <!-- Weekly Trend (Line) -->
        <div class="rounded-xl border border-border bg-card p-5">
          <h3 class="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-muted-foreground" />
            Haftalik trend
          </h3>
          <div class="h-56">
            <Line
              v-if="allAttempts.length"
              :data="weeklyTrendData"
              :options="lineOptions"
            />
            <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Users -->
        <div class="rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold text-foreground">So'nggi foydalanuvchilar</h3>
            <button
              @click="router.push('/admin/users')"
              class="text-sm text-primary hover:underline"
            >
              Barchasi
            </button>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="user in recentUsers"
              :key="(user.id as number)"
              class="flex items-center justify-between px-6 py-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                  {{ (user.full_name as string)?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ user.full_name }}</p>
                  <p class="text-xs text-muted-foreground">@{{ user.username }}</p>
                </div>
              </div>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', getRoleBadge(user.role as string)]">
                {{ user.role }}
              </span>
            </div>
            <div v-if="!recentUsers.length" class="px-6 py-8 text-center text-sm text-muted-foreground">
              Foydalanuvchilar yo'q
            </div>
          </div>
        </div>

        <!-- Recent Test Attempts -->
        <div class="rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold text-foreground">So'nggi test urinishlari</h3>
            <button
              @click="router.push('/admin/results')"
              class="text-sm text-primary hover:underline"
            >
              Barchasi
            </button>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="attempt in recentAttempts"
              :key="(attempt.id as number)"
              class="flex items-center justify-between px-6 py-3"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground truncate">
                  {{ (attempt.user as Record<string, unknown>)?.full_name || 'Student' }}
                </p>
                <p class="text-xs text-muted-foreground truncate">
                  {{ (attempt.test as Record<string, unknown>)?.name || 'Test' }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="attempt.percentage !== null" class="text-sm font-bold text-foreground">
                  {{ Math.round(Number(attempt.percentage)) }}%
                </span>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', getStatusBadge(attempt.status as string)]">
                  {{ attempt.status }}
                </span>
              </div>
            </div>
            <div v-if="!recentAttempts.length" class="px-6 py-8 text-center text-sm text-muted-foreground">
              Test urinishlari yo'q
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
