import { defineStore } from 'pinia'
import { ref } from 'vue'
import { queryDB, queryDBSingle, sql } from '../lib/neon'

export const useUsersStore = defineStore('users', () => {
  const currentUser = ref(null)
  const users = ref([])
  const userGroups = ref([])
  const testDuration = ref(0)

  const loadUsers = async () => {
    try {
      const { data, error } = await queryDB('SELECT * FROM users ORDER BY id ASC')
      
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
      const { data, error } = await queryDB('SELECT * FROM user_groups ORDER BY id ASC')
      
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
      const columns = Object.keys(newGroup).join(', ')
      const values = Object.values(newGroup)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const { data, error } = await queryDBSingle(
        `INSERT INTO user_groups (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      )

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
      const setClauses = Object.keys(updatedGroup).map((key, i) => `${key} = $${i + 1}`).join(', ')
      const values = Object.values(updatedGroup)
      
      const { data, error } = await queryDBSingle(
        `UPDATE user_groups SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      )

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
      const { error } = await queryDB('DELETE FROM user_groups WHERE id = $1', [id])

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
      const { data, error } = await queryDBSingle(
        'SELECT * FROM users WHERE username = $1 AND password = $2',
        [username, password]
      )

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
      const columns = Object.keys(newUser).join(', ')
      const values = Object.values(newUser)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const { data, error } = await queryDBSingle(
        `INSERT INTO users (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      )

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
      const setClauses = Object.keys(updatedUser).map((key, i) => `${key} = $${i + 1}`).join(', ')
      const values = Object.values(updatedUser)
      
      const { data, error } = await queryDBSingle(
        `UPDATE users SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      )

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
      const { error } = await queryDB('DELETE FROM users WHERE id = $1', [id])

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
      const { error: groupError } = await queryDB(
        `UPDATE user_groups 
         SET assigned_question_group = $1, test_start_time = $2, test_end_time = $3 
         WHERE id = $4`,
        [questionGroupId, startTime, endTime, userGroupId]
      )

      if (groupError) throw groupError

      const { data: students, error: studentsError } = await queryDB(
        'SELECT * FROM users WHERE assigned_user_group = $1 AND role = $2',
        [userGroupId, 'student']
      )

      if (studentsError) throw studentsError

      if (students && students.length > 0) {
        for (const student of students) {
          await queryDB(
            `UPDATE users 
             SET assigned_question_group = $1, test_started_at = NULL 
             WHERE id = $2`,
            [questionGroupId, student.id]
          )
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
      const { data, error } = await queryDBSingle(
        'UPDATE users SET test_started_at = $1 WHERE id = $2 RETURNING *',
        [new Date().toISOString(), userId]
      )

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
      const { data: user, error: fetchError } = await queryDBSingle(
        'SELECT completed_tests FROM users WHERE id = $1',
        [userId]
      )

      if (fetchError) throw fetchError

      const completedTests = user.completed_tests || []
      completedTests.push(testResult)

      const { data, error } = await queryDBSingle(
        `UPDATE users 
         SET completed_tests = $1, assigned_question_group = NULL, test_started_at = NULL 
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(completedTests), userId]
      )

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
