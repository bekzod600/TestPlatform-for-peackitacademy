<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref, computed, watch, useSlots } from 'vue'
import { cn } from '@/lib/utils'
import type { DataTableColumn } from '@/types'
import Table from '@/components/ui/table/Table.vue'
import TableHeader from '@/components/ui/table/TableHeader.vue'
import TableBody from '@/components/ui/table/TableBody.vue'
import TableRow from '@/components/ui/table/TableRow.vue'
import TableHead from '@/components/ui/table/TableHead.vue'
import TableCell from '@/components/ui/table/TableCell.vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'
import Select from '@/components/ui/select/Select.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import Skeleton from '@/components/ui/skeleton/Skeleton.vue'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from 'lucide-vue-next'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  pageSize?: number
  pageSizes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchable: false,
  searchPlaceholder: 'Qidirish...',
  selectable: false,
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100],
})

// ---------------------------------------------------------------------------
// Emits
// ---------------------------------------------------------------------------

const emit = defineEmits<{
  'row-click': [row: T, index: number]
  'selection-change': [selectedRows: T[]]
}>()

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

const slots = useSlots()

// ---------------------------------------------------------------------------
// Search state
// ---------------------------------------------------------------------------

const searchQuery = ref('')

// ---------------------------------------------------------------------------
// Sort state
// ---------------------------------------------------------------------------

const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

function handleSort(column: DataTableColumn<T>) {
  if (!column.sortable) return

  if (sortKey.value === column.key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortOrder.value = 'asc'
  }
}

function getSortIcon(column: DataTableColumn<T>) {
  if (!column.sortable) return null
  if (sortKey.value !== column.key) return ArrowUpDown
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown
}

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

const selectedRowIds = ref<Set<number>>(new Set())

const isAllSelected = computed(() => {
  if (paginatedData.value.length === 0) return false
  return paginatedData.value.every((_, index) => {
    const globalIndex = (currentPage.value - 1) * currentPageSize.value + index
    return selectedRowIds.value.has(globalIndex)
  })
})

const isIndeterminate = computed(() => {
  if (paginatedData.value.length === 0) return false
  const someSelected = paginatedData.value.some((_, index) => {
    const globalIndex = (currentPage.value - 1) * currentPageSize.value + index
    return selectedRowIds.value.has(globalIndex)
  })
  return someSelected && !isAllSelected.value
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    // Deselect all on current page
    paginatedData.value.forEach((_, index) => {
      const globalIndex = (currentPage.value - 1) * currentPageSize.value + index
      selectedRowIds.value.delete(globalIndex)
    })
  } else {
    // Select all on current page
    paginatedData.value.forEach((_, index) => {
      const globalIndex = (currentPage.value - 1) * currentPageSize.value + index
      selectedRowIds.value.add(globalIndex)
    })
  }
  emitSelectionChange()
}

function toggleRowSelection(globalIndex: number) {
  if (selectedRowIds.value.has(globalIndex)) {
    selectedRowIds.value.delete(globalIndex)
  } else {
    selectedRowIds.value.add(globalIndex)
  }
  emitSelectionChange()
}

function isRowSelected(localIndex: number): boolean {
  const globalIndex = (currentPage.value - 1) * currentPageSize.value + localIndex
  return selectedRowIds.value.has(globalIndex)
}

function emitSelectionChange() {
  const selected = filteredAndSortedData.value.filter((_, index) =>
    selectedRowIds.value.has(index),
  )
  emit('selection-change', selected)
}

// Clear selection when data or filters change
watch([() => props.data, searchQuery], () => {
  selectedRowIds.value.clear()
  emitSelectionChange()
})

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

