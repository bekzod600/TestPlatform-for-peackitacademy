<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
      <div class="mb-6">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Admin panelga xush kelibsiz!
        </h2>
        <p class="text-sm sm:text-base text-gray-600">
          Bu yerda siz tizimni boshqarishingiz mumkin.
        </p>
      </div>

      <!-- Stats Grid - Responsive -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <!-- Users Card -->
        <router-link to="/admin/users" class="block">
          <div class="bg-blue-50 hover:bg-blue-100 duration-200 cursor-pointer rounded-xl p-4 sm:p-6 border-0">
            <div class="flex items-center justify-between mb-3">
              <i class="mdi mdi-account-multiple text-blue-600 text-3xl sm:text-4xl"></i>
              <!-- <span v-if="totalUsers" class="text-2xl sm:text-3xl font-bold text-blue-700">
                {{ totalUsers }}
              </span>
              <div v-else class="h-8 w-12 bg-gray-200 rounded animate-pulse"></div> -->
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-blue-700 mb-1">
              Foydalanuvchilar
            </h3>
            <p class="text-xs sm:text-sm text-blue-700">
              {{ totalUsers }} ta foydalanuvchi
            </p>
          </div>
        </router-link>

        <!-- Questions Card -->
        <router-link to="/admin/questions" class="block">
          <div class="bg-green-50 hover:bg-green-100 duration-200 cursor-pointer rounded-xl p-4 sm:p-6 border-0">
            <div class="flex items-center justify-between mb-3">
              <i class="mdi mdi-help-circle text-green-600 text-3xl sm:text-4xl"></i>
              <!-- <span v-if="totalQuestions" class="text-2xl sm:text-3xl font-bold text-green-700">
                {{ totalQuestions }}
              </span>
              <div v-else class="h-8 w-12 bg-gray-200 rounded animate-pulse"></div> -->
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-green-700 mb-1">
              Savollar
            </h3>
            <p class="text-xs sm:text-sm text-green-700">
              {{ totalQuestions }} ta savol
            </p>
          </div>
        </router-link>

        <!-- Groups Card -->
        <router-link to="/admin/user-groups" class="block sm:col-span-2 lg:col-span-1">
          <div class="bg-orange-50 hover:bg-orange-100 duration-200 cursor-pointer rounded-xl p-4 sm:p-6 border-0">
            <div class="flex items-center justify-between mb-3">
              <i class="mdi mdi-account-group text-orange-600 text-3xl sm:text-4xl"></i>
              <!-- <span v-if="totalGroups" class="text-2xl sm:text-3xl font-bold text-orange-700">
                {{ totalGroups }}
              </span>
              <div v-else class="h-8 w-12 bg-gray-200 rounded animate-pulse"></div> -->
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-orange-700 mb-1">
              Guruhlar
            </h3>
            <p class="text-xs sm:text-sm text-orange-700">
              {{ totalGroups }} ta guruh
            </p>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Recent Activity Section - Responsive Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <!-- Recent Users -->
      <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          So'nggi foydalanuvchilar
        </h3>
        <div class="space-y-3 sm:space-y-4">
          <div 
            v-for="user in recentUsers" 
            :key="user.id"
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-gray-200 last:border-b-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <i class="mdi mdi-account text-blue-600 text-xl"></i>
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-700 text-sm sm:text-base truncate">{{ user.full_name }}</p>
                <p class="text-xs sm:text-sm text-gray-500 truncate">@{{ user.username }}</p>
              </div>
            </div>
            <span 
              :class="{
                'bg-red-100 text-red-700': user.role === 'admin',
                'bg-blue-100 text-blue-700': user.role === 'student'
              }"
              class="px-3 py-1 rounded-full text-xs font-medium w-fit"
            >
              {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
            </span>
          </div>
          
          <!-- Skeleton for loading state -->
          <div v-if="recentUsers.length === 0" class="space-y-3">
            <div v-for="i in 3" :key="i" class="flex justify-between items-center pb-3 border-b border-gray-200">
              <div class="flex items-center gap-3 flex-1">
                <div class="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div class="space-y-2 flex-1">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div class="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Questions -->
      <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          So'nggi savollar
        </h3>
        <div class="space-y-3 sm:space-y-4">
          <div 
            v-for="question in recentQuestions" 
            :key="question.id" 
            class="pb-3 border-b border-gray-200 last:border-b-0 last:pb-0"
          >
            <p class="font-medium text-gray-700 text-sm mb-1 line-clamp-2">{{ question.question }}</p>
            <p class="text-xs text-gray-500">ID: {{ question.id }}</p>
          </div>
          
          <!-- Skeleton for loading state -->
          <div v-if="recentQuestions.length === 0" class="space-y-3">
            <div v-for="i in 3" :key="i" class="pb-3 border-b border-gray-200">
              <div class="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div class="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import { useQuestionsStore } from '../stores/questions'

const usersStore = useUsersStore()
const questionsStore = useQuestionsStore()

const totalUsers = ref(0)
const totalQuestions = ref(0)
const totalGroups = ref(0)
const recentUsers = ref([])
const recentQuestions = ref([])

onMounted(async () => {
  await usersStore.loadUsers()
  await usersStore.loadUserGroups()
  await questionsStore.loadQuestions()
  await questionsStore.loadQuestionGroups()

  totalUsers.value = usersStore.users.length
  totalQuestions.value = questionsStore.questions.length
  totalGroups.value = usersStore.userGroups.length

  recentUsers.value = usersStore.users.slice(-3).reverse()
  recentQuestions.value = questionsStore.questions.slice(-3).reverse()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>