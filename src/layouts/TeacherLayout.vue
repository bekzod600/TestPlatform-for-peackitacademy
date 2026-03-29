<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  FileQuestion,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  GraduationCap,
  Sun,
  Moon,
  UsersRound,
  CalendarCheck,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

const navItems = [
  { path: '/teacher', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/teacher/groups', label: 'Guruhlarim', icon: UsersRound },
  { path: '/teacher/assignments', label: 'Test biriktirish', icon: CalendarCheck },
  { path: '/teacher/tests', label: 'Testlar', icon: ClipboardList },
  { path: '/teacher/questions', label: 'Savollar', icon: FileQuestion },
  { path: '/teacher/results', label: 'Natijalar', icon: BarChart3 },
]

function isActive(item: typeof navItems[0]) {
  if (item.exact) return route.path === item.path
  return route.path.startsWith(item.path)
}

function navigate(path: string) {
  router.push(path)
  sidebarOpen.value = false
}

function logout() {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-[100svh] bg-background">
    <!-- Mobile overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
        'w-64'
      ]"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/10 shrink-0">
          <GraduationCap class="w-5 h-5 text-sidebar-primary" />
        </div>
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <span v-if="!sidebarCollapsed" class="font-semibold text-sidebar-foreground whitespace-nowrap">
            O'qituvchi Panel
          </span>
        </Transition>
        <!-- Close button (mobile) -->
        <button
          class="ml-auto lg:hidden text-sidebar-foreground hover:text-sidebar-primary"
          @click="sidebarOpen = false"
        >
          <X class="w-5 h-5" />
        </button>
        <!-- Collapse button (desktop) -->
        <button
          class="ml-auto hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent transition-colors"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <ChevronLeft :class="['w-4 h-4 text-sidebar-foreground transition-transform', sidebarCollapsed && 'rotate-180']" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigate(item.path)"
          :class="[
            'flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-colors',
            sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
            isActive(item)
              ? 'bg-sidebar-primary/10 text-sidebar-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          ]"
          :title="sidebarCollapsed ? item.label : undefined"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" />
          <span v-if="!sidebarCollapsed" class="whitespace-nowrap">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Logout -->
      <div class="border-t border-sidebar-border p-2">
        <button
          @click="logout"
          :class="[
            'flex items-center gap-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors',
            sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          ]"
          :title="sidebarCollapsed ? 'Chiqish' : undefined"
        >
          <LogOut class="w-5 h-5 shrink-0" />
          <span v-if="!sidebarCollapsed">Chiqish</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div :class="['transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64']">
      <!-- Top Header -->
      <header class="sticky top-0 z-30 flex items-center gap-4 h-16 px-4 lg:px-6 bg-background/80 backdrop-blur-md border-b border-border">
        <!-- Mobile menu button -->
        <button
          class="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
          @click="sidebarOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>

        <!-- Page title from route -->
        <h1 class="text-lg font-semibold text-foreground">
          {{ route.meta.title || 'Dashboard' }}
        </h1>

        <div class="ml-auto flex items-center gap-2">
          <!-- Theme toggle -->
          <button
            @click="themeStore.toggleTheme()"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
          >
            <Sun v-if="themeStore.isDark" class="w-5 h-5 text-muted-foreground" />
            <Moon v-else class="w-5 h-5 text-muted-foreground" />
          </button>

          <!-- User info -->
          <div class="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
              {{ authStore.user?.full_name?.charAt(0)?.toUpperCase() || 'T' }}
            </div>
            <span class="text-sm font-medium text-foreground">
              {{ authStore.user?.full_name || 'Teacher' }}
            </span>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
