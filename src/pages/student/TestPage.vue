<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ShieldAlert,
  Eye,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useStudentTestStore } from '@/stores/student/test'
import { useTimer } from '@/composables/useTimer'
import { useTestSecurity } from '@/composables/useTestSecurity'
import { ANTI_CHEAT, ATTEMPT_STATUSES } from '@/lib/constants'

const router = useRouter()
const authStore = useAuthStore()
const testStore = useStudentTestStore()

const isLoading = ref(true)
const showFinishModal = ref(false)
const violationWarning = ref('')

// Initialize timer with 0 seconds (will be updated once test loads)
const timer = useTimer(0, () => {
  handleFinishTest(ATTEMPT_STATUSES.TIMED_OUT, 'time_expired')
})

// Initialize security
const security = useTestSecurity((count) => {
  if (count >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
    violationWarning.value = `Siz ${ANTI_CHEAT.MAX_TAB_SWITCHES} marta boshqa oynaga o'tdingiz. Test bekor qilindi!`
    handleFinishTest(ATTEMPT_STATUSES.VIOLATION, 'Maximum tab switches exceeded')
  } else {
    violationWarning.value = `Ogohlantirish! Boshqa oynaga o'tdingiz (${count}/${ANTI_CHEAT.MAX_TAB_SWITCHES})`
    setTimeout(() => { violationWarning.value = '' }, 5000)
    // Also update store violation count
    testStore.incrementViolation()
  }
})

// Computed from store
const currentQuestion = computed(() => testStore.currentQuestion)
const totalQuestions = computed(() => testStore.totalQuestions)
const answeredCount = computed(() => testStore.answeredCount)
const progress = computed(() => testStore.progress)
const currentIndex = computed(() => testStore.activeTest?.current_index ?? 0)
const selectedAnswers = computed(() => testStore.activeTest?.answers ?? {})
const isLastQuestion = computed(() => currentIndex.value === totalQuestions.value - 1)
const isFirstQuestion = computed(() => currentIndex.value === 0)

// Navigation
function goToQuestion(index: number) {
  testStore.goToQuestion(index)
}

function nextQuestion() {
  testStore.nextQuestion()
}

function previousQuestion() {
  testStore.prevQuestion()
}

// Answer selection
function selectAnswer(questionId: number, optionId: number) {
  testStore.selectAnswer(questionId, optionId)
}

// Finish test
async function handleFinishTest(status = ATTEMPT_STATUSES.COMPLETED, reason: string | null = null) {
  if (testStore.isFinishing) return
  showFinishModal.value = false
  timer.stop()
  security.deactivate()

  await testStore.finishTest(status, reason)
  router.push('/student/results')
}

// Update timer remaining in store periodically
watch(() => timer.timeRemaining.value, (val) => {
  if (testStore.activeTest) {
    testStore.activeTest.time_remaining_seconds = val
    testStore.saveToStorage()
  }
})

// Init
async function initTest() {
  isLoading.value = true

  // Try to recover from storage first
  testStore.loadFromStorage()

  if (testStore.isActive && testStore.activeTest) {
    // Resume existing test
    timer.timeRemaining.value = testStore.activeTest.time_remaining_seconds
    timer.start()
    security.activate()
    isLoading.value = false
    return
  }

  // Start new test
  const user = authStore.user
  if (!user || !user.user_group_id) {
    router.push('/student/dashboard')
    return
  }

  // We need the assignment info - fetch it
  try {
    const { fetchMyAssignments } = await import('@/api/student.api')
    const result = await fetchMyAssignments(user.id, user.user_group_id)

    if (!result.success || !result.data?.length) {
      router.push('/student/dashboard')
      return
    }

    const assignment = result.data[0]
    if (!assignment.test) {
      router.push('/student/dashboard')
      return
    }

    const startResult = await testStore.startTest(user.id, assignment.test_id, assignment.id)

    if (!startResult.success || !testStore.activeTest) {
      router.push('/student/dashboard')
      return
    }

    // Start timer and security
    timer.timeRemaining.value = testStore.activeTest.time_remaining_seconds
    timer.start()
    security.activate()
  } catch (err) {
    console.error('Test init error:', err)
    router.push('/student/dashboard')
  } finally {
    isLoading.value = false
  }
}

