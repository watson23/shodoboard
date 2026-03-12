# File Import for Intake — Design

**Date:** 2026-03-12
**Status:** Approved

## Summary

Extend the intake backlog input to accept CSV, TSV, XLSX, XLS, and TXT files alongside the existing image uploads. Files are parsed client-side and their content is merged into the backlog text sent to the AI intake conversation. No API changes needed.

## Upload UX

Extend the existing upload button to accept all file types:
- Label: "Add photo, screenshot, or file (CSV, Excel, TSV, TXT)"
- Accept: `image/*,.csv,.tsv,.txt,.xlsx,.xls`

File previews in the same area as image thumbnails, rendered differently by type:
- **Images** — thumbnails (existing behavior, unchanged)
- **Data files** — chip/card with file icon, filename, and summary (e.g., "23 rows, 5 columns" for tabular, "15 lines" for text). X button to remove.

## Client-Side Parsing

**Library:** SheetJS (`xlsx` npm package) — handles xlsx, xls, csv, tsv. Dynamically imported so it only loads when a file is uploaded.

**Parsing by type:**
- `.csv` / `.tsv` — SheetJS or native delimiter split
- `.xlsx` / `.xls` — SheetJS reads first sheet, converts to rows
- `.txt` — `FileReader.readAsText()`

**Data model:**

```ts
interface FileData {
  name: string;           // original filename
  type: "tabular" | "text";
  content: string;        // full text representation
  preview: string;        // short summary for chip display
}
```

For tabular files, `content` is formatted as tab-separated text with headers. For text files, `content` is raw text.

**Size limit:** 500KB per file. Error toast if exceeded.

## Intake API Integration

No API changes. Parsed file content merged into the existing `backlog` field:

1. Textarea backlog text first
2. Each file appended with a separator: `\n\n--- Imported from {filename} ---\n\n{content}`

Combined string sent as the `backlog` field to the existing intake API. Claude's intake prompt already handles unstructured backlog text — tabular TSV with headers is straightforward for it.

Images continue to work exactly as before.

## Scope

**In scope (MVP):**
- Extend file input to accept CSV, TSV, XLSX, XLS, TXT alongside images
- Client-side parsing with SheetJS (dynamically imported)
- File preview chips with filename + summary
- 500KB per-file size limit
- Parsed content merged into backlog text
- No API changes

**Out of scope:**
- Drag-and-drop
- Multi-sheet Excel support (first sheet only)
- Server-side parsing
- PDF support
- File format auto-detection beyond extension