const filteredAndSortedData = computed(() => {
  let result = [...props.data]

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter((row) => {
      return props.columns.some((col) => {
        const value = row[col.key]
        if (value == null) return false
        return String(value).toLowerCase().includes(query)
      })
    })
  }

  // Sort
  if (sortKey.value) {
    const key = sortKey.value
    const order = sortOrder.value
    result.sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return order === 'asc' ? -1 : 1
      if (bVal == null) return order === 'asc' ? 1 : -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (aStr < bStr) return order === 'asc' ? -1 : 1
      if (aStr > bStr) return order === 'asc' ? 1 : -1
      return 0
    })
  }

  return result
})

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const currentPage = ref(1)
const currentPageSize = ref(props.pageSize)

const totalItems = computed(() => filteredAndSortedData.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / currentPageSize.value)))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value
  const end = start + currentPageSize.value
  return filteredAndSortedData.value.slice(start, end)
})

const paginationRange = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value + 1
  const end = Math.min(currentPage.value * currentPageSize.value, totalItems.value)
  return { start, end }
})

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

function handlePageSizeChange(value: string) {
  currentPageSize.value = Number(value)
  currentPage.value = 1
}

// Reset to first page when search query or data changes
watch([searchQuery, () => props.data], () => {
  currentPage.value = 1
})

// ---------------------------------------------------------------------------
// Row click handler
// ---------------------------------------------------------------------------

function handleRowClick(row: T, localIndex: number) {
  const globalIndex = (currentPage.value - 1) * currentPageSize.value + localIndex
  emit('row-click', row, globalIndex)
}

// ---------------------------------------------------------------------------
// Cell value helpers
// ---------------------------------------------------------------------------

function getCellValue(row: T, column: DataTableColumn<T>): string {
  if (column.render) {
    return column.render(row)
  }
  const value = row[column.key]
  if (value == null) return ''
  return String(value)
}

function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    default:
      return 'text-left'
  }
}

// ---------------------------------------------------------------------------
// Check if an actions slot is provided
// ---------------------------------------------------------------------------

const hasActionsSlot = computed(() => !!slots.actions)

