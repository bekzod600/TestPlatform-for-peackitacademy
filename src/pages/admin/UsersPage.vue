<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
} from 'lucide-vue-next'
import { exportToExcel } from '@/composables/useExcel'
import type { ExcelColumn } from '@/composables/useExcel'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchUserGroups,
} from '@/api/admin.api'
import { USER_ROLES, ROLE_LABELS, PAGINATION } from '@/lib/constants'
import type { UserRole } from '@/lib/constants'
import type {
  UserWithGroup,
  UserGroup,
  UserInsert,
  UserUpdate,
  UserListFilters,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------

const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)

// Users data & pagination
const users = ref<UserWithGroup[]>([])
const pagination = ref({
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE as number,
  total_count: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
})

// Filters
const searchQuery = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const filters = reactive<UserListFilters>({
  search: '',
  page: 1,
  page_size: PAGINATION.DEFAULT_PAGE_SIZE,
  sort_by: 'created_at',
  sort_order: 'desc',
})

// User groups for the form select
const userGroups = ref<UserGroup[]>([])

// Slide-over (sheet) state
const isSheetOpen = ref(false)
const editingUser = ref<UserWithGroup | null>(null)
const isEditing = computed(() => editingUser.value !== null)

// Form state
const form = reactive({
  full_name: '',
  username: '',
  password_hash: '',
  role: USER_ROLES.STUDENT as UserRole,
  user_group_id: null as number | null,
  is_active: true,
})

const formErrors = reactive<Record<string, string>>({})

// Delete confirmation modal
const isDeleteModalOpen = ref(false)
const userToDelete = ref<UserWithGroup | null>(null)

// Error / success messages
const errorMessage = ref('')
const successMessage = ref('')

// ---------------------------------------------------------------
// Computed
// ---------------------------------------------------------------

const showGroupSelect = computed(() => form.role === USER_ROLES.STUDENT)

const roleOptions: { value: UserRole; label: string }[] = [
  { value: USER_ROLES.SUPER_ADMIN, label: ROLE_LABELS[USER_ROLES.SUPER_ADMIN] },
  { value: USER_ROLES.ADMIN, label: ROLE_LABELS[USER_ROLES.ADMIN] },
  { value: USER_ROLES.TEACHER, label: ROLE_LABELS[USER_ROLES.TEACHER] },
  { value: USER_ROLES.STUDENT, label: ROLE_LABELS[USER_ROLES.STUDENT] },
]

const paginationRange = computed(() => {
  const current = pagination.value.page
  const total = pagination.value.total_pages
  const pages: (number | string)[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return pages
})

// ---------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------

async function loadUsers() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const result: PaginatedResponse<UserWithGroup> = await fetchUsers(filters)
    if (result.success) {
      users.value = result.data
      pagination.value = result.pagination
    } else {
      errorMessage.value = result.error ?? 'Foydalanuvchilarni yuklashda xatolik yuz berdi'
    }
  } catch (err) {
    errorMessage.value = 'Foydalanuvchilarni yuklashda xatolik yuz berdi'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

async function loadUserGroups() {
  try {
    const result = await fetchUserGroups()
    if (result.success && result.data) {
      userGroups.value = result.data
    }
  } catch (err) {
    console.error('Failed to load user groups:', err)
  }
}

// ---------------------------------------------------------------
// Search handling
// ---------------------------------------------------------------

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    filters.search = searchQuery.value
    filters.page = 1
    loadUsers()
  }, 300)
}

// ---------------------------------------------------------------
// Pagination handling
// ---------------------------------------------------------------

function goToPage(page: number) {
  if (page < 1 || page > pagination.value.total_pages) return
  filters.page = page
  loadUsers()
}

// ---------------------------------------------------------------
// Sheet (slide-over) handling
// ---------------------------------------------------------------

function openCreateSheet() {
  editingUser.value = null
  resetForm()
  isSheetOpen.value = true
}

function openEditSheet(user: UserWithGroup) {
  editingUser.value = user
  form.full_name = user.full_name
  form.username = user.username
  form.password_hash = ''
  form.role = user.role
  form.user_group_id = user.user_group_id
  form.is_active = user.is_active
  clearFormErrors()
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  editingUser.value = null
  resetForm()
}

