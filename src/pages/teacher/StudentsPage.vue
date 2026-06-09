<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Download,
  Users,
  UserCheck,
  ClipboardList,
  BarChart3,
  Trophy,
} from 'lucide-vue-next'
import { exportToExcel } from '@/composables/useExcel'
import type { ExcelColumn } from '@/composables/useExcel'
import {
  createUser,
  updateUser,
  deleteUser,
  fetchGroupsByTeacher,
  fetchStudentsByGroups,
  fetchGroupStatistics,
} from '@/api/admin.api'
import type { GroupStatistics } from '@/api/admin.api'
import { USER_ROLES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import ImageUploader from '@/components/ImageUploader.vue'
import { useImageUpload, IMAGE_BUCKETS } from '@/composables/useImageUpload'
import type {
  UserWithGroup,
  UserGroupWithTeacher,
  UserInsert,
  UserUpdate,
} from '@/types'

const { uploadImage, deleteImage, replaceImage, isUploading: isImageUploading, uploadError: imageUploadError } = useImageUpload()

const auth = useAuthStore()
const teacherId = computed(() => auth.user?.id as number)

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------

const isLoading = ref(true)
const isStatsLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)

const groups = ref<UserGroupWithTeacher[]>([])
/** null = barcha guruhlar */
const selectedGroupId = ref<number | null>(null)

const students = ref<UserWithGroup[]>([])
const stats = ref<GroupStatistics | null>(null)

const searchQuery = ref('')

const isSheetOpen = ref(false)
const editingUser = ref<UserWithGroup | null>(null)
const isEditing = computed(() => editingUser.value !== null)

const form = reactive({
  full_name: '',
  username: '',
  password_hash: '',
  user_group_id: null as number | null,
  is_active: true,
  avatar_url: null as string | null,
})

const pendingAvatarFile = ref<File | null>(null)
const avatarRemoved = ref(false)

const formErrors = reactive<Record<string, string>>({})

const isDeleteModalOpen = ref(false)
const userToDelete = ref<UserWithGroup | null>(null)

const errorMessage = ref('')
const successMessage = ref('')

// ---------------------------------------------------------------
// Computed
// ---------------------------------------------------------------

/** Tanlangan guruh(lar)ning ID lari — null bo'lsa barcha guruhlar */
const activeGroupIds = computed<number[]>(() =>
  selectedGroupId.value !== null
    ? [selectedGroupId.value]
    : groups.value.map((g) => g.id),
)

const selectedGroup = computed(() =>
  groups.value.find((g) => g.id === selectedGroupId.value) ?? null,
)

const filteredStudents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return students.value
  return students.value.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q),
  )
})

// ---------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------

async function loadGroups() {
  try {
    const result = await fetchGroupsByTeacher(teacherId.value)
    if (result.success && result.data) {
      groups.value = result.data
    } else {
      errorMessage.value = result.error ?? 'Guruhlarni yuklashda xatolik'
    }
  } catch (err) {
    console.error('Failed to load groups:', err)
    errorMessage.value = 'Guruhlarni yuklashda xatolik'
  }
}

async function loadStudents() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await fetchStudentsByGroups(activeGroupIds.value)
    if (result.success && result.data) {
      students.value = result.data
    } else {
      errorMessage.value = result.error ?? "O'quvchilarni yuklashda xatolik yuz berdi"
    }
  } catch (err) {
    errorMessage.value = "O'quvchilarni yuklashda xatolik yuz berdi"
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  isStatsLoading.value = true
  try {
    const result = await fetchGroupStatistics(activeGroupIds.value)
    if (result.success && result.data) {
      stats.value = result.data
    }
  } catch (err) {
    console.error('Failed to load group statistics:', err)
  } finally {
    isStatsLoading.value = false
  }
}

async function refresh() {
  await Promise.all([loadStudents(), loadStats()])
}

function selectGroup(groupId: number | null) {
  if (selectedGroupId.value === groupId) return
  selectedGroupId.value = groupId
}

watch(selectedGroupId, () => {
  searchQuery.value = ''
  refresh()
})

// ---------------------------------------------------------------
// Sheet (slide-over)
// ---------------------------------------------------------------

function openCreateSheet() {
  editingUser.value = null
  resetForm()
  // Tanlangan guruhni avtomatik tanlash
  if (selectedGroupId.value !== null) {
    form.user_group_id = selectedGroupId.value
  }
  isSheetOpen.value = true
}

function openEditSheet(user: UserWithGroup) {
  editingUser.value = user
  form.full_name = user.full_name
  form.username = user.username
  form.password_hash = ''
  form.user_group_id = user.user_group_id
  form.is_active = user.is_active
  form.avatar_url = user.avatar_url ?? null
  pendingAvatarFile.value = null
  avatarRemoved.value = false
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
  form.user_group_id = null
  form.is_active = true
  form.avatar_url = null
  pendingAvatarFile.value = null
  avatarRemoved.value = false
  clearFormErrors()
}

