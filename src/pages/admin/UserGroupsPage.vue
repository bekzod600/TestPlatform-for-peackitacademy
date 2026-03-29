<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
} from 'lucide-vue-next'
import {
  fetchUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
} from '@/api/admin.api'
import type { UserGroup, UserGroupInsert } from '@/types'

const isLoading = ref(true)
const groups = ref<UserGroup[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const deletingId = ref<number | null>(null)
const isDeleting = ref(false)

const form = ref<UserGroupInsert>({
  name: '',
  description: '',
  is_active: true,
})

function resetForm() {
  form.value = { name: '', description: '', is_active: true }
  editingId.value = null
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(group: UserGroup) {
  editingId.value = group.id
  form.value = {
    name: group.name,
    description: group.description ?? '',
    is_active: group.is_active,
  }
  showForm.value = true
}

function confirmDelete(id: number) {
  deletingId.value = id
  showDeleteModal.value = true
}

async function loadGroups() {
  isLoading.value = true
  try {
    const result = await fetchUserGroups()
    if (result.success && result.data) {
      groups.value = result.data
    }
  } catch (err) {
    console.error('Error loading groups:', err)
  } finally {
    isLoading.value = false
  }
}

async function saveGroup() {
  if (!form.value.name.trim()) return
  isSaving.value = true
  try {
    if (editingId.value) {
      await updateUserGroup(editingId.value, form.value)
    } else {
      await createUserGroup(form.value)
    }
    showForm.value = false
    resetForm()
    await loadGroups()
  } catch (err) {
    console.error('Error saving group:', err)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  isDeleting.value = true
  try {
    await deleteUserGroup(deletingId.value)
    showDeleteModal.value = false
    deletingId.value = null
    await loadGroups()
  } catch (err) {
    console.error('Error deleting group:', err)
  } finally {
    isDeleting.value = false
  }
}

import { computed } from 'vue'

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return groups.value
  const q = searchQuery.value.toLowerCase()
  return groups.value.filter(g =>
    g.name.toLowerCase().includes(q) ||
    g.description?.toLowerCase().includes(q)
  )
})

onMounted(loadGroups)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-foreground">Guruhlar</h2>
        <p class="text-sm text-muted-foreground">Foydalanuvchi guruhlarini boshqarish</p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
      >
        <Plus class="w-4 h-4" />
        Qo'shish
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Qidirish..."
        class="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 bg-muted animate-pulse rounded-xl" />
    </div>

    <!-- Groups List -->
    <div v-else class="space-y-3">
      <div v-if="!filtered.length" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <UsersRound class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Guruhlar yo'q</h3>
        <p class="text-sm text-muted-foreground mt-1">Yangi guruh qo'shing</p>
      </div>

      <div
        v-for="group in filtered"
        :key="group.id"
        class="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <UsersRound class="w-5 h-5 text-primary" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ group.name }}</p>
            <p v-if="group.description" class="text-xs text-muted-foreground truncate">{{ group.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              group.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
            ]"
          >
            {{ group.is_active ? 'Faol' : 'Nofaol' }}
          </span>
          <button
            @click="openEdit(group)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            @click="confirmDelete(group.id)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Slide-over Form -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="showForm" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showForm = false" />
          <div class="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 class="text-lg font-semibold text-foreground">
                {{ editingId ? 'Guruhni tahrirlash' : 'Yangi guruh' }}
              </h3>
              <button @click="showForm = false" class="text-muted-foreground hover:text-foreground">
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="saveGroup" class="flex-1 overflow-y-auto p-6 space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Nomi</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="Guruh nomi"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Tavsif</label>
                <textarea
                  v-model="form.description"
                  placeholder="Guruh tavsifi"
                  rows="3"
                  class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  id="is_active"
                  class="h-4 w-4 rounded border border-input accent-primary"
                />
                <label for="is_active" class="text-sm font-medium text-foreground">Faol</label>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                @click="showForm = false"
                class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Bekor qilish
              </button>
              <button
                @click="saveGroup"
                :disabled="isSaving || !form.name.trim()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
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
            <h3 class="text-lg font-semibold text-foreground mb-2">Guruhni o'chirish</h3>
            <p class="text-sm text-muted-foreground mb-4">Bu amalni qaytarib bo'lmaydi. Davom etasizmi?</p>
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
