<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Flag,
  Search,
  Loader2,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  User,
  ClipboardList,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
} from 'lucide-vue-next'
import {
  fetchComplaints,
  fetchComplaintsByTeacher,
  updateComplaint,
  deleteComplaint,
  deleteQuestion,
} from '@/api/admin.api'
import type { ComplaintListFilters } from '@/api/admin.api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/ui/toast/useToast'
import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_LABELS,
  PAGINATION,
} from '@/lib/constants'
import type { ComplaintStatus } from '@/lib/constants'
import type { QuestionComplaintWithDetails } from '@/types'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const authStore = useAuthStore()

// Role detection
const isTeacherView = computed(() => route.path.startsWith('/teacher'))

// State
const isLoading = ref(true)
const complaints = ref<QuestionComplaintWithDetails[]>([])
const searchQuery = ref('')
const statusFilter = ref<string>('')
const currentPage = ref(1)
const pageSize = ref(PAGINATION.DEFAULT_PAGE_SIZE)
const totalCount = ref(0)
const totalPages = ref(0)

// Detail view
const selectedComplaint = ref<QuestionComplaintWithDetails | null>(null)
const showDetailModal = ref(false)
const adminNote = ref('')
const selectedStatus = ref<ComplaintStatus>(COMPLAINT_STATUSES.PENDING)
const isSaving = ref(false)

// Delete complaint
const showDeleteModal = ref(false)
const deletingComplaint = ref<QuestionComplaintWithDetails | null>(null)
const isDeleting = ref(false)

// Delete question
const showDeleteQuestionModal = ref(false)
const deletingQuestionId = ref<number | null>(null)
const isDeletingQuestion = ref(false)

// Computed
const statusOptions = computed(() => [
  { value: '', label: 'Barchasi' },
  { value: COMPLAINT_STATUSES.PENDING, label: COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.PENDING] },
  { value: COMPLAINT_STATUSES.REVIEWED, label: COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.REVIEWED] },
  { value: COMPLAINT_STATUSES.RESOLVED, label: COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.RESOLVED] },
  { value: COMPLAINT_STATUSES.REJECTED, label: COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.REJECTED] },
])

const pendingCount = computed(() =>
  complaints.value.filter(c => c.status === COMPLAINT_STATUSES.PENDING).length
)

