import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUsersStore = defineStore('users', () => {
  const currentUser = ref(null)
  const users = ref([])
  const userGroups = ref([])

  const loadUsers = async () => {
    try {
      const response = await fetch('/users.json')
      const data = await response.json()
      users.value = data
      return data
    } catch (error) {
      console.error('Error loading users:', error)
      return []
    }
  }

  const loadUserGroups = async () => {
    try {
      const response = await fetch('/user_groups.json')
      const data = await response.json()
      userGroups.value = data
      return data
    } catch (error) {
      console.error('Error loading user groups:', error)
      return []
    }
  }

  const login = async (username, password) => {
    try {
      const data = await loadUsers()
      const user = data.find(
        u => u.username === username && u.password === password
      )

      if (user) {
        currentUser.value = user
        localStorage.setItem('currentUser', JSON.stringify(user))
        return user
      }

      return null
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
      const maxId = users.value.length > 0 ? Math.max(...users.value.map(u => u.id)) : 0
      const userToAdd = {
        id: maxId + 1,
        ...newUser
      }
      users.value.push(userToAdd)
      await saveUsers()
      return userToAdd
    } catch (error) {
      console.error('Error adding user:', error)
      return null
    }
  }

  const editUser = async (id, updatedUser) => {
    try {
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updatedUser }
        await saveUsers()
        return users.value[index]
      }
      return null
    } catch (error) {
      console.error('Error editing user:', error)
      return null
    }
  }

  const deleteUser = async (id) => {
    try {
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value.splice(index, 1)
        await saveUsers()
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  const saveUsers = async () => {
    console.log('Saving users:', users.value)
    return true
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
    saveUsers
  }
})