function onAvatarSelected(file: File) {
  pendingAvatarFile.value = file
  avatarRemoved.value = false
}

function onAvatarRemoved() {
  pendingAvatarFile.value = null
  avatarRemoved.value = true
  form.avatar_url = null
}

function clearFormErrors() {
  Object.keys(formErrors).forEach((key) => delete formErrors[key])
}

// ---------------------------------------------------------------
// Validation
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

  if (!form.user_group_id) {
    formErrors.user_group_id = 'Guruh tanlanishi shart'
    valid = false
  }

  return valid
}

// ---------------------------------------------------------------
// Submit
// ---------------------------------------------------------------

async function handleSubmit() {
  if (!validateForm()) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isEditing.value && editingUser.value) {
      let avatarUrl = editingUser.value.avatar_url ?? null
      if (pendingAvatarFile.value) {
        const newUrl = await replaceImage(
          pendingAvatarFile.value,
          avatarUrl,
          IMAGE_BUCKETS.AVATARS,
          `user-${editingUser.value.id}`,
        )
        if (!newUrl) {
          errorMessage.value = imageUploadError.value ?? 'Rasmni yuklashda xatolik'
          return
        }
        avatarUrl = newUrl
      } else if (avatarRemoved.value && avatarUrl) {
        await deleteImage(avatarUrl, IMAGE_BUCKETS.AVATARS)
        avatarUrl = null
      }

      const payload: UserUpdate = {
        full_name: form.full_name,
        role: USER_ROLES.STUDENT,
        user_group_id: form.user_group_id,
        is_active: form.is_active,
        avatar_url: avatarUrl,
      }
      if (form.password_hash.trim()) {
        payload.password_hash = form.password_hash
      }

      const result = await updateUser(editingUser.value.id, payload, teacherId.value)
      if (result.success) {
        successMessage.value = "O'quvchi muvaffaqiyatli yangilandi"
        closeSheet()
        await refresh()
      } else {
        errorMessage.value = result.error ?? "O'quvchini yangilashda xatolik yuz berdi"
      }
    } else {
      const payload: UserInsert = {
        full_name: form.full_name,
        username: form.username,
        password_hash: form.password_hash,
        role: USER_ROLES.STUDENT,
        user_group_id: form.user_group_id,
        is_active: form.is_active,
        avatar_url: null,
      }

      const result = await createUser(payload, teacherId.value)
      if (!result.success || !result.data) {
        errorMessage.value = result.error ?? "O'quvchi qo'shishda xatolik yuz berdi"
        return
      }

      if (pendingAvatarFile.value) {
        const avatarUrl = await uploadImage(
          pendingAvatarFile.value,
          IMAGE_BUCKETS.AVATARS,
          `user-${result.data.id}`,
        )
        if (avatarUrl) {
          await updateUser(result.data.id, { avatar_url: avatarUrl })
        }
      }

      successMessage.value = "O'quvchi muvaffaqiyatli qo'shildi"
      closeSheet()
      await refresh()
    }
  } catch (err) {
    errorMessage.value = 'Kutilmagan xatolik yuz berdi'
    console.error(err)
  } finally {
    isSaving.value = false
  }
}

