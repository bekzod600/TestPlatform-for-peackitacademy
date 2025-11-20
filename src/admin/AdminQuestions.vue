<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-gray-800">Savollarni boshqarish</h2>
      <button
        @click="showForm = !showForm"
        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        {{ showForm ? 'Bekor qilish' : 'Yangi savol qo\'shish' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
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
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Savol yozing"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategoriya
            </label>
            <CategorySelect v-model="form.categoryId" :categories="categories" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Savol guruhi
            </label>
            <QuestionGroupSelect v-model="form.groupId" :groups="questionGroups" />
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option v-for="(answer, index) in form.answers" :key="index" :value="index">
              {{ index + 1 }}-variantI ({{ answer }})
            </option>
          </select>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Bekor qilish
          </button>
        </div>
      </form>
    </div>

    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Savol
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Kategoriya
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Guruhi
            </th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              Amallar
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="question in questions" :key="question.id" class="border-t border-gray-200 hover:bg-gray-50">
            <td class="px-6 py-3 text-gray-700">
              {{ question.question }}
            </td>
            <td class="px-6 py-3 text-gray-600">
              {{ getCategoryName(question.categoryId) }}
            </td>
            <td class="px-6 py-3 text-gray-600">
              {{ getGroupName(question.groupId) }}
            </td>
            <td class="px-6 py-3 text-center space-x-2">
              <button
                @click="editQuestion(question)"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
              >
                Tahrirlash
              </button>
              <button
                @click="deleteQuestion(question.id)"
                class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
              >
                O'chirish
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuestionsStore } from '../stores/questions'
import CategorySelect from './components/CategorySelect.vue'
import QuestionGroupSelect from './components/QuestionGroupSelect.vue'

const questionsStore = useQuestionsStore()
const questions = ref([])
const categories = ref([])
const questionGroups = ref([])
const showForm = ref(false)
const editingId = ref(null)

const form = ref({
  question: '',
  answers: ['', '', '', ''],
  correct: 0,
  categoryId: null,
  groupId: null
})

onMounted(async () => {
  await questionsStore.loadQuestions()
  await questionsStore.loadCategories()
  await questionsStore.loadQuestionGroups()
  questions.value = questionsStore.questions
  categories.value = questionsStore.categories
  questionGroups.value = questionsStore.questionGroups
})

const getCategoryName = (id) => {
  return categories.value.find(c => c.id === id)?.name || 'Noma\'lum'
}

const getGroupName = (id) => {
  return questionGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const saveQuestion = async () => {
  if (!form.value.question || !form.value.categoryId || !form.value.groupId) {
    alert('Barcha maydonlarni to\'ldiring!')
    return
  }

  if (editingId.value) {
    await questionsStore.editQuestion(editingId.value, {
      question: form.value.question,
      answers: form.value.answers,
      correct: +form.value.correct,
      categoryId: +form.value.categoryId,
      groupId: +form.value.groupId
    })
    alert('Savol tahrirlandi')
  } else {
    await questionsStore.addQuestion({
      question: form.value.question,
      answers: form.value.answers,
      correct: +form.value.correct,
      categoryId: +form.value.categoryId,
      groupId: +form.value.groupId
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
    categoryId: question.categoryId,
    groupId: question.groupId
  }
  showForm.value = true
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
    categoryId: null,
    groupId: null
  }
  showForm.value = false
}
</script>
