import { ref, computed } from 'vue'

/**
 * Composable for managing bulk selection of entities in admin tables.
 *
 * Tracks selection by entity `id` (not array index), so selections
 * persist across server-side pagination.
 *
 * @example
 * ```ts
 * const { selectedIds, toggleItem, toggleAll, deselectAll, isSelected, hasSelection } = useBulkSelection<User>()
 * ```
 */
export function useBulkSelection<T extends { id: number }>() {
  const selectedIds = ref<Set<number>>(new Set())

  const selectedCount = computed<number>(() => selectedIds.value.size)

  const hasSelection = computed<boolean>(() => selectedIds.value.size > 0)

  function toggleItem(id: number): void {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
  }

  function toggleAll(items: T[]): void {
    const allSelected = items.length > 0 && items.every((item) => selectedIds.value.has(item.id))
    const next = new Set(selectedIds.value)

    if (allSelected) {
      for (const item of items) {
        next.delete(item.id)
      }
    } else {
      for (const item of items) {
        next.add(item.id)
      }
    }

    selectedIds.value = next
  }

  function selectAll(items: T[]): void {
    const next = new Set(selectedIds.value)
    for (const item of items) {
      next.add(item.id)
    }
    selectedIds.value = next
  }

  function deselectAll(): void {
    selectedIds.value = new Set()
  }

  function isSelected(id: number): boolean {
    return selectedIds.value.has(id)
  }

  function isAllSelected(items: T[]): boolean {
    return items.length > 0 && items.every((item) => selectedIds.value.has(item.id))
  }

  function isIndeterminate(items: T[]): boolean {
    const some = items.some((item) => selectedIds.value.has(item.id))
    const all = items.every((item) => selectedIds.value.has(item.id))
    return some && !all
  }

  function getSelectedItems(items: T[]): T[] {
    return items.filter((item) => selectedIds.value.has(item.id))
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    toggleItem,
    toggleAll,
    selectAll,
    deselectAll,
    isSelected,
    isAllSelected,
    isIndeterminate,
    getSelectedItems,
  }
}
