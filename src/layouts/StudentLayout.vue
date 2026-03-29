<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const mobileMenuOpen = ref(false)

const navItems = [
  { path: '/student/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
  { path: '/student/test', label: 'Test', icon: ClipboardList },
  { path: '/student/results', label: 'Natijalar', icon: BarChart3 },
]

function isActive(path: string) {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
  mobileMenuOpen.value = false
}

function logout() {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Top Navbar -->
    <header class="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div class="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <GraduationCap class="w-5 h-5 text-primary" />
          </div>
          <span class="font-semibold text-foreground hidden sm:block">Peackit Academy</span>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigate(item.path)"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </button>
        </nav>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          <!-- Theme toggle -->
          <button
            @click="themeStore.toggleTheme()"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
          >
            <Sun v-if="themeStore.isDark" class="w-5 h-5 text-muted-foreground" />
            <Moon v-else class="w-5 h-5 text-muted-foreground" />
          </button>

          <!-- User avatar -->
          <div class="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {{ authStore.user?.full_name?.charAt(0)?.toUpperCase() || 'S' }}
            </div>
            <span class="text-sm font-medium text-foreground">
              {{ authStore.user?.full_name || 'Student' }}
            </span>
          </div>

          <!-- Logout -->
          <button
            @click="logout"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Chiqish"
          >
            <LogOut class="w-4 h-4" />
          </button>

          <!-- Mobile menu -->
          <button
            class="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <X v-if="mobileMenuOpen" class="w-5 h-5" />
            <Menu v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile nav menu -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 -translate-y-2"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileMenuOpen" class="md:hidden border-t border-border bg-background px-4 py-2 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigate(item.path)"
            :class="[
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
            {{ item.label }}
          </button>
        </div>
      </Transition>
    </header>

    <!-- Page Content -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <RouterView />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border safe-area-bottom">
      <div class="flex items-center justify-around h-16">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigate(item.path)"
          :class="[
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-0',
            isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="text-[10px] font-medium truncate">{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
