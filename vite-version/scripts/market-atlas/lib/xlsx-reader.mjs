// Adapter boundary: this is the only file that knows the actor/provider data lives in local
// xlsx workbooks. Swapping in a hosted Google Sheet/SharePoint source later means replacing
// only this file's `readWorkbookSheets` implementation.
//
// Uses ExcelJS's streaming reader rather than `workbook.xlsx.readFile` because at least one of
// the source workbooks defines Excel Tables (structured "ListObjects", used for its Directory_View
// sheet) whose XML trips a bug in ExcelJS's full-model table parser (`worksheet.js` crashes with
// "Cannot read properties of undefined (reading 'name')" trying to key tables by name). The
// streaming reader never touches that codepath — it only reads rows — which is all this pipeline
// needs anyway.
import ExcelJS from "exceljs"
import unzipper from "unzipper"

// ExcelJS's streaming reader identifies a worksheet's real name by matching
// `xl/_rels/workbook.xml.rels` relationship targets against the literal string
// `worksheets/sheet${sheetNo}.xml`. At least one source workbook was written by a tool that
// emits absolute-style targets (`/xl/worksheets/sheet1.xml`), which never matches, so ExcelJS
// silently falls back to a `Sheet${id}` placeholder name. `getSheetNameOrder` reads the sheet
// order directly from `xl/workbook.xml` so we can recover the real names positionally.
async function getSheetNameOrder(filePath) {
  const directory = await unzipper.Open.file(filePath)
  const workbookEntry = directory.files.find((file) => file.path === "xl/workbook.xml")
  if (!workbookEntry) return []

  const xml = (await workbookEntry.buffer()).toString("utf8")
  return [...xml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((match) =>
    match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&apos;/g, "'")
  )
}

export async function readWorkbookSheets(filePath) {
  const sheetNameOrder = await getSheetNameOrder(filePath)

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    entries: "emit",
    worksheets: "emit",
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "ignore",
  })

  const sheets = {}
  for await (const worksheetReader of workbookReader) {
    const fallbackMatch = /^Sheet(\d+)$/.exec(worksheetReader.name)
    const realName = fallbackMatch ? sheetNameOrder[Number(fallbackMatch[1]) - 1] : null
    const sheetName = realName ?? worksheetReader.name

    const headers = []
    const rows = []
    let rowIndex = 0

    for await (const row of worksheetReader) {
      rowIndex += 1
      if (rowIndex === 1) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber] = cell.value == null ? null : String(cellValue(cell)).trim()
        })
        continue
      }

      const record = {}
      let hasValue = false
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber]
        if (!header) return
        const value = cellValue(cell)
        if (value !== null && value !== "") hasValue = true
        record[header] = value
      })
      if (hasValue) rows.push(record)
    }

    sheets[sheetName] = rows
  }

  return sheets
}

function cellValue(cell) {
  const raw = cell.value
  if (raw == null) return null
  if (typeof raw === "object") {
    if (raw instanceof Date) return raw.toISOString().slice(0, 10)
    if ("result" in raw) return cellPrimitive(raw.result)
    if ("text" in raw) return String(raw.text).trim()
    if ("richText" in raw) return raw.richText.map((part) => part.text).join("").trim()
    if ("hyperlink" in raw) return cellPrimitive(raw.text ?? raw.hyperlink)
    return cellPrimitive(raw)
  }
  return cellPrimitive(raw)
}

function cellPrimitive(value) {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "string") return value.trim()
  return value
}
