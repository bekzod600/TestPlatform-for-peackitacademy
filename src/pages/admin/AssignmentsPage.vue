<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CalendarCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  Clock,
} from 'lucide-vue-next'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  fetchTests,
  fetchUserGroups,
} from '@/api/admin.api'
import type {
  TestAssignmentWithDetails,
  TestAssignmentInsert,
  Test,
  UserGroup,
} from '@/types'

const isLoading = ref(true)
const assignments = ref<TestAssignmentWithDetails[]>([])
const tests = ref<Test[]>([])
const groups = ref<UserGroup[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const deletingId = ref<number | null>(null)
const isDeleting = ref(false)

const form = ref({
  test_id: 0,
  user_group_id: 0,
  start_time: '',
  end_time: '',
  assigned_by: null as number | null,
  // Override settings (null = test default ishlatiladi)
  duration_minutes: null as number | null,
  max_questions: null as number | null,
  passing_score: null as number | null,
  max_attempts: null as number | null,
  shuffle_questions: null as boolean | null,
  shuffle_answers: null as boolean | null,
  show_results: null as boolean | null,
})

/** Tanlangan testning default sozlamalari (placeholder uchun) */
const selectedTestDefaults = ref<Test | null>(null)

function resetForm() {
  form.value = {
    test_id: 0, user_group_id: 0, start_time: '', end_time: '', assigned_by: null,
    duration_minutes: null, max_questions: null, passing_score: null, max_attempts: null,
    shuffle_questions: null, shuffle_answers: null, show_results: null,
  }
  selectedTestDefaults.value = null
  editingId.value = null
}

function onTestChange() {
  const t = tests.value.find(t => t.id === form.value.test_id)
  selectedTestDefaults.value = t ?? null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(a: TestAssignmentWithDetails) {
  editingId.value = a.id
  form.value = {
    test_id: a.test_id,
    user_group_id: a.user_group_id,
    start_time: a.start_time.slice(0, 16),
    end_time: a.end_time.slice(0, 16),
    assigned_by: a.assigned_by,
    duration_minutes: a.duration_minutes,
    max_questions: a.max_questions,
    passing_score: a.passing_score,
    max_attempts: a.max_attempts,
    shuffle_questions: a.shuffle_questions,
    shuffle_answers: a.shuffle_answers,
    show_results: a.show_results,
  }
  selectedTestDefaults.value = a.test ?? null
  showForm.value = true
}

function confirmDelete(id: number) {
  deletingId.value = id
  showDeleteModal.value = true
}

async function loadData() {
  isLoading.value = true
  try {
    const [assignResult, testsResult, groupsResult] = await Promise.all([
      fetchAssignments(),
      fetchTests(),
      fetchUserGroups(),
    ])
    if (assignResult.success && assignResult.data) assignments.value = assignResult.data
    if (testsResult.success && testsResult.data) tests.value = testsResult.data
    if (groupsResult.success && groupsResult.data) groups.value = groupsResult.data
  } catch (err) {
    console.error('Error loading data:', err)
  } finally {
    isLoading.value = false
  }
}

async function saveAssignment() {
  if (!form.value.test_id || !form.value.user_group_id || !form.value.start_time || !form.value.end_time) return
  isSaving.value = true
  try {
    const overrides = {
      duration_minutes: form.value.duration_minutes || null,
      max_questions: form.value.max_questions || null,
      passing_score: form.value.passing_score ?? null,
      max_attempts: form.value.max_attempts || null,
      shuffle_questions: form.value.shuffle_questions,
      shuffle_answers: form.value.shuffle_answers,
      show_results: form.value.show_results,
    }
    if (editingId.value) {
      await updateAssignment(editingId.value, {
        start_time: new Date(form.value.start_time).toISOString(),
        end_time: new Date(form.value.end_time).toISOString(),
        ...overrides,
      })
    } else {
      const payload: TestAssignmentInsert = {
        test_id: form.value.test_id,
        user_group_id: form.value.user_group_id,
        start_time: new Date(form.value.start_time).toISOString(),
        end_time: new Date(form.value.end_time).toISOString(),
        assigned_by: form.value.assigned_by,
        ...overrides,
      }
      await createAssignment(payload)
    }
    showForm.value = false
    resetForm()
    await loadData()
  } catch (err) {
    console.error('Error saving assignment:', err)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    await deleteAssignment(deletingId.value)
    showDeleteModal.value = false
    deletingId.value = null
    await loadData()
  } catch (err) {
    console.error('Error deleting assignment:', err)
  } finally {
    isDeleting.value = false
  }
}

function getAssignmentStatus(a: TestAssignmentWithDetails) {
  const now = new Date()
  const start = new Date(a.start_time)
  const end = new Date(a.end_time)
  if (now < start) return { label: 'Kutilmoqda', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' }
  if (now > end) return { label: 'Tugagan', class: 'bg-red-500/10 text-red-600 dark:text-red-400' }
  return { label: 'Faol', class: 'bg-green-500/10 text-green-600 dark:text-green-400' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })
}

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return assignments.value
  const q = searchQuery.value.toLowerCase()
  return assignments.value.filter(a =>
    a.test?.name?.toLowerCase().includes(q) ||
    a.user_group?.name?.toLowerCase().includes(q)
  )
})

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-foreground">Test tayinlash</h2>
        <p class="text-sm text-muted-foreground">Guruhlarga test tayinlash</p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
      >
        <Plus class="w-4 h-4" />
        Tayinlash
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Test yoki guruh nomi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-20 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Assignments List -->
    <div v-else class="space-y-3">
      <div v-if="!filtered.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <CalendarCheck class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Tayinlashlar yo'q</h3>
        <p class="text-sm text-muted-foreground mt-1">Guruhlarga test tayinlang</p>
      </div>

      <div
        v-for="a in filtered"
        :key="a.id"
        class="rounded-xl border border-border bg-card p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <p class="text-sm font-medium text-foreground truncate">{{ a.test?.name || 'Test' }}</p>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', getAssignmentStatus(a).class]">
                {{ getAssignmentStatus(a).label }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mb-2">
              Guruh: <span class="font-medium text-foreground">{{ a.user_group?.name || '-' }}</span>
            </p>
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {{ formatDate(a.start_time) }} — {{ formatDate(a.end_time) }}
              </span>
            </div>
            <div
              v-if="a.duration_minutes || a.max_questions || a.passing_score || a.max_attempts"
              class="flex flex-wrap gap-1.5 mt-2"
            >
              <span v-if="a.duration_minutes" class="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">{{ a.duration_minutes }} daq</span>
              <span v-if="a.max_questions" class="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">{{ a.max_questions }} savol</span>
              <span v-if="a.passing_score" class="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">{{ a.passing_score }}%</span>
              <span v-if="a.max_attempts" class="inline-flex items-center rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">{{ a.max_attempts }} urinish</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEdit(a)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              @click="confirmDelete(a.id)"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Slide-over -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showForm" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showForm = false" />
          <div class="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 class="text-lg font-semibold text-foreground">
                {{ editingId ? 'Tayinlashni tahrirlash' : 'Yangi tayinlash' }}
              </h3>
              <button @click="showForm = false" class="text-muted-foreground hover:text-foreground">
                <X class="w-5 h-5" />
              </button>
            </div>

            <form @submit.prevent="saveAssignment" class="flex-1 overflow-y-auto p-6 space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Test</label>
                <select
                  v-model.number="form.test_id"
                  required
                  :disabled="!!editingId"
                  @change="onTestChange"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  <option :value="0" disabled>Test tanlang</option>
                  <option v-for="t in tests" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Guruh</label>
                <select
                  v-model.number="form.user_group_id"
                  required
                  :disabled="!!editingId"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  <option :value="0" disabled>Guruh tanlang</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Boshlanish vaqti</label>
                <DateTimePicker
                  v-model="form.start_time"
                  placeholder="Boshlanish vaqtini tanlang"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Tugash vaqti</label>
                <DateTimePicker
                  v-model="form.end_time"
                  placeholder="Tugash vaqtini tanlang"
                  :min="form.start_time"
                />
              </div>

              <!-- Override sozlamalar -->
              <div v-if="form.test_id" class="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p class="text-sm font-medium text-foreground">Test sozlamalari</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Bo'sh qoldirilsa test default qiymati ishlatiladi</p>
                </div>

                <!-- Duration & Max Questions -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-foreground">Davomiylik (daq)</label>
                    <input
                      v-model.number="form.duration_minutes"
                      type="number"
                      min="1"
                      max="300"
                      :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.duration_minutes}` : ''"
                      class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-foreground">Savollar soni</label>
                    <input
                      v-model.number="form.max_questions"
                      type="number"
                      min="1"
                      max="500"
                      :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.max_questions}` : ''"
                      class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <!-- Passing Score & Max Attempts -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-foreground">O'tish balli (%)</label>
                    <input
                      v-model.number="form.passing_score"
                      type="number"
                      min="0"
                      max="100"
                      :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.passing_score}` : ''"
                      class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-foreground">Urinishlar soni</label>
                    <input
                      v-model.number="form.max_attempts"
                      type="number"
                      min="1"
                      max="100"
                      :placeholder="selectedTestDefaults ? `Default: ${selectedTestDefaults.max_attempts}` : ''"
                      class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <!-- Checkboxes -->
                <div class="space-y-2.5">
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="form.shuffle_questions ?? selectedTestDefaults?.shuffle_questions ?? true"
                      @change="form.shuffle_questions = ($event.target as HTMLInputElement).checked"
                      class="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span class="text-sm text-foreground">Savollarni aralashtirish</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="form.shuffle_answers ?? selectedTestDefaults?.shuffle_answers ?? true"
                      @change="form.shuffle_answers = ($event.target as HTMLInputElement).checked"
                      class="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span class="text-sm text-foreground">Javoblarni aralashtirish</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="form.show_results ?? selectedTestDefaults?.show_results ?? true"
                      @change="form.show_results = ($event.target as HTMLInputElement).checked"
                      class="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span class="text-sm text-foreground">Natijalarni ko'rsatish</span>
                  </label>
                </div>
              </div>
            </form>

            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showForm = false"
                class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="saveAssignment"
                :disabled="isSaving"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                {{ editingId ? 'Saqlash' : 'Tayinlash' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          @click.self="showDeleteModal = false"
        >
          <div class="w-full max-w-sm bg-card rounded-xl shadow-xl border border-border p-6 text-center">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <Trash2 class="w-6 h-6 text-destructive" />
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">Tayinlashni o'chirish</h3>
            <p class="text-sm text-muted-foreground mb-4">Bu amalni qaytarib bo'lmaydi.</p>
            <div class="flex gap-3">
              <button
                @click="showDeleteModal = false"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin mx-auto" />
                <span v-else>O'chirish</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
