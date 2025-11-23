import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useUsersStore = defineStore('users', () => {
  const currentUser = ref(null)
  const users = ref([])
  const userGroups = ref([])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true })
      
      if (error) throw error
      users.value = data || []
      return data
    } catch (error) {
      console.error('Error loading users:', error)
      return []
    }
  }

  const loadUserGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .select('*')
        .order('id', { ascending: true })
      
      if (error) throw error
      userGroups.value = data || []
      return data
    } catch (error) {
      console.error('Error loading user groups:', error)
      return []
    }
  }

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (error || !data) return null

      currentUser.value = data
      localStorage.setItem('currentUser', JSON.stringify(data))
      return data
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }

  const logout = () => {
    currentUser.value = null
    localStorage.removeItem('currentUser')
  }

  const loadUserFromStorage = () => {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      currentUser.value = JSON.parse(stored)
    }
  }

  const addUser = async (newUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (error) throw error
      
      users.value.push(data)
      return data
    } catch (error) {
      console.error('Error adding user:', error)
      return null
    }
  }

  const editUser = async (id, updatedUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updatedUser)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = data
      }

      // Agar joriy foydalanuvchini tahrirlayotgan bo'lsak
      if (currentUser.value && currentUser.value.id === id) {
        currentUser.value = data
        localStorage.setItem('currentUser', JSON.stringify(data))
      }

      return data
    } catch (error) {
      console.error('Error editing user:', error)
      return null
    }
  }

  const deleteUser = async (id) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
  
// Guruhga test biriktirish va guruh ichidagi barcha studentlarga berish
  const assignTestToGroup = async (userGroupId, questionGroupId) => {
    try {
      // 1. User Group ga test biriktirish
      const { error: groupError } = await supabase
        .from('user_groups')
        .update({ assigned_question_group: questionGroupId })
        .eq('id', userGroupId)

      if (groupError) throw groupError

      // 2. Guruh ichidagi barcha studentlarni topish
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('assigned_user_group', userGroupId)
        .eq('role', 'student')

      if (studentsError) throw studentsError

      // 3. Har bir studentga test biriktirish
      if (students && students.length > 0) {
        const updates = students.map(student => ({
          id: student.id,
          assigned_question_group: questionGroupId
        }))

        for (const update of updates) {
          await supabase
            .from('users')
            .update({ assigned_question_group: update.assigned_question_group })
            .eq('id', update.id)
        }
      }

      // User Groups ni qayta yuklash
      await loadUserGroups()
      await loadUsers()

      return true
    } catch (error) {
      console.error('Error assigning test to group:', error)
      return false
    }
  }

  // Test natijasini saqlash va assigned_question_group ni null qilish
  const saveTestResult = async (userId, testResult) => {
    try {
      // Foydalanuvchini olish
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('completed_tests')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      // Yangi test natijasini qo'shish
      const completedTests = user.completed_tests || []
      completedTests.push(testResult)

      // Foydalanuvchini yangilash
      const { data, error } = await supabase
        .from('users')
        .update({ 
          completed_tests: completedTests,
          assigned_question_group: null // Test topshirildi, guruhn null
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Joriy foydalanuvchini yangilash
      if (currentUser.value && currentUser.value.id === userId) {
        currentUser.value = data
        localStorage.setItem('currentUser', JSON.stringify(data))
      }

      return data
    } catch (error) {
      console.error('Error saving test result:', error)
      return null
    }
  }

  return {
    currentUser,
    users,
    userGroups,
    loadUsers,
    loadUserGroups,
    login,
    logout,
    loadUserFromStorage,
    addUser,
    editUser,
    deleteUser,
    assignTestToGroup,
    saveTestResult
  }
})