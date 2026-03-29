<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  BarChart3,
  Trophy,
  BookOpen,
  Timer,
  ChevronRight,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { fetchMyAssignments, fetchMyAttempts } from '@/api/student.api'
import { supabase } from '@/api/client'
import type {
  TestAssignmentWithDetails,
  TestAttemptWithDetails,
  UserGroup,
} from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(true)
const showRulesModal = ref(false)
const userGroup = ref<UserGroup | null>(null)
const assignment = ref<TestAssignmentWithDetails | null>(null)
const completedAttempts = ref<TestAttemptWithDetails[]>([])

const testInfo = computed(() => assignment.value?.test ?? null)

const testAvailability = computed(() => {
  if (!assignment.value) {
    return { available: false, reason: 'Test tayinlanmagan', status: 'none' }
  }

  const now = new Date()
  const startTime = new Date(assignment.value.start_time)
  const endTime = new Date(assignment.value.end_time)

  if (now < startTime) {
    return {
      available: false,
      reason: `Test ${startTime.toLocaleDateString('uz-UZ')} ${startTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} da boshlanadi`,
      status: 'upcoming',
      startTime,
    }
  }

  if (now > endTime) {
    return { available: false, reason: 'Test vaqti tugadi', status: 'expired' }
  }

  return { available: true, reason: 'Test topshirishga tayyor', status: 'active' }
})

const stats = computed(() => {
  if (!completedAttempts.value.length) return null
  const total = completedAttempts.value.length
  const avgPercentage = completedAttempts.value.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / total
  const best = Math.max(...completedAttempts.value.map(a => Number(a.percentage) || 0))
  return { total, avgPercentage: Math.round(avgPercentage), best: Math.round(best) }
})

async function loadDashboard() {
  isLoading.value = true
  try {
    const user = authStore.user
    if (!user) return

    // Load assignments
    const assignmentResult = await fetchMyAssignments(user.id, user.user_group_id)
    if (assignmentResult.success && assignmentResult.data?.length) {
      assignment.value = assignmentResult.data[0]

      // Derive user group from assignment if available
      if (assignment.value.user_group) {
        userGroup.value = assignment.value.user_group
      }
    }

    // Load completed attempts
    const attemptsResult = await fetchMyAttempts(user.id)
    if (attemptsResult.success && attemptsResult.data) {
      completedAttempts.value = attemptsResult.data.filter(
        a => ['completed', 'timed_out', 'violation'].includes(a.status)
      )
    }

    // Load user group directly if not already set from assignment
    if (!userGroup.value && user.user_group_id) {
      const { data: group } = await supabase
        .from('user_groups')
        .select('*')
        .eq('id', user.user_group_id)
        .single()
      userGroup.value = group as UserGroup | null
    }
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    isLoading.value = false
  }
}

function startTest() {
  showRulesModal.value = true
}

