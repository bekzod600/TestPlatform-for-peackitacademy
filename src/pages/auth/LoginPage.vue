<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, Eye, EyeOff, LogIn, Loader2, Sun, Moon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { TEACHER_AND_ABOVE } from '@/lib/constants'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const isLoading = computed(() => authStore.isLoading)
const isFormValid = computed(() => username.value.trim() && password.value.trim())

async function handleLogin() {
  if (!isFormValid.value) return

  errorMessage.value = ''

  const result = await authStore.login(username.value.trim(), password.value)

  if (!result.success) {
    errorMessage.value = result.error ?? 'Login yoki parol noto\'g\'ri'
    return
  }

  // Rolga qarab yo'naltirish
  if (authStore.user && (TEACHER_AND_ABOVE as readonly string[]).includes(authStore.user.role)) {
    router.push('/admin')
  } else {
    router.push('/student/dashboard')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
    <!-- Theme toggle -->
    <button
      @click="themeStore.toggleTheme()"
      class="absolute top-4 right-4 z-10 inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
    >
      <Sun v-if="themeStore.isDark" class="w-5 h-5 text-muted-foreground" />
      <Moon v-else class="w-5 h-5 text-muted-foreground" />
    </button>

    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
    </div>

    <!-- Login Card -->
    <div class="relative w-full max-w-md mx-4 animate-fade-in">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <GraduationCap class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">Peackit Academy</h1>
        <p class="text-muted-foreground mt-1">Test platformasiga kirish</p>
      </div>

      <!-- Card -->
      <div class="bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm p-8">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in"
          >
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            {{ errorMessage }}
          </div>

          <!-- Username -->
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium text-foreground">
              Foydalanuvchi nomi
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="username kiriting"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
              :disabled="isLoading"
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-foreground">
              Parol
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="parolni kiriting"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                :disabled="isLoading"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!isFormValid || isLoading"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors shadow-sm"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <LogIn v-else class="w-4 h-4" />
            {{ isLoading ? 'Kirish...' : 'Kirish' }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-muted-foreground mt-6">
        &copy; {{ new Date().getFullYear() }} Peackit Academy. Barcha huquqlar himoyalangan.
      </p>
    </div>
  </div>
</template>
