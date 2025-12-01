<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2">
        <i class="mdi mdi-help-circle text-blue-600 text-2xl sm:text-3xl lg:text-4xl"></i>
        <span>Savollarni boshqarish</span>
      </h2>
      <button
        @click="showForm = !showForm"
        class="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-medium whitespace-nowrap"
      >
        <i class="mdi" :class="showForm ? 'mdi-close' : 'mdi-plus'"></i>
        {{ showForm ? 'Bekor qilish' : 'Yangi savol' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h3 class="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
        {{ editingId ? 'Savolni tahrirlash' : 'Yangi savol qo\'shish' }}
      </h3>

      <form @submit.prevent="saveQuestion" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Savol matni
          </label>
          <input
            v-model="form.question"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
            placeholder="Savol yozing"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategoriya
            </label>
            <CategorySelect v-model="form.category_id" :categories="categories" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Savol guruhi
            </label>
            <QuestionGroupSelect v-model="form.group_id" :groups="questionGroups" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Javob variantlari
          </label>
          <div class="space-y-2">
            <input
              v-for="(answer, index) in form.answers"
              :key="index"
              v-model="form.answers[index]"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
              :placeholder="`Javob ${index + 1}`"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            To'g'ri javob
          </label>
          <select
            v-model="form.correct"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
          >
            <option v-for="(answer, index) in form.answers" :key="index" :value="index">
              {{ index + 1 }}-variant ({{ answer }})
            </option>
          </select>
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            class="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
          >
            {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="bg-gray-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-600 transition text-sm sm:text-base"
          >
            Bekor qilish
          </button>
        </div>
      </form>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <!-- Search -->
        <div class="relative sm:col-span-2 lg:col-span-1">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Savol qidirish..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
          />
        </div>

        <!-- Category Filter -->
        <select
          v-model="selectedCategory"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
        >
          <option value="all">Barcha kategoriyalar</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- Group Filter -->
        <select
          v-model="selectedGroup"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
        >
          <option value="all">Barcha guruhlar</option>
          <option v-for="group in questionGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>

      <!-- Table - Responsive -->
      <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full min-w-fit">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                Savol
              </th>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">
                Kategoriya
              </th>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">
                Guruhi
              </th>
              <th class="px-4 sm:px-6 py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in filteredQuestions" :key="question.id" class="border-t border-gray-200 hover:bg-gray-50">
              <td class="px-4 sm:px-6 py-3 text-gray-700 text-xs sm:text-sm">
                <p class="line-clamp-2">{{ question.question }}</p>
                <!-- Mobile: Show category and group -->
                <div class="flex flex-wrap gap-2 mt-2 md:hidden">
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {{ getCategoryName(question.category_id) }}
                  </span>
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {{ getGroupName(question.group_id) }}
                  </span>
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3 text-gray-600 text-xs sm:text-sm hidden md:table-cell">
                {{ getCategoryName(question.category_id) }}
              </td>
              <td class="px-4 sm:px-6 py-3 text-gray-600 text-xs sm:text-sm hidden lg:table-cell">
                {{ getGroupName(question.group_id) }}
              </td>
              <td class="px-4 sm:px-6 py-3 text-center">
                <div class="flex flex-col sm:flex-row justify-center gap-2">
                  <button
                    @click="editQuestion(question)"
                    class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    Tahrirlash
                  </button>
                  <button
                    @click="deleteQuestion(question.id)"
                    class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition whitespace-nowrap"
                  >
                    O'chirish
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- No Results -->
      <div v-if="filteredQuestions.length === 0" class="text-center py-8">
        <i class="mdi mdi-help-circle-outline text-5xl text-gray-300 mb-2"></i>
        <p class="text-gray-500 text-sm sm:text-base">Hech narsa topilmadi</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionsStore } from '../stores/questions'
import CategorySelect from './components/CategorySelect.vue'
import QuestionGroupSelect from './components/QuestionGroupSelect.vue'

const questionsStore = useQuestionsStore()
const questions = ref([])
const categories = ref([])
const questionGroups = ref([])
const showForm = ref(false)
const editingId = ref(null)

// Filter states
const searchTerm = ref('')
const selectedCategory = ref('all')
const selectedGroup = ref('all')

const form = ref({
  question: '',
  answers: ['', '', '', ''],
  correct: 0,
  category_id: null,
  group_id: null
})

onMounted(async () => {
  await questionsStore.loadQuestions()
  await questionsStore.loadCategories()
  await questionsStore.loadQuestionGroups()
  questions.value = questionsStore.questions
  categories.value = questionsStore.categories
  questionGroups.value = questionsStore.questionGroups
})

const filteredQuestions = computed(() => {
  let filtered = questions.value

  // Search by question text
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(q => 
      q.question.toLowerCase().includes(search)
    )
  }

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(q => q.category_id === parseInt(selectedCategory.value))
  }

  // Filter by group
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter(q => q.group_id === parseInt(selectedGroup.value))
  }

  return filtered
})

const getCategoryName = (id) => {
  return categories.value.find(c => c.id === id)?.name || 'Noma\'lum'
}

const getGroupName = (id) => {
  return questionGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const saveQuestion = async () => {
  if (!form.value.question || !form.value.category_id || !form.value.group_id) {
    alert('Barcha maydonlarni to\'ldiring!')
    return
  }

  if (editingId.value) {
    await questionsStore.editQuestion(editingId.value, {
      question: form.value.question,
      answers: form.value.answers,
      correct: +form.value.correct,
      category_id: +form.value.category_id,
      group_id: +form.value.group_id
    })
    alert('Savol tahrirlandi')
  } else {
    await questionsStore.addQuestion({
      question: form.value.question,
      answers: form.value.answers,
      correct: +form.value.correct,
      category_id: +form.value.category_id,
      group_id: +form.value.group_id
    })
    alert('Savol qo\'shildi')
  }

  questions.value = questionsStore.questions
  resetForm()
}

const editQuestion = (question) => {
  editingId.value = question.id
  form.value = {
    question: question.question,
    answers: [...question.answers],
    correct: question.correct,
    category_id: question.category_id,
    group_id: question.group_id
  }
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteQuestion = async (id) => {
  if (confirm('Rostdan o\'chirmoqchisiz?')) {
    await questionsStore.deleteQuestion(id)
    questions.value = questionsStore.questions
    alert('Savol o\'chirildi')
  }
}

const resetForm = () => {
  editingId.value = null
  form.value = {
    question: '',
    answers: ['', '', '', ''],
    correct: 0,
    category_id: null,
    group_id: null
  }
  showForm.value = false
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>