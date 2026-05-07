<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
  ClipboardList,
  Flag,
  X,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useStudentTestStore } from '@/stores/student/test'
import { useTimer } from '@/composables/useTimer'
import { useTestSecurity } from '@/composables/useTestSecurity'
import { ANTI_CHEAT, ATTEMPT_STATUSES } from '@/lib/constants'
import type { AttemptStatus } from '@/lib/constants'
import { submitQuestionComplaint } from '@/api/student.api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const testStore = useStudentTestStore()

const isLoading = ref(true)
const showFinishModal = ref(false)

// Violation modal state
const showViolationModal = ref(false)
const violationMessage = ref('')
const isTestTerminated = ref(false)

// Complaint state
const showComplaintModal = ref(false)
const complaintText = ref('')
const isSubmittingComplaint = ref(false)
const complaintError = ref('')
const complaintSuccess = ref('')
/** Set of question IDs that already have complaints submitted in this session */
const complainedQuestionIds = ref<Set<number>>(new Set())
/** Total complaint count for this test (max 2) */
const totalComplaintCount = ref(0)

// Initialize timer with 0 seconds (will be updated once test loads)
const timer = useTimer(0, () => {
  handleFinishTest(ATTEMPT_STATUSES.TIMED_OUT, 'time_expired')
})

