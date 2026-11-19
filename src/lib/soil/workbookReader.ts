import ExcelJS from 'exceljs'
import type { SoilCellPrimitive, SoilSheetGrid } from './importPreview'

type ExcelCellValue = ExcelJS.CellValue

function toPrimitive(value: ExcelCellValue): SoilCellPrimitive {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('error' in value && value.error) return String(value.error)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((fragment) => fragment.text).join('')
    }
    if ('result' in value) return toPrimitive(value.result as ExcelCellValue)
    if ('formula' in value || 'sharedFormula' in value) return null
    if ('text' in value && typeof value.text === 'string') return value.text
  }
  return null
}

/** Lee todas las pestañas a una grilla fila → columna → valor (resultado cacheado de las fórmulas). */
export async function readSoilWorkbook(fileBytes: ArrayBuffer | Buffer): Promise<SoilSheetGrid[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBytes as ArrayBuffer)

  return workbook.worksheets.map((worksheet) => {
    const rows = new Map<number, Map<string, SoilCellPrimitive>>()
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells = new Map<string, SoilCellPrimitive>()
      row.eachCell({ includeEmpty: false }, (cell) => {
        const primitive = toPrimitive(cell.value)
        if (primitive !== null && primitive !== '') {
          cells.set(cell.address.replace(/\d+$/, ''), primitive)
        }
      })
      if (cells.size > 0) rows.set(rowNumber, cells)
    })
    return { name: worksheet.name, rows }
  })
}