function resetForm() {
  form.full_name = ''
  form.username = ''
  form.password_hash = ''
  form.role = USER_ROLES.STUDENT
  form.user_group_id = null
  form.is_active = true
  clearFormErrors()
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((key) => delete formErrors[key])
}

// ---------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------

function validateForm(): boolean {
  clearFormErrors()
  let valid = true

  if (!form.full_name.trim()) {
    formErrors.full_name = 'Ism kiritilishi shart'
    valid = false
  }

  if (!isEditing.value && !form.username.trim()) {
    formErrors.username = 'Foydalanuvchi nomi kiritilishi shart'
    valid = false
  }

  if (!isEditing.value && !form.password_hash.trim()) {
    formErrors.password_hash = 'Parol kiritilishi shart'
    valid = false
  }

  if (form.role === USER_ROLES.STUDENT && !form.user_group_id) {
    formErrors.user_group_id = "Guruh tanlanishi shart"
    valid = false
  }

  return valid
}

// ---------------------------------------------------------------
// Submit form (create / update)
// ---------------------------------------------------------------

async function handleSubmit() {
  if (!validateForm()) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isEditing.value && editingUser.value) {
      // Update
      const payload: UserUpdate = {
        full_name: form.full_name,
        role: form.role,
        user_group_id: form.role === USER_ROLES.STUDENT ? form.user_group_id : null,
        is_active: form.is_active,
      }
      if (form.password_hash.trim()) {
        payload.password_hash = form.password_hash
      }

      const result = await updateUser(editingUser.value.id, payload)
      if (result.success) {
        successMessage.value = "Foydalanuvchi muvaffaqiyatli yangilandi"
        closeSheet()
        await loadUsers()
      } else {
        errorMessage.value = result.error ?? "Foydalanuvchini yangilashda xatolik yuz berdi"
      }
    } else {
      // Create
      const payload: UserInsert = {
        full_name: form.full_name,
        username: form.username,
        password_hash: form.password_hash,
        role: form.role,
        user_group_id: form.role === USER_ROLES.STUDENT ? form.user_group_id : null,
        is_active: form.is_active,
      }

      const result = await createUser(payload)
      if (result.success) {
        successMessage.value = "Foydalanuvchi muvaffaqiyatli qo'shildi"
        closeSheet()
        await loadUsers()
      } else {
        errorMessage.value = result.error ?? "Foydalanuvchi qo'shishda xatolik yuz berdi"
      }
    }
  } catch (err) {
    errorMessage.value = 'Kutilmagan xatolik yuz berdi'
    console.error(err)
  } finally {
    isSaving.value = false
  }
}

// ---------------------------------------------------------------
// Delete handling
// ---------------------------------------------------------------

function openDeleteModal(user: UserWithGroup) {
  userToDelete.value = user
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  userToDelete.value = null
}

async function confirmDelete() {
  if (!userToDelete.value) return

  isDeleting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await deleteUser(userToDelete.value.id)
    if (result.success) {
      successMessage.value = "Foydalanuvchi muvaffaqiyatli o'chirildi"
      closeDeleteModal()
      await loadUsers()
    } else {
      errorMessage.value = result.error ?? "Foydalanuvchini o'chirishda xatolik yuz berdi"
    }
  } catch (err) {
    errorMessage.value = "Foydalanuvchini o'chirishda xatolik yuz berdi"
    console.error(err)
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function getRoleBadgeClass(role: UserRole): string {
  const map: Record<string, string> = {
    super_admin: 'bg-red-500/10 text-red-600 dark:text-red-400',
    admin: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    teacher: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    student: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }
  return map[role] || 'bg-muted text-muted-foreground'
}

function getStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
    : 'bg-red-500/10 text-red-600 dark:text-red-400'
}

function dismissSuccess() {
  successMessage.value = ''
}

function dismissError() {
  errorMessage.value = ''
}

// ---------------------------------------------------------------
// Excel Export
// ---------------------------------------------------------------
async function exportUsers() {
  const columns: ExcelColumn<UserWithGroup>[] = [
    { key: 'id', label: 'ID' },
    { key: 'full_name', label: 'Ism' },
    { key: 'username', label: 'Foydalanuvchi nomi' },
    { key: 'role', label: 'Roli', transform: (v) => ROLE_LABELS[v as UserRole] ?? String(v) },
    { key: 'user_group', label: 'Guruh', transform: (_v, row) => row.user_group?.name ?? '—' },
    { key: 'is_active', label: 'Holat', transform: (v) => v ? 'Faol' : 'Nofaol' },
    { key: 'created_at', label: 'Yaratilgan', transform: (v) => new Date(v as string).toLocaleDateString('uz-UZ') },
  ]
  await exportToExcel(users.value, columns, 'foydalanuvchilar')
}

