// =============================================================
// PDF Export Composable (jsPDF + jspdf-autotable — lazy loaded)
// =============================================================

export interface PdfColumn<T = Record<string, unknown>> {
  key: string
  label: string
  transform?: (value: unknown, row: T) => string | number
}

/** Lazy-load jsPDF + autoTable only when needed. */
async function loadJsPDF() {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  return jsPDF
}

/**
 * Export data to .pdf file with a table and trigger download.
 */
export async function exportToPdf<T extends Record<string, unknown>>(
  data: T[],
  columns: PdfColumn<T>[],
  filename: string,
  title?: string,
): Promise<void> {
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ orientation: 'landscape' })

  if (title) {
    doc.setFontSize(14)
    doc.text(title, 14, 15)
  }

  const head = [columns.map((c) => c.label)]
  const body = data.map((row) =>
    columns.map((col) => {
      const raw = row[col.key]
      if (col.transform) return String(col.transform(raw, row))
      if (raw === null || raw === undefined) return ''
      return String(raw)
    }),
  )

  ;(doc as any).autoTable({
    head,
    body,
    startY: title ? 22 : 14,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  doc.save(`${filename}.pdf`)
}