// Functions
async function loadComplaints() {
  isLoading.value = true
  try {
    const filters: ComplaintListFilters = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (statusFilter.value) {
      filters.status = statusFilter.value
    }
    if (searchQuery.value.trim()) {
      filters.search = searchQuery.value.trim()
    }

    const result = isTeacherView.value && authStore.user?.id
      ? await fetchComplaintsByTeacher(authStore.user.id, filters)
      : await fetchComplaints(filters)
    if (result.success) {
      complaints.value = result.data
      totalCount.value = result.pagination.total_count
      totalPages.value = result.pagination.total_pages
    } else {
      toast({ title: 'Xatolik', description: result.error ?? 'Shikoyatlarni yuklashda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'Shikoyatlarni yuklashda xatolik', variant: 'destructive' })
  } finally {
    isLoading.value = false
  }
}

function openDetail(complaint: QuestionComplaintWithDetails) {
  selectedComplaint.value = complaint
  adminNote.value = complaint.admin_note ?? ''
  selectedStatus.value = complaint.status as ComplaintStatus
  showDetailModal.value = true
}

function confirmDelete(complaint: QuestionComplaintWithDetails) {
  deletingComplaint.value = complaint
  showDeleteModal.value = true
}

async function handleUpdateComplaint() {
  if (!selectedComplaint.value) return
  isSaving.value = true
  try {
    const result = await updateComplaint(
      selectedComplaint.value.id,
      {
        status: selectedStatus.value,
        admin_note: adminNote.value.trim() || null,
      },
      authStore.user?.id,
    )
    if (result.success) {
      toast({ title: 'Shikoyat yangilandi', variant: 'success' })
      showDetailModal.value = false
      await loadComplaints()
    } else {
      toast({ title: 'Xatolik', description: result.error ?? 'Yangilashda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'Yangilashda xatolik', variant: 'destructive' })
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingComplaint.value) return
  isDeleting.value = true
  try {
    const result = await deleteComplaint(deletingComplaint.value.id, authStore.user?.id)
    if (result.success) {
      toast({ title: 'Shikoyat o\'chirildi', variant: 'success' })
      showDeleteModal.value = false
      deletingComplaint.value = null
      await loadComplaints()
    } else {
      toast({ title: 'Xatolik', description: result.error ?? 'O\'chirishda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'O\'chirishda xatolik', variant: 'destructive' })
  } finally {
    isDeleting.value = false
  }
}

function navigateToQuestion(questionId: number) {
  showDetailModal.value = false
  const basePath = isTeacherView.value ? '/teacher/questions' : '/admin/questions'
  router.push({ path: basePath, query: { search: String(questionId) } })
}

function confirmDeleteQuestion(questionId: number) {
  deletingQuestionId.value = questionId
  showDeleteQuestionModal.value = true
}

async function handleDeleteQuestion() {
  if (!deletingQuestionId.value) return
  isDeletingQuestion.value = true
  try {
    const result = await deleteQuestion(deletingQuestionId.value, authStore.user?.id)
    if (result.success) {
      toast({ title: 'Savol o\'chirildi', variant: 'success' })
      showDeleteQuestionModal.value = false
      showDetailModal.value = false
      deletingQuestionId.value = null
      await loadComplaints()
    } else {
      toast({ title: 'Xatolik', description: result.error ?? 'Savolni o\'chirishda xatolik', variant: 'destructive' })
    }
  } catch {
    toast({ title: 'Xatolik', description: 'Savolni o\'chirishda xatolik', variant: 'destructive' })
  } finally {
    isDeletingQuestion.value = false
  }
}

function handleFilterChange() {
  currentPage.value = 1
  loadComplaints()
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadComplaints()
}

function getStatusClass(status: string): string {
  switch (status) {
    case COMPLAINT_STATUSES.PENDING:
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    case COMPLAINT_STATUSES.REVIEWED:
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    case COMPLAINT_STATUSES.RESOLVED:
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    case COMPLAINT_STATUSES.REJECTED:
      return 'bg-red-500/10 text-red-600 dark:text-red-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(loadComplaints)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Shikoyatlar</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Jami: {{ totalCount }} ta shikoyat
          <span v-if="pendingCount > 0" class="text-yellow-600 dark:text-yellow-400 font-medium">
            ({{ pendingCount }} ta kutilmoqda)
          </span>
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Shikoyat matni bo'yicha qidirish..."
          class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
          @input="handleFilterChange"
        />
      </div>
      <select
        v-model="statusFilter"
        @change="handleFilterChange"
        class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-24 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="complaints.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Flag class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">
        {{ searchQuery || statusFilter ? 'Natija topilmadi' : 'Shikoyatlar yo\'q' }}
      </h3>
      <p class="text-sm text-muted-foreground mt-1">
        {{ searchQuery || statusFilter ? 'Boshqa filter bilan qidiring' : 'Hali hech qanday shikoyat yuborilmagan' }}
      </p>
    </div>

    <!-- Complaints list -->
    <div v-else class="space-y-3">
      <div
        v-for="complaint in complaints"
        :key="complaint.id"
        class="rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
      >
        <div class="p-4 lg:p-5">
          <!-- Top row: Student + Status -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                {{ complaint.user?.full_name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground truncate">
                  {{ complaint.user?.full_name || 'Noma\'lum' }}
                </p>
                <p class="text-xs text-muted-foreground">
                  @{{ complaint.user?.username || '---' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span :class="['px-2.5 py-1 rounded-full text-[11px] font-medium', getStatusClass(complaint.status)]">
                {{ COMPLAINT_STATUS_LABELS[complaint.status as ComplaintStatus] || complaint.status }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ formatDate(complaint.created_at) }}
              </span>
            </div>
          </div>

          <!-- Test + Question info -->
          <div class="flex flex-wrap gap-3 mb-3 text-xs">
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <ClipboardList class="w-3.5 h-3.5" />
              <span class="font-medium text-foreground">{{ complaint.test?.name || 'Test #' + complaint.test_id }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <FileQuestion class="w-3.5 h-3.5" />
              <span>Savol #{{ complaint.question_id }}</span>
            </div>
          </div>

          <!-- Question text preview -->
          <div v-if="complaint.question" class="mb-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p class="text-sm text-foreground leading-relaxed">
              {{ complaint.question.question_text.length > 200 ? complaint.question.question_text.slice(0, 200) + '...' : complaint.question.question_text }}
            </p>
          </div>

          <!-- Complaint text -->
          <div class="mb-3">
            <p class="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare class="w-3.5 h-3.5" />
              Shikoyat matni:
            </p>
            <p class="text-sm text-foreground leading-relaxed">
              {{ complaint.complaint_text.length > 300 ? complaint.complaint_text.slice(0, 300) + '...' : complaint.complaint_text }}
            </p>
          </div>

          <!-- Admin note if exists -->
          <div v-if="complaint.admin_note" class="mb-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{{ isTeacherView ? 'Izoh:' : 'Admin izohi:' }}</p>
            <p class="text-sm text-foreground">{{ complaint.admin_note }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button
              @click="openDetail(complaint)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Eye class="w-3.5 h-3.5" />
              Ko'rish
            </button>
            <button
              @click="confirmDelete(complaint)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <XCircle class="w-3.5 h-3.5" />
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-2">
      <p class="text-sm text-muted-foreground">
        {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalCount) }}
        / {{ totalCount }}
      </p>
      <div class="flex items-center gap-1">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <template v-for="page in totalPages" :key="page">
          <button
            v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
            @click="goToPage(page)"
            :class="[
              'inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            ]"
          >
            {{ page }}
          </button>
          <span
            v-else-if="page === currentPage - 2 || page === currentPage + 2"
            class="px-1 text-muted-foreground"
          >...</span>
        </template>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Detail / Edit Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showDetailModal && selectedComplaint" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50" @click="showDetailModal = false" />
          <Transition
            enter-active-class="transition-transform duration-300"
            leave-active-class="transition-transform duration-300"
            enter-from-class="translate-x-full"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="showDetailModal"
              class="relative w-full max-w-lg bg-background border-l border-border shadow-xl flex flex-col"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h3 class="text-lg font-semibold text-foreground">Shikoyat tafsilotlari</h3>
                <button
                  @click="showDetailModal = false"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <!-- Student Info -->
                <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                    {{ selectedComplaint.user?.full_name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-foreground">{{ selectedComplaint.user?.full_name }}</p>
                    <p class="text-xs text-muted-foreground">@{{ selectedComplaint.user?.username }}</p>
                  </div>
                </div>

                <!-- Test Info -->
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ClipboardList class="w-3.5 h-3.5" />
                    Test
                  </label>
                  <p class="text-sm font-medium text-foreground">{{ selectedComplaint.test?.name || '---' }}</p>
                </div>

                <!-- Question Info -->
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileQuestion class="w-3.5 h-3.5" />
                    Savol (#{{ selectedComplaint.question_id }})
                  </label>
                  <div class="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p class="text-sm text-foreground leading-relaxed">
                      {{ selectedComplaint.question?.question_text || '---' }}
                    </p>
                    <!-- Answer options -->
                    <div v-if="selectedComplaint.question?.answer_options?.length" class="mt-3 space-y-1.5">
                      <p class="text-xs font-medium text-muted-foreground">Javob variantlari:</p>
                      <div
                        v-for="(opt, idx) in selectedComplaint.question.answer_options"
                        :key="opt.id"
                        :class="[
                          'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs',
                          opt.is_correct
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                            : 'text-foreground'
                        ]"
                      >
                        <span class="font-bold">{{ String.fromCharCode(65 + idx) }}.</span>
                        {{ opt.option_text }}
                        <CheckCircle2 v-if="opt.is_correct" class="w-3.5 h-3.5 ml-auto shrink-0" />
                      </div>
                    </div>
                  </div>
                  <!-- Question Actions -->
                  <div class="flex items-center gap-2 mt-2">
                    <button
                      @click="navigateToQuestion(selectedComplaint!.question_id)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                      Savolga o'tish
                    </button>
                    <button
                      @click="confirmDeleteQuestion(selectedComplaint!.question_id)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      Savolni o'chirish
                    </button>
                  </div>
                </div>

                <!-- Complaint Text -->
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MessageSquare class="w-3.5 h-3.5" />
                    Shikoyat matni
                  </label>
                  <div class="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ selectedComplaint.complaint_text }}</p>
                  </div>
                </div>

                <!-- Date -->
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" />
                    Yuborilgan sana
                  </label>
                  <p class="text-sm text-foreground">{{ formatDate(selectedComplaint.created_at) }}</p>
                </div>

                <hr class="border-border" />

                <!-- Admin Actions -->
                <div class="space-y-4">
                  <h4 class="text-sm font-semibold text-foreground">{{ isTeacherView ? 'Javob' : 'Admin javob' }}</h4>

                  <!-- Status -->
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground">Status</label>
                    <select
                      v-model="selectedStatus"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    >
                      <option :value="COMPLAINT_STATUSES.PENDING">{{ COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.PENDING] }}</option>
                      <option :value="COMPLAINT_STATUSES.REVIEWED">{{ COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.REVIEWED] }}</option>
                      <option :value="COMPLAINT_STATUSES.RESOLVED">{{ COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.RESOLVED] }}</option>
                      <option :value="COMPLAINT_STATUSES.REJECTED">{{ COMPLAINT_STATUS_LABELS[COMPLAINT_STATUSES.REJECTED] }}</option>
                    </select>
                  </div>

                  <!-- Admin Note -->
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground">{{ isTeacherView ? 'Izoh' : 'Admin izohi' }}</label>
                    <textarea
                      v-model="adminNote"
                      placeholder="Izoh yozing (ixtiyoriy)..."
                      rows="3"
                      class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-y transition-colors"
                    />
                  </div>

                  <!-- Reviewer info -->
                  <div v-if="selectedComplaint.reviewer" class="flex items-center gap-2 text-xs text-muted-foreground">
                    <User class="w-3.5 h-3.5" />
                    Ko'rib chiqqan: {{ selectedComplaint.reviewer.full_name }}
                    <span v-if="selectedComplaint.reviewed_at">
                      ({{ formatDate(selectedComplaint.reviewed_at) }})
                    </span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  @click="showDetailModal = false"
                  class="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="handleUpdateComplaint"
                  :disabled="isSaving"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                  Saqlash
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      :open="showDeleteModal"
      title="Shikoyatni o'chirish"
      description="Bu shikoyatni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi."
      confirm-label="O'chirish"
      variant="destructive"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
      @update:open="(v: boolean) => { if (!v) showDeleteModal = false }"
    />

    <ConfirmDialog
      :open="showDeleteQuestionModal"
      title="Savolni o'chirish"
      description="Bu savolni o'chirishni xohlaysizmi? Barcha javob variantlari va bog'liq shikoyatlar ham o'chiriladi. Bu amalni qaytarib bo'lmaydi."
      confirm-label="O'chirish"
      variant="destructive"
      :loading="isDeletingQuestion"
      @confirm="handleDeleteQuestion"
      @cancel="showDeleteQuestionModal = false"
      @update:open="(v: boolean) => { if (!v) showDeleteQuestionModal = false }"
    />
  </div>
</template>