// Auto-dismiss success messages after 3 seconds
watch(successMessage, (val) => {
  if (val) {
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
})

// ---------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------

onMounted(async () => {
  await Promise.all([loadUsers(), loadUserGroups()])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success Message -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="successMessage"
        class="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
      >
        <span>{{ successMessage }}</span>
        <button @click="dismissSuccess" class="ml-2 hover:opacity-70">
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- Error Message -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="errorMessage"
        class="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        <span>{{ errorMessage }}</span>
        <button @click="dismissError" class="ml-2 hover:opacity-70">
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Foydalanuvchilar</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Barcha foydalanuvchilarni boshqaring
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="exportUsers"
          :disabled="!users.length"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download class="h-4 w-4" />
          Excel
        </button>
        <button
          @click="openCreateSheet"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus class="h-4 w-4" />
          Qo'shish
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        type="text"
        placeholder="Ism yoki foydalanuvchi nomi bo'yicha qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div class="rounded-xl border border-border bg-card">
        <div class="divide-y divide-border">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-6 py-4">
            <div class="h-4 w-40 animate-pulse rounded bg-muted" />
            <div class="h-4 w-28 animate-pulse rounded bg-muted" />
            <div class="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div class="h-4 w-24 animate-pulse rounded bg-muted" />
            <div class="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div class="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ism
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Foydalanuvchi nomi
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Roli
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Guruh
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Holat
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {{ user.full_name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ user.full_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">@{{ user.username }}</span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getRoleBadgeClass(user.role)]"
                >
                  {{ ROLE_LABELS[user.role] || user.role }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">
                  {{ user.user_group?.name || '—' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusBadgeClass(user.is_active)]"
                >
                  {{ user.is_active ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditSheet(user)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Tahrirlash"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="openDeleteModal(user)"
                    class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="users.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <p class="text-sm text-muted-foreground">Foydalanuvchilar topilmadi</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.total_pages > 1"
        class="flex items-center justify-between border-t border-border px-6 py-4"
      >
        <p class="text-sm text-muted-foreground">
          Jami <span class="font-medium text-foreground">{{ pagination.total_count }}</span> ta foydalanuvchi
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="!pagination.has_previous"
            class="inline-flex items-center justify-center rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>

          <template v-for="(p, idx) in paginationRange" :key="idx">
            <span
              v-if="p === '...'"
              class="px-2 text-sm text-muted-foreground"
            >
              ...
            </span>
            <button
              v-else
              @click="goToPage(p as number)"
              :class="[
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                pagination.page === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ]"
            >
              {{ p }}
            </button>
          </template>

          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="!pagination.has_next"
            class="inline-flex items-center justify-center rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- Slide-over (Sheet) for Add / Edit User                        -->
    <!-- ============================================================= -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isSheetOpen"
          class="fixed inset-0 z-50"
        >
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black/50"
            @click="closeSheet"
          />

          <!-- Panel -->
          <Transition
            enter-active-class="transition ease-out duration-300 transform"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-200 transform"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
            appear
          >
            <div
              class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 class="text-lg font-semibold text-foreground">
                    {{ isEditing ? 'Foydalanuvchini tahrirlash' : "Yangi foydalanuvchi qo'shish" }}
                  </h2>
                  <p class="mt-0.5 text-sm text-muted-foreground">
                    {{ isEditing ? "Ma'lumotlarni o'zgartiring" : "Forma maydonlarini to'ldiring" }}
                  </p>
                </div>
                <button
                  @click="closeSheet"
                  class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <!-- Form -->
              <div class="flex-1 overflow-y-auto px-6 py-6">
                <form @submit.prevent="handleSubmit" class="space-y-5">
                  <!-- Full Name -->
                  <div class="space-y-2">
                    <label for="full_name" class="text-sm font-medium text-foreground">
                      Ism
                    </label>
                    <input
                      id="full_name"
                      v-model="form.full_name"
                      type="text"
                      placeholder="To'liq ism"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.full_name }"
                    />
                    <p v-if="formErrors.full_name" class="text-xs text-destructive">
                      {{ formErrors.full_name }}
                    </p>
                  </div>

                  <!-- Username -->
                  <div class="space-y-2">
                    <label for="username" class="text-sm font-medium text-foreground">
                      Foydalanuvchi nomi
                    </label>
                    <input
                      id="username"
                      v-model="form.username"
                      type="text"
                      placeholder="username"
                      :disabled="isEditing"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      :class="{ 'border-destructive': formErrors.username }"
                    />
                    <p v-if="formErrors.username" class="text-xs text-destructive">
                      {{ formErrors.username }}
                    </p>
                    <p v-if="isEditing" class="text-xs text-muted-foreground">
                      Foydalanuvchi nomini o'zgartirish mumkin emas
                    </p>
                  </div>

                  <!-- Password -->
                  <div class="space-y-2">
                    <label for="password" class="text-sm font-medium text-foreground">
                      Parol
                      <span v-if="isEditing" class="font-normal text-muted-foreground">(ixtiyoriy)</span>
                    </label>
                    <input
                      id="password"
                      v-model="form.password_hash"
                      type="password"
                      :placeholder="isEditing ? 'Yangi parol (bo\'sh qoldiring agar o\'zgartirmoqchi bo\'lmasangiz)' : 'Parol'"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :class="{ 'border-destructive': formErrors.password_hash }"
                    />
                    <p v-if="formErrors.password_hash" class="text-xs text-destructive">
                      {{ formErrors.password_hash }}
                    </p>
                  </div>

                  <!-- Role -->
                  <div class="space-y-2">
                    <label for="role" class="text-sm font-medium text-foreground">
                      Roli
                    </label>
                    <select
                      id="role"
                      v-model="form.role"
                      class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option
                        v-for="opt in roleOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>

                  <!-- User Group (only for students) -->
                  <Transition
                    enter-active-class="transition ease-out duration-200"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition ease-in duration-150"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1"
                  >
                    <div v-if="showGroupSelect" class="space-y-2">
                      <label for="user_group_id" class="text-sm font-medium text-foreground">
                        Guruh
                      </label>
                      <select
                        id="user_group_id"
                        v-model="form.user_group_id"
                        class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        :class="{ 'border-destructive': formErrors.user_group_id }"
                      >
                        <option :value="null" disabled>Guruhni tanlang</option>
                        <option
                          v-for="group in userGroups"
                          :key="group.id"
                          :value="group.id"
                        >
                          {{ group.name }}
                        </option>
                      </select>
                      <p v-if="formErrors.user_group_id" class="text-xs text-destructive">
                        {{ formErrors.user_group_id }}
                      </p>
                    </div>
                  </Transition>

                  <!-- Is Active -->
                  <div class="flex items-center gap-3">
                    <input
                      id="is_active"
                      v-model="form.is_active"
                      type="checkbox"
                      class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <label for="is_active" class="text-sm font-medium text-foreground">
                      Faol
                    </label>
                  </div>
                </form>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  @click="closeSheet"
                  type="button"
                  class="inline-flex items-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="handleSubmit"
                  type="button"
                  :disabled="isSaving"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  {{ isEditing ? 'Saqlash' : "Qo'shish" }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ============================================================= -->
    <!-- Delete Confirmation Modal                                      -->
    <!-- ============================================================= -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isDeleteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black/50"
            @click="closeDeleteModal"
          />

          <!-- Modal -->
          <Transition
            enter-active-class="transition ease-out duration-200 transform"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150 transform"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
            appear
          >
            <div class="relative z-50 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <div class="flex items-start gap-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle class="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 class="text-base font-semibold text-foreground">
                    Foydalanuvchini o'chirish
                  </h3>
                  <p class="mt-2 text-sm text-muted-foreground">
                    <strong class="text-foreground">{{ userToDelete?.full_name }}</strong>
                    ni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
                  </p>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-3">
                <button
                  @click="closeDeleteModal"
                  type="button"
                  class="inline-flex items-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  @click="confirmDelete"
                  type="button"
                  :disabled="isDeleting"
                  class="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin" />
                  O'chirish
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