onMounted(initTest)
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center bg-background">
    <div class="text-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary mx-auto" />
      <p class="text-sm text-muted-foreground mt-3">Test yuklanmoqda...</p>
    </div>
  </div>

  <!-- Test Interface -->
  <div v-else class="min-h-screen bg-background">
    <!-- Violation Warning Banner -->
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-300"
      enter-from-class="opacity-0 -translate-y-full"
      leave-to-class="opacity-0 -translate-y-full"
    >
      <div
        v-if="violationWarning"
        class="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2"
      >
        <ShieldAlert class="w-4 h-4" />
        {{ violationWarning }}
      </div>
    </Transition>

    <!-- Top Bar -->
    <header class="sticky top-0 z-40 bg-card border-b border-border">
      <div class="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
        <!-- Question counter -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-foreground">
            Savol {{ currentIndex + 1 }} / {{ totalQuestions }}
          </span>
        </div>

        <!-- Timer -->
        <div
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
            timer.isCritical.value && 'bg-destructive/10 text-destructive animate-pulse',
            timer.isWarning.value && !timer.isCritical.value && 'bg-warning/10 text-warning',
            !timer.isWarning.value && 'bg-muted text-foreground',
          ]"
        >
          <Clock class="w-4 h-4" />
          {{ timer.formattedTime.value }}
        </div>

        <!-- Answered counter -->
        <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 class="w-4 h-4" />
          <span>{{ answeredCount }}/{{ totalQuestions }}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="h-1 bg-muted">
        <div
          class="h-full bg-primary transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <!-- Question Card -->
      <div v-if="currentQuestion" class="animate-fade-in">
        <div class="rounded-xl border border-border bg-card p-6">
          <!-- Question text -->
          <div class="mb-6">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium mb-3">
              {{ currentIndex + 1 }}-savol
            </span>
            <p class="text-lg font-medium text-foreground leading-relaxed">
              {{ currentQuestion.question_text }}
            </p>
          </div>

          <!-- Answer Options -->
          <div class="space-y-3">
            <button
              v-for="(option, idx) in currentQuestion.answer_options"
              :key="option.id"
              @click="selectAnswer(currentQuestion.id, option.id)"
              :class="[
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200',
                selectedAnswers[currentQuestion.id] === option.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/50'
              ]"
            >
              <!-- Option letter -->
              <span
                :class="[
                  'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold shrink-0 transition-colors',
                  selectedAnswers[currentQuestion.id] === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                ]"
              >
                {{ String.fromCharCode(65 + idx) }}
              </span>
              <span class="text-sm text-foreground">{{ option.option_text }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex items-center justify-between">
        <button
          @click="previousQuestion"
          :disabled="isFirstQuestion"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
          Oldingi
        </button>

        <button
          v-if="isLastQuestion"
          @click="showFinishModal = true"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors shadow-sm"
        >
          <Send class="w-4 h-4" />
          Yakunlash
        </button>
        <button
          v-else
          @click="nextQuestion"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Keyingi
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Question Grid Navigation -->
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
          <Eye class="w-3.5 h-3.5" />
          Savollar navigatsiyasi
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(q, idx) in (testStore.activeTest?.questions ?? [])"
            :key="q.id"
            @click="goToQuestion(idx)"
            :class="[
              'w-9 h-9 rounded-lg text-xs font-medium transition-all',
              idx === currentIndex && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            ]"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Finish Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showFinishModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showFinishModal = false"
        >
          <div class="w-full max-w-sm bg-card rounded-xl shadow-xl border border-border animate-scale-in p-6 text-center">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mx-auto mb-4">
              <CheckCircle2 class="w-6 h-6 text-success" />
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">Testni yakunlaysizmi?</h3>
            <p class="text-sm text-muted-foreground mb-1">
              Javob berilgan: <span class="font-medium text-foreground">{{ answeredCount }}</span> / {{ totalQuestions }}
            </p>
            <p v-if="answeredCount < totalQuestions" class="text-xs text-warning flex items-center justify-center gap-1 mb-4">
              <AlertTriangle class="w-3.5 h-3.5" />
              {{ totalQuestions - answeredCount }} ta savolga javob berilmagan
            </p>
            <div v-else class="mb-4" />
            <div class="flex gap-3">
              <button
                @click="showFinishModal = false"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Davom etish
              </button>
              <button
                @click="handleFinishTest()"
                :disabled="testStore.isFinishing"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="testStore.isFinishing" class="w-4 h-4 animate-spin mx-auto" />
                <span v-else>Yakunlash</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