// Initialize security — only tab switches count toward the 3-strike termination
const security = useTestSecurity((type, tabCount) => {
  // Always update store violation count for any violation type
  testStore.incrementViolation()

  // Only tab/window switches trigger the modal warning and 3-strike rule
  if (type === 'tab_switch') {
    if (tabCount >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
      violationMessage.value = `Siz ${ANTI_CHEAT.MAX_TAB_SWITCHES} marta boshqa oynaga o'tdingiz. Test bekor qilindi!`
      isTestTerminated.value = true
      showViolationModal.value = true
      handleFinishTest(ATTEMPT_STATUSES.VIOLATION, 'Maximum tab switches exceeded')
    } else {
      violationMessage.value = `Ogohlantirish! Siz boshqa oynaga o'tdingiz (${tabCount}/${ANTI_CHEAT.MAX_TAB_SWITCHES}). Yana ${ANTI_CHEAT.MAX_TAB_SWITCHES - tabCount} marta qoldi.`
      isTestTerminated.value = false
      showViolationModal.value = true
    }
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
async function handleFinishTest(status: AttemptStatus = ATTEMPT_STATUSES.COMPLETED, reason: string | null = null) {
  if (testStore.isFinishing) return
  showFinishModal.value = false
  timer.stop()
  security.deactivate()

  try {
    await testStore.finishTest(status, reason)
  } catch (err) {
    console.error('Error finishing test:', err)
  }

  // Always clear test state and navigate to results, even if API failed.
  // clearTest() ensures isActive becomes false so the router guard won't block.
  testStore.clearTest()
  router.push('/student/results')
}

// Complaint functions
function openComplaintModal() {
  complaintText.value = ''
  complaintError.value = ''
  complaintSuccess.value = ''
  showComplaintModal.value = true
}

async function handleSubmitComplaint() {
  if (!currentQuestion.value || !testStore.activeTest || !authStore.user) return

  complaintError.value = ''
  complaintSuccess.value = ''
  isSubmittingComplaint.value = true

  try {
    const result = await submitQuestionComplaint({
      user_id: authStore.user.id,
      test_id: testStore.activeTest.test_id,
      question_id: currentQuestion.value.id,
      attempt_id: testStore.activeTest.attempt_id,
      complaint_text: complaintText.value,
    })

    if (result.success) {
      complaintSuccess.value = 'Shikoyat muvaffaqiyatli yuborildi'
      complainedQuestionIds.value.add(currentQuestion.value.id)
      totalComplaintCount.value++
      setTimeout(() => {
        showComplaintModal.value = false
        complaintSuccess.value = ''
      }, 1500)
    } else {
      complaintError.value = result.error ?? 'Shikoyat yuborishda xatolik'
    }
  } catch {
    complaintError.value = 'Shikoyat yuborishda xatolik yuz berdi'
  } finally {
    isSubmittingComplaint.value = false
  }
}

// Update timer remaining in store periodically
watch(() => timer.timeRemaining.value, (val) => {
  if (testStore.activeTest) {
    testStore.activeTest.time_remaining_seconds = val
    testStore.saveToStorage()
  }
})

// Prevent page refresh/close during test
function handleBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault()
  e.returnValue = '' // Chrome requires returnValue to be set
  return 'Test hali yakunlanmagan! Sahifadan chiqsangiz test bekor qilinadi.'
}

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

    // Add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    isLoading.value = false
    return
  }

  // Start new test
  const user = authStore.user
  if (!user || !user.user_group_id) {
    router.push('/student/dashboard')
    return
  }

  // Get assignmentId from route query
  const assignmentId = Number(route.query.assignmentId)
  if (!assignmentId) {
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

    const assignment = result.data.find(a => a.id === assignmentId)
    if (!assignment || !assignment.test) {
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

    // Add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload)
  } catch (err) {
    console.error('Test init error:', err)
    router.push('/student/dashboard')
  } finally {
    isLoading.value = false
  }
}

onMounted(initTest)

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="fixed inset-0 flex items-center justify-center bg-background z-50">
    <div class="text-center">
      <Loader2 class="w-10 h-10 animate-spin text-primary mx-auto" />
      <p class="text-sm text-muted-foreground mt-4">Test yuklanmoqda...</p>
    </div>
  </div>

  <!-- Test Interface -->
  <div v-else class="fixed inset-0 flex flex-col bg-background">
    <!-- Top Bar (Compact & Clean) -->
    <header class="flex-shrink-0 bg-card border-b border-border shadow-sm">
      <div class="max-w-5xl mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
        <!-- Test Title & Question Counter -->
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <ClipboardList class="w-5 h-5 text-primary" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">Test davom etmoqda</p>
            <p class="text-sm font-semibold text-foreground truncate">
              Savol {{ currentIndex + 1 }} / {{ totalQuestions }}
            </p>
          </div>
        </div>

        <!-- Timer (Center) -->
        <div
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-base font-mono font-bold',
            timer.isCritical.value && 'bg-destructive/10 text-destructive animate-pulse',
            timer.isWarning.value && !timer.isCritical.value && 'bg-warning/10 text-warning',
            !timer.isWarning.value && 'bg-muted text-foreground',
          ]"
        >
          <Clock class="w-5 h-5" />
          {{ timer.formattedTime.value }}
        </div>

        <!-- Answered Counter -->
        <div class="flex items-center gap-2 text-sm">
          <div class="hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 class="w-4 h-4" />
            <span class="font-medium">{{ answeredCount }}/{{ totalQuestions }}</span>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="h-1 bg-muted">
        <div
          class="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </header>

    <!-- Main Content (Scrollable) -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        <!-- Question Card -->
        <div v-if="currentQuestion" class="animate-fade-in">
          <div class="rounded-xl border border-border bg-card p-6 lg:p-8 shadow-sm">
            <!-- Question Header -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Savol {{ currentIndex + 1 }}
                </span>
                <button
                  @click="openComplaintModal"
                  :disabled="complainedQuestionIds.has(currentQuestion.id) || totalComplaintCount >= 2"
                  :class="[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    complainedQuestionIds.has(currentQuestion.id) || totalComplaintCount >= 2
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                  ]"
                  :title="totalComplaintCount >= 2 ? 'Shikoyat limiti tugadi (2/2)' : complainedQuestionIds.has(currentQuestion.id) ? 'Shikoyat yuborilgan' : 'Shikoyat bildirish'"
                >
                  <Flag class="w-3.5 h-3.5" />
                  {{ complainedQuestionIds.has(currentQuestion.id) ? 'Yuborilgan' : totalComplaintCount >= 2 ? 'Limit (2/2)' : 'Shikoyat' }}
                </button>
              </div>
              <!-- Question image (optional) -->
              <div v-if="currentQuestion.image_url" class="mb-4">
                <img
                  :src="currentQuestion.image_url"
                  alt="Savol rasmi"
                  class="max-h-64 w-auto rounded-xl border border-border object-contain mx-auto"
                />
              </div>
              <p class="text-lg lg:text-xl font-medium text-foreground leading-relaxed">
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
                  'w-full flex items-center gap-4 p-4 lg:p-5 rounded-xl border-2 text-left transition-all duration-200',
                  selectedAnswers[currentQuestion.id] === option.id
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm'
                ]"
              >
                <!-- Option letter -->
                <span
                  :class="[
                    'flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold shrink-0 transition-colors',
                    selectedAnswers[currentQuestion.id] === option.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  ]"
                >
                  {{ String.fromCharCode(65 + idx) }}
                </span>
                <span class="text-sm lg:text-base text-foreground flex-1">{{ option.option_text }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Question Grid Navigation -->
        <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p class="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Eye class="w-4 h-4" />
            Savollar navigatsiyasi
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(q, idx) in (testStore.activeTest?.questions ?? [])"
              :key="q.id"
              @click="goToQuestion(idx)"
              :class="[
                'w-10 h-10 rounded-lg text-sm font-medium transition-all',
                idx === currentIndex && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110',
                selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:scale-105',
              ]"
            >
              {{ idx + 1 }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation Bar (Sticky) -->
    <div class="flex-shrink-0 bg-card border-t border-border shadow-lg">
      <div class="max-w-5xl mx-auto flex items-center justify-between px-4 lg:px-6 py-4">
        <button
          @click="previousQuestion"
          :disabled="isFirstQuestion"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Oldingi</span>
        </button>

        <!-- Mobile answered count -->
        <div class="sm:hidden flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 class="w-4 h-4" />
          <span class="font-medium">{{ answeredCount }}/{{ totalQuestions }}</span>
        </div>

        <button
          v-if="isLastQuestion"
          @click="showFinishModal = true"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors shadow-md"
        >
          <Send class="w-4 h-4" />
          Yakunlash
        </button>
        <button
          v-else
          @click="nextQuestion"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
        >
          <span class="hidden sm:inline">Keyingi</span>
          <ChevronRight class="w-4 h-4" />
        </button>
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

    <!-- Violation Warning Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showViolationModal"
          class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div class="w-full max-w-sm bg-card rounded-xl shadow-xl border border-destructive/30 animate-scale-in p-6 text-center">
            <div class="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mx-auto mb-4">
              <ShieldAlert class="w-7 h-7 text-destructive" />
            </div>
            <h3 class="text-lg font-bold text-destructive mb-3">Xavfsizlik ogohlantirishlari</h3>
            <p class="text-sm text-foreground mb-6 leading-relaxed">
              {{ violationMessage }}
            </p>
            <button
              v-if="!isTestTerminated"
              @click="showViolationModal = false"
              class="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Tushundim, davom etaman
            </button>
            <p v-else class="text-xs text-muted-foreground">
              Test yakunlandi. Siz natijalar sahifasiga yo'naltirilmoqdasiz...
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Complaint Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showComplaintModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showComplaintModal = false"
        >
          <div class="w-full max-w-md bg-card rounded-xl shadow-xl border border-border animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <div class="flex items-center gap-2">
                <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10">
                  <Flag class="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 class="text-lg font-semibold text-foreground">Shikoyat bildirish</h3>
              </div>
              <button
                @click="showComplaintModal = false"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <div class="text-sm text-muted-foreground">
                <span class="font-medium text-foreground">Savol {{ currentIndex + 1 }}:</span>
                {{ currentQuestion?.question_text?.slice(0, 100) }}{{ (currentQuestion?.question_text?.length ?? 0) > 100 ? '...' : '' }}
              </div>

              <!-- Error -->
              <div
                v-if="complaintError"
                class="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <AlertTriangle class="w-4 h-4 shrink-0" />
                {{ complaintError }}
              </div>

              <!-- Success -->
              <div
                v-if="complaintSuccess"
                class="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm"
              >
                <CheckCircle2 class="w-4 h-4 shrink-0" />
                {{ complaintSuccess }}
              </div>

              <!-- Complaint text -->
              <div v-if="!complaintSuccess" class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">
                  Shikoyat matni <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="complaintText"
                  placeholder="Savolda qanday xatolik borligini batafsil yozing..."
                  rows="4"
                  maxlength="2000"
                  class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[100px] resize-y transition-colors"
                  :disabled="isSubmittingComplaint"
                />
                <p class="text-xs text-muted-foreground text-right">
                  {{ complaintText.length }} / 2000
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="!complaintSuccess" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showComplaintModal = false"
                class="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="handleSubmitComplaint"
                :disabled="isSubmittingComplaint || complaintText.trim().length < 10"
                class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <Loader2 v-if="isSubmittingComplaint" class="w-4 h-4 animate-spin" />
                <Send v-else class="w-4 h-4" />
                Yuborish
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