// ---------------------------------------------------------------
// Delete
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
    if (userToDelete.value.avatar_url) {
      await deleteImage(userToDelete.value.avatar_url, IMAGE_BUCKETS.AVATARS)
    }

    const result = await deleteUser(userToDelete.value.id, teacherId.value)
    if (result.success) {
      successMessage.value = "O'quvchi muvaffaqiyatli o'chirildi"
      closeDeleteModal()
      await refresh()
    } else {
      errorMessage.value = result.error ?? "O'quvchini o'chirishda xatolik yuz berdi"
    }
  } catch (err) {
    errorMessage.value = "O'quvchini o'chirishda xatolik yuz berdi"
    console.error(err)
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

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

async function exportStudents() {
  const columns: ExcelColumn<UserWithGroup>[] = [
    { key: 'id', label: 'ID' },
    { key: 'full_name', label: 'Ism' },
    { key: 'username', label: 'Foydalanuvchi nomi' },
    { key: 'user_group', label: 'Guruh', transform: (_v, row) => row.user_group?.name ?? '—' },
    { key: 'is_active', label: 'Holat', transform: (v) => (v ? 'Faol' : 'Nofaol') },
    {
      key: 'created_at',
      label: 'Yaratilgan',
      transform: (v) => new Date(v as string).toLocaleDateString('uz-UZ'),
    },
  ]
  const fileName = selectedGroup.value ? `oquvchilar-${selectedGroup.value.name}` : 'oquvchilar'
  await exportToExcel(filteredStudents.value, columns, fileName)
}

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
  await loadGroups()
  await refresh()
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
        <h1 class="text-2xl font-bold text-foreground">O'quvchilar</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Guruhlaringiz o'quvchilarini boshqaring
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="exportStudents"
          :disabled="!filteredStudents.length"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download class="h-4 w-4" />
          Excel
        </button>
        <button
          @click="openCreateSheet"
          :disabled="!groups.length"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus class="h-4 w-4" />
          Qo'shish
        </button>
      </div>
    </div>

    <!-- Group Filter Chips -->
    <div class="flex flex-wrap gap-2">
      <button
        @click="selectGroup(null)"
        :class="[
          'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
          selectedGroupId === null
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-foreground hover:bg-accent',
        ]"
      >
        <Users class="h-3.5 w-3.5" />
        Barcha guruhlar
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        @click="selectGroup(group.id)"
        :class="[
          'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
          selectedGroupId === group.id
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-foreground hover:bg-accent',
        ]"
      >
        {{ group.name }}
      </button>
      <p v-if="!groups.length" class="text-sm text-muted-foreground py-1.5">
        Hozircha guruhlaringiz yo'q. Avval "Guruhlarim" sahifasida guruh qo'shing.
      </p>
    </div>

    <!-- Statistics -->
    <div>
      <h2 class="mb-2 text-sm font-medium text-muted-foreground">
        {{ selectedGroup ? `"${selectedGroup.name}" guruhi statistikasi` : 'Umumiy statistika' }}
      </h2>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Users class="h-4 w-4" />
            <span class="text-xs">O'quvchilar</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-foreground">
            {{ isStatsLoading ? '—' : (stats?.student_count ?? 0) }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <UserCheck class="h-4 w-4" />
            <span class="text-xs">Faol</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-foreground">
            {{ isStatsLoading ? '—' : (stats?.active_student_count ?? 0) }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <ClipboardList class="h-4 w-4" />
            <span class="text-xs">Urinishlar</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-foreground">
            {{ isStatsLoading ? '—' : (stats?.attempts_count ?? 0) }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <BarChart3 class="h-4 w-4" />
            <span class="text-xs">O'rtacha natija</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-foreground">
            {{ isStatsLoading ? '—' : `${stats?.avg_percentage ?? 0}%` }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Trophy class="h-4 w-4" />
            <span class="text-xs">Eng yaxshi</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-foreground">
            {{ isStatsLoading ? '—' : `${stats?.best_percentage ?? 0}%` }}
          </p>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchQuery"
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
            <div class="h-4 w-24 animate-pulse rounded bg-muted" />
            <div class="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div class="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>

    <!-- Students Table -->
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
              v-for="user in filteredStudents"
              :key="user.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="relative h-8 w-8 shrink-0">
                    <img
                      v-if="user.avatar_url"
                      :src="user.avatar_url"
                      :alt="user.full_name"
                      class="h-8 w-8 rounded-full object-cover"
                    />
                    <div
                      v-else
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-sm font-medium text-green-600 dark:text-green-400"
                    >
                      {{ user.full_name?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ user.full_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="text-sm text-muted-foreground">@{{ user.username }}</span>
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
            <tr v-if="filteredStudents.length === 0">
              <td colspan="5" class="px-6 py-12 text-center">
                <p class="text-sm text-muted-foreground">O'quvchilar topilmadi</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer count -->
      <div
        v-if="filteredStudents.length"
        class="flex items-center justify-between border-t border-border px-6 py-4"
      >
        <p class="text-sm text-muted-foreground">
          Jami <span class="font-medium text-foreground">{{ filteredStudents.length }}</span> ta o'quvchi
        </p>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- Slide-over (Sheet) for Add / Edit Student                     -->
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
        <div v-if="isSheetOpen" class="fixed inset-0 z-50">
          <!-- Overlay -->
          <div class="fixed inset-0 bg-black/50" @click="closeSheet" />

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
            <div class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl">
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 class="text-lg font-semibold text-foreground">
                    {{ isEditing ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish" }}
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

                  <!-- User Group -->
                  <div class="space-y-2">
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
                        v-for="group in groups"
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

                  <!-- Avatar Upload -->
                  <ImageUploader
                    :model-value="form.avatar_url"
                    :is-uploading="isImageUploading"
                    :error="imageUploadError"
                    label="Profil rasmi (ixtiyoriy)"
                    hint="JPEG, PNG, WebP — max 5 MB"
                    shape="circle"
                    size="md"
                    @file-selected="onAvatarSelected"
                    @remove="onAvatarRemoved"
                  />

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
    <!-- Delete Confirmation Modal                                     -->
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
          <div class="fixed inset-0 bg-black/50" @click="closeDeleteModal" />

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
                    O'quvchini o'chirish
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
