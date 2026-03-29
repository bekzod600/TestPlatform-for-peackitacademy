// =============================================================
// TestPlatform for Peackit Academy — Admin Users Store (Pinia)
// =============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  UserWithGroup,
  SafeUser,
  UserInsert,
  UserUpdate,
  UserListFilters,
  UserGroup,
  UserGroupInsert,
  UserGroupUpdate,
  PaginatedResponse,
} from '@/types'
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
  fetchUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
} from '@/api/admin.api'

export const useAdminUsersStore = defineStore('admin-users', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const users = ref<UserWithGroup[]>([])
  const userGroups = ref<UserGroup[]>([])
  const selectedUser = ref<SafeUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Pagination metadata from the last fetchUsers call. */
  const pagination = ref<PaginatedResponse<UserWithGroup>['pagination'] | null>(null)

  // ---------------------------------------------------------
  // User Actions
  // ---------------------------------------------------------

  /** Load paginated users with optional filters. */
  async function loadUsers(filters: UserListFilters = {}): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchUsers(filters)
      if (result.success) {
        users.value = result.data
        pagination.value = result.pagination
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load users'
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch a single user and set it as selectedUser. */
  async function selectUser(id: number): Promise<SafeUser | null> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchUserById(id)
      if (result.success && result.data) {
        selectedUser.value = result.data
        return result.data
      }
      error.value = result.error
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** Create a new user. Appends to local list on success. */
  async function addUser(
    payload: UserInsert,
  ): Promise<{ success: boolean; error: string | null; data: SafeUser | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await createUser(payload)
      if (result.success && result.data) {
        // Re-fetch the full list so we get the user_group relation populated
        await loadUsers()
        return { success: true, error: null, data: result.data }
      }
      error.value = result.error
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user'
      error.value = msg
      return { success: false, error: msg, data: null }
    } finally {
      isLoading.value = false
    }
  }

  /** Update an existing user. */
  async function editUser(
    id: number,
    payload: UserUpdate,
  ): Promise<{ success: boolean; error: string | null; data: SafeUser | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await updateUser(id, payload)
      if (result.success && result.data) {
        // Update the local list
        const index = users.value.findIndex((u) => u.id === id)
        if (index !== -1) {
          users.value[index] = {
            ...users.value[index],
            ...result.data,
          } as UserWithGroup
        }
        if (selectedUser.value?.id === id) {
          selectedUser.value = result.data
        }
        return { success: true, error: null, data: result.data }
      }
      error.value = result.error
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user'
      error.value = msg
      return { success: false, error: msg, data: null }
    } finally {
      isLoading.value = false
    }
  }

  /** Delete a user by id. */
  async function removeUser(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await deleteUser(id)
      if (result.success) {
        users.value = users.value.filter((u) => u.id !== id)
        if (selectedUser.value?.id === id) {
          selectedUser.value = null
        }
        return { success: true, error: null }
      }
      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------
  // User Group Actions
  // ---------------------------------------------------------

  /** Load all user groups. */
  async function loadUserGroups(): Promise<void> {
    try {
      const result = await fetchUserGroups()
      if (result.success && result.data) {
        userGroups.value = result.data
      }
    } catch (err) {
      console.error('Failed to load user groups:', err)
    }
  }

  /** Create a new user group. */
  async function addUserGroup(
    payload: UserGroupInsert,
  ): Promise<{ success: boolean; error: string | null; data: UserGroup | null }> {
    try {
      const result = await createUserGroup(payload)
      if (result.success && result.data) {
        userGroups.value.push(result.data)
        return { success: true, error: null, data: result.data }
      }
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user group'
      return { success: false, error: msg, data: null }
    }
  }

  /** Update a user group. */
  async function editUserGroup(
    id: number,
    payload: UserGroupUpdate,
  ): Promise<{ success: boolean; error: string | null; data: UserGroup | null }> {
    try {
      const result = await updateUserGroup(id, payload)
      if (result.success && result.data) {
        const index = userGroups.value.findIndex((g) => g.id === id)
        if (index !== -1) {
          userGroups.value[index] = result.data
        }
        return { success: true, error: null, data: result.data }
      }
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user group'
      return { success: false, error: msg, data: null }
    }
  }

  /** Delete a user group. */
  async function removeUserGroup(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await deleteUserGroup(id)
      if (result.success) {
        userGroups.value = userGroups.value.filter((g) => g.id !== id)
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user group'
      return { success: false, error: msg }
    }
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    users,
    userGroups,
    selectedUser,
    isLoading,
    error,
    pagination,

    // User Actions
    loadUsers,
    selectUser,
    addUser,
    editUser,
    removeUser,

    // User Group Actions
    loadUserGroups,
    addUserGroup,
    editUserGroup,
    removeUserGroup,
  }
})
