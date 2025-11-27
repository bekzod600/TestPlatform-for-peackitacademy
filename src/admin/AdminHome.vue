<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <fwb-card class="p-8">
      <div class="mb-6">
        <h2 class="text-3xl font-bold text-gray-800 mb-2">
          Admin panelga xush kelibsiz!
        </h2>
        <p class="text-gray-600">
          Bu yerda siz tizimni boshqarishingiz mumkin.
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Users Card -->
        <router-link to="/admin/users">
          <fwb-card class="min-w-0 bg-blue-50 hover:bg-blue-100 duration-200 cursor-pointer border-0 p-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-2">
              Foydalanuvchilar
            </h3>
            <p class="text-blue-700 flex items-center gap-1">
              <span v-if="totalUsers">
                {{ totalUsers }}
              </span>
              <span v-else>
                <div class="h-5 w-10 bg-gray-200 rounded animate-pulse"></div>
              </span>
              <span>ta foydalanuvchi</span>
            </p>
          </fwb-card>
        </router-link>

        <!-- Questions Card -->
        <router-link to="/admin/questions">
          <fwb-card class="min-w-0 bg-green-50 hover:bg-green-100 duration-200 cursor-pointer border-0 p-6">
            <h3 class="text-lg font-semibold text-green-900 mb-2">
              Savollar
            </h3>
            <p class="text-green-700 flex items-center gap-1">
              <span v-if="totalQuestions">
                {{ totalQuestions }}
              </span>
              <span v-else>
                <div class="h-5 w-10 bg-gray-200 rounded animate-pulse"></div>
              </span>
              <span>ta savol</span>
            </p>
          </fwb-card>
        </router-link>

        <!-- Groups Card -->
        <fwb-card 
          class="min-w-0 bg-orange-50 hover:bg-orange-100 duration-200 cursor-pointer border-0 p-6"
          @click="$router.push('/admin/groups')"
        >
          <h3 class="text-lg font-semibold text-orange-900 mb-2">
            Guruhlar
          </h3>
          <p class="text-orange-700 flex items-center gap-1">
            <span v-if="totalGroups">
              {{ totalGroups }}
            </span>
            <span v-else>
              <div class="h-5 w-10 bg-gray-200 rounded animate-pulse"></div>
            </span>
            <span>ta guruh</span>
          </p>
        </fwb-card>
      </div>
    </fwb-card>

    <!-- Recent Activity Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Recent Users -->
      <fwb-card class="p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          So'nggi foydalanuvchilar
        </h3>
        <div class="space-y-4">
          <div 
            v-for="user in recentUsers" 
            :key="user.id"
            class="flex justify-between items-center pb-3 border-b border-gray-200 last:border-b-0 last:pb-0"
          >
            <div>
              <p class="font-medium text-gray-700">{{ user.full_name }}</p>
              <p class="text-sm text-gray-500">@{{ user.username }}</p>
            </div>
            <fwb-badge 
              :type="user.role === 'admin' ? 'red' : 'blue'"
              class="text-xs"
            >
              {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
            </fwb-badge>
          </div>
          
          <!-- Skeleton for loading state -->
          <div v-if="recentUsers.length === 0" class="space-y-3">
            <div v-for="i in 3" :key="i" class="flex justify-between items-center pb-3 border-b border-gray-200">
              <div class="space-y-2">
                <div class="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </fwb-card>

      <!-- Recent Questions -->
      <fwb-card class="p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          So'nggi savollar
        </h3>
        <div class="space-y-4">
          <div 
            v-for="question in recentQuestions" 
            :key="question.id" 
            class="pb-3 border-b border-gray-200 last:border-b-0 last:pb-0"
          >
            <p class="font-medium text-gray-700 text-sm mb-1">{{ question.question }}</p>
            <p class="text-xs text-gray-500">ID: {{ question.id }}</p>
          </div>
          
          <!-- Skeleton for loading state -->
          <div v-if="recentQuestions.length === 0" class="space-y-3">
            <div v-for="i in 3" :key="i" class="pb-3 border-b border-gray-200">
              <div class="h-4 w-full bg-gray-200 rounded animate-pulse mb-1"></div>
              <div class="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </fwb-card>
    </div>
  </div>
</template>

<script setup>
import { 
  FwbCard, 
  FwbBadge
} from 'flowbite-vue'
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