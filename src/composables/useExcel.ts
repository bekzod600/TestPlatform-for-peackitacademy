// =============================================================
// Excel Import / Export Composable (SheetJS — lazy loaded)
// =============================================================

export interface ExcelColumn<T = Record<string, unknown>> {
  key: string
  label: string
  transform?: (value: unknown, row: T) => string | number
}

/** Lazy-load xlsx only when needed to reduce initial bundle size. */
async function loadXLSX() {
  return await import('xlsx')
}

/**
 * Export data to .xlsx file and trigger download.
 */
export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn<T>[],
  filename: string,
): Promise<void> {
  const XLSX = await loadXLSX()

  const header = columns.map((c) => c.label)
  const rows = data.map((row) =>
    columns.map((col) => {
      const raw = row[col.key]
      if (col.transform) return col.transform(raw, row)
      if (raw === null || raw === undefined) return ''
      return raw
    }),
  )

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

  // Auto-fit column widths
  ws['!cols'] = columns.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...rows.map((r) => String(r[columns.indexOf(col)] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Parse an uploaded Excel file and return an array of objects
 * mapped by column headers.
 */
export async function importFromExcel<T = Record<string, unknown>>(
  file: File,
): Promise<T[]> {
  const XLSX = await loadXLSX()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        if (!sheetName) {
          resolve([])
          return
        }
        const ws = wb.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<T>(ws)
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsArrayBuffer(file)
  })
}
