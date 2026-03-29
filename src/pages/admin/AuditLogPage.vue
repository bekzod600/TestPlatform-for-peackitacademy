<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  FileQuestion,
  ClipboardList,
  CalendarCheck,
  Users,
  BookOpen,
  FolderOpen,
  Activity,
} from 'lucide-vue-next'
import { fetchAuditLogs } from '@/api/admin.api'
import type { AuditLog, PaginatedResponse } from '@/types'
import { PAGINATION, UI } from '@/lib/constants'

const isLoading = ref(true)
const logs = ref<AuditLog[]>([])
const searchQuery = ref('')
const actionFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function loadLogs() {
  isLoading.value = true
  try {
    const result: PaginatedResponse<AuditLog> = await fetchAuditLogs({
      page: page.value,
      page_size: PAGINATION.DEFAULT_PAGE_SIZE,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
    if (result.success) {
      logs.value = result.data
      totalPages.value = result.pagination.total_pages
      totalCount.value = result.pagination.total_count
    }
  } catch (err) {
    console.error('Error loading audit logs:', err)
  } finally {
    isLoading.value = false
  }
}

function getActionBadge(action: string) {
  const map: Record<string, { label: string; class: string }> = {
    login: { label: 'Kirish', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    logout: { label: 'Chiqish', class: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    create: { label: 'Yaratish', class: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    update: { label: 'Yangilash', class: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    delete: { label: "O'chirish", class: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    test_start: { label: 'Test boshlash', class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    test_finish: { label: 'Test yakunlash', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    test_violation: { label: 'Qoidabuzarlik', class: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    assign_test: { label: 'Test tayinlash', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  }
  return map[action] || { label: action, class: 'bg-muted text-muted-foreground' }
}

function getEntityIcon(entityType: string | null) {
  const map: Record<string, typeof User> = {
    user: User,
    user_group: Users,
    subject: BookOpen,
    category: FolderOpen,
    test: ClipboardList,
    question: FileQuestion,
    test_assignment: CalendarCheck,
    test_attempt: Activity,
    session: Shield,
  }
  return entityType ? map[entityType] || ScrollText : ScrollText
}

function getEntityLabel(entityType: string | null) {
  const map: Record<string, string> = {
    user: 'Foydalanuvchi',
    user_group: 'Guruh',
    subject: 'Fan',
    category: 'Kategoriya',
    test: 'Test',
    question: 'Savol',
    test_assignment: 'Tayinlash',
    test_attempt: 'Urinish',
    session: 'Sessiya',
  }
  return entityType ? map[entityType] || entityType : '—'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const filtered = computed(() => {
  let result = logs.value
  if (actionFilter.value) {
    result = result.filter(l => l.action === actionFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(l =>
      l.action.toLowerCase().includes(q) ||
      (l.entity_type?.toLowerCase().includes(q) ?? false) ||
      String(l.entity_id).includes(q) ||
      String(l.user_id).includes(q)
    )
  }
  return result
})

const pageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = page.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push(-1)
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push(-1)
    pages.push(total)
  }
  return pages
})

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
  }, UI.SEARCH_DEBOUNCE_MS)
})

watch(page, loadLogs)

onMounted(loadLogs)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-foreground">Audit Log</h2>
      <p class="text-sm text-muted-foreground">
        Tizim bo'yicha barcha harakatlar tarixi
        <span v-if="totalCount" class="text-foreground font-medium">({{ totalCount }})</span>
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Qidirish..."
          class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <select
        v-model="actionFilter"
        class="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">Barcha harakatlar</option>
        <option value="login">Kirish</option>
        <option value="logout">Chiqish</option>
        <option value="create">Yaratish</option>
        <option value="update">Yangilash</option>
        <option value="delete">O'chirish</option>
        <option value="test_start">Test boshlash</option>
        <option value="test_finish">Test yakunlash</option>
        <option value="test_violation">Qoidabuzarlik</option>
        <option value="assign_test">Test tayinlash</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 8" :key="i" class="h-14 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Logs -->
    <div v-else class="space-y-2">
      <div v-if="!filtered.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <ScrollText class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Log yozuvlari yo'q</h3>
      </div>

      <div
        v-for="log in filtered"
        :key="log.id"
        class="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
      >
        <!-- Icon -->
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
          <component :is="getEntityIcon(log.entity_type)" class="w-5 h-5 text-muted-foreground" />
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', getActionBadge(log.action).class]">
              {{ getActionBadge(log.action).label }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ getEntityLabel(log.entity_type) }}
              <span v-if="log.entity_id" class="font-mono">#{{ log.entity_id }}</span>
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span v-if="log.user_id" class="flex items-center gap-1">
              <User class="w-3 h-3" />
              User #{{ log.user_id }}
            </span>
            <span v-if="log.ip_address" class="font-mono">{{ log.ip_address }}</span>
          </div>
        </div>

        <!-- Timestamp -->
        <div class="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {{ formatDate(log.created_at) }}
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 pt-4">
      <button
        :disabled="page <= 1"
        @click="page--"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <template v-for="p in pageNumbers" :key="p">
        <span v-if="p === -1" class="px-1 text-muted-foreground">...</span>
        <button
          v-else
          @click="page = p"
          :class="[
            'inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors',
            p === page
              ? 'bg-primary text-primary-foreground'
              : 'border border-border hover:bg-accent'
          ]"
        >
          {{ p }}
        </button>
      </template>
      <button
        :disabled="page >= totalPages"
        @click="page++"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
