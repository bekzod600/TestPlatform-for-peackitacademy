<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileQuestion, ClipboardList, BarChart3, Users } from 'lucide-vue-next'
import { supabase } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isLoading = ref(true)

const stats = ref({
  myQuestions: 0,
  myTests: 0,
  totalAttempts: 0,
  groupStudents: 0,
})

const recentAttempts = ref<Record<string, unknown>[]>([])

async function loadDashboard() {
  isLoading.value = true
  const userId = authStore.user?.id
  if (!userId) return

  try {
    const [
      { count: questionsCount },
      { count: testsCount },
      { count: attemptsCount },
      { data: attempts },
    ] = await Promise.all([
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('tests').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts')
        .select('*, test:tests(name), user:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    stats.value = {
      myQuestions: questionsCount ?? 0,
      myTests: testsCount ?? 0,
      totalAttempts: attemptsCount ?? 0,
      groupStudents: 0,
    }

    recentAttempts.value = (attempts ?? []) as Record<string, unknown>[]
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    isLoading.value = false
  }
}

function getScoreColor(pct: number) {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
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
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="rounded-xl border border-border bg-card p-6">
        <div class="h-4 w-24 animate-pulse rounded bg-muted mb-3" />
        <div class="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>

    <!-- Stats cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 shrink-0">
          <FileQuestion class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p class="text-sm text-muted-foreground">Mening savollarim</p>
          <p class="text-2xl font-bold text-foreground mt-1">{{ stats.myQuestions }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 shrink-0">
          <ClipboardList class="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p class="text-sm text-muted-foreground">Mening testlarim</p>
          <p class="text-2xl font-bold text-foreground mt-1">{{ stats.myTests }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 shrink-0">
          <BarChart3 class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p class="text-sm text-muted-foreground">Jami urinishlar</p>
          <p class="text-2xl font-bold text-foreground mt-1">{{ stats.totalAttempts }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 shrink-0">
          <Users class="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <p class="text-sm text-muted-foreground">Guruh studentlari</p>
          <p class="text-2xl font-bold text-foreground mt-1">{{ stats.groupStudents }}</p>
        </div>
      </div>
    </div>

    <!-- Recent attempts -->
    <div class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="px-6 py-4 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground">So'nggi natijalar</h2>
      </div>

      <div v-if="isLoading" class="divide-y divide-border">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-32 animate-pulse rounded bg-muted" />
          <div class="h-4 w-24 animate-pulse rounded bg-muted" />
          <div class="h-4 w-16 animate-pulse rounded bg-muted ml-auto" />
        </div>
      </div>

      <div v-else-if="recentAttempts.length === 0" class="px-6 py-12 text-center">
        <p class="text-sm text-muted-foreground">Hozircha natijalar yo'q</p>
      </div>

      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Student</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Test</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Natija</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Sana</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="attempt in recentAttempts" :key="(attempt as any).id" class="hover:bg-muted/30 transition-colors">
            <td class="whitespace-nowrap px-6 py-3 text-sm text-foreground">
              {{ (attempt.user as any)?.full_name ?? '—' }}
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">
              {{ (attempt.test as any)?.name ?? '—' }}
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-sm font-medium" :class="getScoreColor((attempt as any).score_percentage ?? 0)">
              {{ (attempt as any).score_percentage?.toFixed(0) ?? '—' }}%
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">
              {{ new Date((attempt as any).created_at).toLocaleDateString('uz-UZ') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