function confirmStartTest() {
  showRulesModal.value = false
  router.push('/student/test')
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6">
      <div class="h-32 bg-muted animate-pulse rounded-xl" />
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-24 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>

    <template v-else>
      <!-- Welcome Card -->
      <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border p-6">
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-2">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-lg font-bold">
              {{ authStore.user?.full_name?.charAt(0)?.toUpperCase() || 'S' }}
            </div>
            <div>
              <h2 class="text-xl font-bold text-foreground">
                Salom, {{ authStore.user?.full_name || 'Student' }}!
              </h2>
              <p class="text-sm text-muted-foreground flex items-center gap-1">
                <BookOpen class="w-3.5 h-3.5" />
                {{ userGroup?.name || 'Guruh tayinlanmagan' }}
              </p>
            </div>
          </div>
        </div>
        <!-- Decorative -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
      </div>

      <!-- Test Status Card -->
      <div class="rounded-xl border border-border bg-card p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-foreground mb-1">
              {{ testInfo ? testInfo.name : 'Test' }}
            </h3>
            <div class="flex items-center gap-2 mb-4">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  testAvailability.status === 'active' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                  testAvailability.status === 'upcoming' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                  testAvailability.status === 'expired' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                  testAvailability.status === 'none' && 'bg-muted text-muted-foreground',
                ]"
              >
                <CheckCircle2 v-if="testAvailability.status === 'active'" class="w-3.5 h-3.5" />
                <Clock v-else-if="testAvailability.status === 'upcoming'" class="w-3.5 h-3.5" />
                <AlertCircle v-else class="w-3.5 h-3.5" />
                {{ testAvailability.reason }}
              </span>
            </div>

            <!-- Test details -->
            <div v-if="testInfo" class="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Timer class="w-4 h-4" />
                {{ testInfo.duration_minutes }} daqiqa
              </span>
              <span class="flex items-center gap-1">
                <ClipboardList class="w-4 h-4" />
                {{ testInfo.max_questions }} ta savol
              </span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-2 shrink-0">
            <button
              v-if="testAvailability.available"
              @click="startTest"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm"
            >
              <PlayCircle class="w-4 h-4" />
              Boshlash
            </button>
            <button
              @click="router.push('/student/results')"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-colors"
            >
              <BarChart3 class="w-4 h-4" />
              Natijalar
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div v-if="stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ClipboardList class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ stats.total }}</p>
            <p class="text-xs text-muted-foreground">Jami testlar</p>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
            <BarChart3 class="w-5 h-5 text-warning" />
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ stats.avgPercentage }}%</p>
            <p class="text-xs text-muted-foreground">O'rtacha natija</p>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
            <Trophy class="w-5 h-5 text-success" />
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ stats.best }}%</p>
            <p class="text-xs text-muted-foreground">Eng yaxshi natija</p>
          </div>
        </div>
      </div>

      <!-- Recent Results -->
      <div v-if="completedAttempts.length" class="rounded-xl border border-border bg-card">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 class="font-semibold text-foreground">So'nggi natijalar</h3>
          <button
            @click="router.push('/student/results')"
            class="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Barchasi <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="attempt in completedAttempts.slice(0, 3)"
            :key="attempt.id"
            class="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                :class="[
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold',
                  Number(attempt.percentage) >= 80 && 'bg-green-500/10 text-green-600',
                  Number(attempt.percentage) >= 60 && Number(attempt.percentage) < 80 && 'bg-yellow-500/10 text-yellow-600',
                  Number(attempt.percentage) < 60 && 'bg-red-500/10 text-red-600',
                ]"
              >
                {{ Math.round(Number(attempt.percentage)) }}%
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground truncate">
                  {{ attempt.test?.name || 'Test' }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ new Date(attempt.started_at).toLocaleDateString('uz-UZ') }}
                </p>
              </div>
            </div>
            <span class="text-sm text-muted-foreground">
              {{ attempt.correct_answers }}/{{ attempt.total_questions }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Rules Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRulesModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showRulesModal = false"
        >
          <div class="w-full max-w-lg bg-card rounded-xl shadow-xl border border-border animate-scale-in overflow-hidden">
            <!-- Header -->
            <div class="bg-primary/5 border-b border-border px-6 py-4">
              <h3 class="text-lg font-semibold text-foreground">Test qoidalari</h3>
              <p class="text-sm text-muted-foreground mt-1">
                Testni boshlashdan oldin quyidagi qoidalarni o'qing
              </p>
            </div>

            <!-- Rules -->
            <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div class="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
                <AlertCircle class="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div class="text-sm">
                  <p class="font-medium text-foreground">Diqqat!</p>
                  <p class="text-muted-foreground">Test boshlangandan keyin uni to'xtatib bo'lmaydi. Vaqt tugaganda test avtomatik yakunlanadi.</p>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</div>
                  <p class="text-sm text-muted-foreground">Boshqa sahifa yoki ilovaga o'tish mumkin emas (3 martadan keyin test bekor qilinadi)</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</div>
                  <p class="text-sm text-muted-foreground">Matnlarni nusxalash, qo'yish va tanlash taqiqlanadi</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</div>
                  <p class="text-sm text-muted-foreground">Test davomida tayyorlangan savollar aralashtiriladi</p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showRulesModal = false"
                class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="confirmStartTest"
                class="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm"
              >
                Boshlash
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