// Total column count (for skeleton/empty states)
const totalColumnCount = computed(() => {
  let count = props.columns.length
  if (props.selectable) count += 1
  if (hasActionsSlot.value) count += 1
  return count
})
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Toolbar: search + selection info -->
    <div
      v-if="searchable || (selectable && selectedRowIds.size > 0)"
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Search input -->
      <div v-if="searchable" class="relative max-w-sm flex-1">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          class="pl-9"
        />
      </div>

      <!-- Selection info -->
      <div
        v-if="selectable && selectedRowIds.size > 0"
        class="text-sm text-muted-foreground"
      >
        {{ selectedRowIds.size }} ta tanlangan
      </div>
    </div>

    <!-- Table container -->
    <div class="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <!-- Select all checkbox -->
            <TableHead
              v-if="selectable"
              class="w-12"
            >
              <div class="flex items-center justify-center">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  @change="toggleSelectAll"
                />
              </div>
            </TableHead>

            <!-- Column headers -->
            <TableHead
              v-for="column in columns"
              :key="column.key"
              :style="column.width ? { width: column.width } : undefined"
              :class="cn(
                getAlignClass(column.align),
                column.sortable && 'cursor-pointer select-none',
              )"
              @click="handleSort(column)"
            >
              <div
                :class="cn(
                  'flex items-center gap-1',
                  column.align === 'center' && 'justify-center',
                  column.align === 'right' && 'justify-end',
                )"
              >
                <span>{{ column.label }}</span>
                <component
                  :is="getSortIcon(column)"
                  v-if="column.sortable"
                  :class="cn(
                    'h-4 w-4 shrink-0',
                    sortKey === column.key
                      ? 'text-foreground'
                      : 'text-muted-foreground/50',
                  )"
                />
              </div>
            </TableHead>

            <!-- Actions column header -->
            <TableHead
              v-if="hasActionsSlot"
              class="w-20 text-right"
            >
              <span class="sr-only">Amallar</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <!-- Loading state -->
          <template v-if="loading">
            <TableRow
              v-for="rowIdx in currentPageSize"
              :key="`skeleton-${rowIdx}`"
              class="hover:bg-transparent"
            >
              <TableCell v-if="selectable">
                <div class="flex items-center justify-center">
                  <Skeleton class="h-4 w-4 rounded" />
                </div>
              </TableCell>
              <TableCell
                v-for="column in columns"
                :key="`skeleton-${rowIdx}-${column.key}`"
              >
                <Skeleton class="h-4 w-full max-w-[200px] rounded" />
              </TableCell>
              <TableCell v-if="hasActionsSlot">
                <div class="flex justify-end">
                  <Skeleton class="h-8 w-8 rounded" />
                </div>
              </TableCell>
            </TableRow>
          </template>

          <!-- Empty state -->
          <template v-else-if="paginatedData.length === 0">
            <TableRow class="hover:bg-transparent">
              <TableCell
                :colspan="totalColumnCount"
                class="h-40"
              >
                <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Inbox class="h-10 w-10 stroke-[1.5]" />
                  <p class="text-sm font-medium">
                    {{ searchQuery ? "Hech narsa topilmadi" : "Ma'lumot mavjud emas" }}
                  </p>
                  <p v-if="searchQuery" class="text-xs">
                    Qidiruv so'rovingizni o'zgartirib ko'ring
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <!-- Data rows -->
          <template v-else>
            <TableRow
              v-for="(row, localIndex) in paginatedData"
              :key="localIndex"
              :data-state="isRowSelected(localIndex) ? 'selected' : undefined"
              :class="cn(
                'cursor-pointer transition-colors',
                isRowSelected(localIndex) && 'bg-muted/50',
              )"
              @click="handleRowClick(row, localIndex)"
            >
              <!-- Row checkbox -->
              <TableCell
                v-if="selectable"
                @click.stop
              >
                <div class="flex items-center justify-center">
                  <input
                    type="checkbox"
                    :checked="isRowSelected(localIndex)"
                    class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    @change="toggleRowSelection((currentPage - 1) * currentPageSize + localIndex)"
                  />
                </div>
              </TableCell>

              <!-- Data cells -->
              <TableCell
                v-for="column in columns"
                :key="column.key"
                :class="getAlignClass(column.align)"
              >
                <!-- Named slot: #cell-[key] -->
                <slot
                  :name="`cell-${column.key}`"
                  :row="row"
                  :column="column"
                  :value="getCellValue(row, column)"
                  :index="(currentPage - 1) * currentPageSize + localIndex"
                >
                  {{ getCellValue(row, column) }}
                </slot>
              </TableCell>

              <!-- Actions cell -->
              <TableCell
                v-if="hasActionsSlot"
                class="text-right"
                @click.stop
              >
                <slot
                  name="actions"
                  :row="row"
                  :index="(currentPage - 1) * currentPageSize + localIndex"
                />
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="!loading && totalItems > 0"
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Page size selector + item count -->
      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <div class="flex items-center gap-2">
          <span class="whitespace-nowrap">Qatorlar soni:</span>
          <Select
            :model-value="String(currentPageSize)"
            @update:model-value="handlePageSizeChange"
          >
            <SelectTrigger class="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="size in pageSizes"
                :key="size"
                :value="String(size)"
              >
                {{ size }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span class="whitespace-nowrap">
          {{ paginationRange.start }}-{{ paginationRange.end }} / {{ totalItems }}
        </span>
      </div>

      <!-- Page navigation buttons -->
      <div class="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage <= 1"
          @click="goToPage(1)"
        >
          <ChevronsLeft class="h-4 w-4" />
          <span class="sr-only">Birinchi sahifa</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
          <span class="sr-only">Oldingi sahifa</span>
        </Button>

        <span class="px-2 text-sm text-muted-foreground">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="h-4 w-4" />
          <span class="sr-only">Keyingi sahifa</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage >= totalPages"
          @click="goToPage(totalPages)"
        >
          <ChevronsRight class="h-4 w-4" />
          <span class="sr-only">Oxirgi sahifa</span>
        </Button>
      </div>
    </div>
  </div>
</template>
