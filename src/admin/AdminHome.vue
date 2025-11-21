<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h2 class="text-3xl font-bold text-gray-800 mb-4">
        Admin panelga xush kelibsiz!
      </h2>
      <p class="text-gray-600 mb-6">
        Bu yerda siz tizimni boshqarishingiz mumkin.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <router-link to="/admin/users" 
            class="bg-blue-50 duration-200 hover:bg-blue-100 rounded-lg p-6 cursor-pointer">
            <h3 class="text-lg font-semibold text-blue-900 mb-2">
              Foydalanuvchilar
            </h3>
            <p class="text-blue-700 mb-3 flex items-center gap-1">
              <span v-if='totalUsers'>
                {{ totalUsers }}
              </span>
              <span v-else>
                <BaseSkeleton class="h-5 w-10" />
              </span>
              <span> ta foydalanuvchi</span>
            </p>
          </router-link>


        <router-link to="/admin/questions"
          class="bg-green-50 duration-200 hover:bg-green-100 rounded-lg p-6 cursor-pointer">
          <h3 class="text-lg font-semibold text-green-900 mb-2">
            Savollar
          </h3>
          <p class="text-green-700 mb-3 flex items-center gap-1">
              <span v-if='totalUsers'>
                {{ totalQuestions }}
              </span>
              <span v-else>
                <BaseSkeleton class="h-5 w-10" />
              </span>
              <span> ta savol</span>
            </p>
        </router-link>

        <div class="bg-orange-50 rounded-lg p-6 hover:bg-orange-100 duration-200 cursor-pointer">
          <h3 class="text-lg font-semibold text-orange-900 mb-2">
            Guruhlar
          </h3>
          <p class="text-orange-700 mb-3 flex items-center gap-1">
              <span v-if='totalUsers'>
                {{ totalGroups }}
              </span>
              <span v-else>
                <BaseSkeleton class="h-5 w-10" />
              </span>
              <span> ta guruh</span>
            </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          So'nggi foydalanuvchilar
        </h3>
        <div class="space-y-3">
          <div v-for="user in recentUsers" :key="user.id"
            class="flex justify-between items-center pb-3 border-b border-gray-200">
            <div>
              <p class="font-medium text-gray-700">{{ user.full_name }}</p>
              <p class="text-sm text-gray-500">@{{ user.username }}</p>
            </div>
            <span class="text-xs px-2 py-1 rounded-full" :class="{
              'bg-red-100 text-red-700': user.role === 'admin',
              'bg-blue-100 text-blue-700': user.role === 'student'
            }">
              {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          So'nggi savollar
        </h3>
        <div class="space-y-3">
          <div v-for="question in recentQuestions" :key="question.id" class="pb-3 border-b border-gray-200">
            <p class="font-medium text-gray-700 text-sm">{{ question.question }}</p>
            <p class="text-xs text-gray-500 mt-1">ID: {{ question.id }}</p>
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
import CardSkeleton from '../components/ui/skeleton/CardSkeleton.vue'
import TextSkeleton from '../components/ui/skeleton/TextSkeleton.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'

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
