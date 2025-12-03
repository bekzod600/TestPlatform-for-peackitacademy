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

  const addUserGroup = async (newGroup) => {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .insert([newGroup])
        .select()
        .single()

      if (error) throw error
      
      userGroups.value.push(data)
      return data
    } catch (error) {
      console.error('Error adding user group:', error)
      return null
    }
  }

  const editUserGroup = async (id, updatedGroup) => {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .update(updatedGroup)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = userGroups.value.findIndex(g => g.id === id)
      if (index !== -1) {
        userGroups.value[index] = data
      }

      return data
    } catch (error) {
      console.error('Error editing user group:', error)
      return null
    }
  }

  const deleteUserGroup = async (id) => {
    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', id)

      if (error) throw error

      const index = userGroups.value.findIndex(g => g.id === id)
      if (index !== -1) {
        userGroups.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('Error deleting user group:', error)
      return false
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
  
  const assignTestToGroup = async (userGroupId, questionGroupId, startTime, endTime) => {
    try {
      const { error: groupError } = await supabase
        .from('user_groups')
        .update({ 
          assigned_question_group: questionGroupId,
          test_start_time: startTime,
          test_end_time: endTime
        })
        .eq('id', userGroupId)

      if (groupError) throw groupError

      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('assigned_user_group', userGroupId)
        .eq('role', 'student')

      if (studentsError) throw studentsError

      if (students && students.length > 0) {
        const updates = students.map(student => ({
          id: student.id,
          assigned_question_group: questionGroupId,
          test_started_at: null // Reset test vaqtini
        }))

        for (const update of updates) {
          await supabase
            .from('users')
            .update({ 
              assigned_question_group: update.assigned_question_group,
              test_started_at: update.test_started_at
            })
            .eq('id', update.id)
        }
      }

      await loadUserGroups()
      await loadUsers()

      return true
    } catch (error) {
      console.error('Error assigning test to group:', error)
      return false
    }
  }

  const checkTestAvailability = (userGroup) => {
    if (!userGroup || !userGroup.test_start_time || !userGroup.test_end_time) {
      return { available: false, reason: 'Test vaqti belgilanmagan' }
    }

    const now = new Date()
    const startTime = new Date(userGroup.test_start_time)
    const endTime = new Date(userGroup.test_end_time)

    if (now < startTime) {
      return { 
        available: false, 
        reason: 'Test hali boshlanmagan',
        startTime: startTime
      }
    }

    if (now > endTime) {
      return { 
        available: false, 
        reason: 'Test vaqti tugadi',
        endTime: endTime
      }
    }

    return { available: true }
  }

  const startTest = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ test_started_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      if (currentUser.value && currentUser.value.id === userId) {
        currentUser.value = data
        localStorage.setItem('currentUser', JSON.stringify(data))
      }

      return data
    } catch (error) {
      console.error('Error starting test:', error)
      return null
    }
  }

  const saveTestResult = async (userId, testResult) => {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('completed_tests')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      const completedTests = user.completed_tests || []
      completedTests.push(testResult)

      const { data, error } = await supabase
        .from('users')
        .update({ 
          completed_tests: completedTests,
          assigned_question_group: null,
          test_started_at: null // Reset test vaqti
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

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
    addUserGroup,
    editUserGroup,
    deleteUserGroup,
    login,
    logout,
    loadUserFromStorage,
    addUser,
    editUser,
    deleteUser,
    assignTestToGroup,
    checkTestAvailability,
    startTest,
    saveTestResult
  }
})