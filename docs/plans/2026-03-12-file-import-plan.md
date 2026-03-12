# File Import for Intake — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to upload CSV, TSV, XLSX, and TXT files in the intake backlog input, parsed client-side and merged into the backlog text for the AI conversation.

**Architecture:** Extend the existing `BacklogInput` component in `src/app/intake/page.tsx` to accept data files alongside images. Add a `parseFile` utility using SheetJS for tabular formats. Parsed file content is merged into the `backlog` string when "Let's go" is clicked — no API changes needed.

**Tech Stack:** SheetJS (`xlsx` npm package, dynamically imported), React, TypeScript, Tailwind CSS

**Design doc:** `docs/plans/2026-03-12-file-import-design.md`

---

### Task 1: Install SheetJS

**Step 1: Add the xlsx package**

Run: `npm install xlsx`

**Step 2: Verify it installed**

Run: `cat package.json | grep xlsx`
Expected: `"xlsx": "^0.xx.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add xlsx (SheetJS) for file import parsing"
```

---

### Task 2: Create the file parsing utility

**Files:**
- Create: `src/lib/file-parser.ts`

**Step 1: Create the file parser module**

Create `src/lib/file-parser.ts` with the following:

```ts
export interface FileData {
  name: string;
  type: "tabular" | "text";
  content: string;
  preview: string;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export class FileTooLargeError extends Error {
  constructor(name: string) {
    super(`File "${name}" exceeds the 500KB size limit.`);
  }
}

export class UnsupportedFileError extends Error {
  constructor(name: string) {
    super(`File type not supported: "${name}". Supported: CSV, TSV, XLSX, XLS, TXT.`);
  }
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isTabular(ext: string): boolean {
  return ["csv", "tsv", "xlsx", "xls"].includes(ext);
}

function isSupportedFile(ext: string): boolean {
  return ["csv", "tsv", "xlsx", "xls", "txt"].includes(ext);
}

function makePreview(rows: string[][], filename: string): string {
  if (rows.length === 0) return "Empty file";
  const cols = Math.max(...rows.map((r) => r.length));
  // Subtract 1 for header row
  const dataRows = Math.max(0, rows.length - 1);
  return `${dataRows} rows, ${cols} columns`;
}

function rowsToTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

function parseCsvTsv(text: string, ext: string): FileData & { _rows: string[][] } {
  const delimiter = ext === "tsv" ? "\t" : ",";
  const rows = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));
  return {
    name: "",
    type: "tabular",
    content: rowsToTsv(rows),
    preview: "",
    _rows: rows,
  };
}

async function parseXlsx(buffer: ArrayBuffer): Promise<{ rows: string[][]; content: string }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
  });
  return { rows, content: rowsToTsv(rows) };
}

export async function parseFile(file: File): Promise<FileData> {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileTooLargeError(file.name);
  }

  const ext = getExtension(file.name);

  if (!isSupportedFile(ext)) {
    throw new UnsupportedFileError(file.name);
  }

  if (ext === "txt") {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    return {
      name: file.name,
      type: "text",
      content: text,
      preview: `${lines.length} lines`,
    };
  }

  if (ext === "csv" || ext === "tsv") {
    const text = await file.text();
    const parsed = parseCsvTsv(text, ext);
    return {
      name: file.name,
      type: "tabular",
      content: parsed.content,
      preview: makePreview(parsed._rows, file.name),
    };
  }

  // xlsx / xls
  const buffer = await file.arrayBuffer();
  const { rows, content } = await parseXlsx(buffer);
  return {
    name: file.name,
    type: "tabular",
    content,
    preview: makePreview(rows, file.name),
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/file-parser.ts` (or just `npm run build` later)

**Step 3: Commit**

```bash
git add src/lib/file-parser.ts
git commit -m "feat: add file parser utility for CSV, TSV, XLSX, TXT"
```

---

### Task 3: Add FileData state and upload handler to BacklogInput

**Files:**
- Modify: `src/app/intake/page.tsx`

**Step 1: Add the FileData type import and state**

At the top of `src/app/intake/page.tsx`, add the import:

```ts
import { parseFile, type FileData, FileTooLargeError, UnsupportedFileError } from "@/lib/file-parser";
import { File as FileIcon } from "@phosphor-icons/react";
```

Add `FileIcon` to the existing `@phosphor-icons/react` import (merge it in). Note: the Phosphor icon name is `File` — import it as `FileIcon` to avoid conflict with the global `File` type.

**Step 2: Add `files` state to `IntakePage`**

In `IntakePage`, alongside the existing `images` state, add:

```ts
const [files, setFiles] = useState<FileData[]>([]);
```

Pass `files` and `setFiles` to `BacklogInput` as new props.

**Step 3: Update BacklogInput props**

Add `files` and `setFiles` to the `BacklogInput` props interface:

```ts
files: FileData[];
setFiles: (v: FileData[]) => void;
```

**Step 4: Rename `handleImageUpload` to `handleFileUpload` and extend it**

Replace the existing `handleImageUpload` handler in `BacklogInput` with a new `handleFileUpload` that handles both images and data files:

```ts
const [fileError, setFileError] = useState<string | null>(null);

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const fileList = e.target.files;
  if (!fileList) return;
  setFileError(null);

  for (const file of Array.from(fileList)) {
    if (file.type.startsWith("image/")) {
      // Existing image handling
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const match = result.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          setImages([...images, {
            base64: match[2],
            mediaType: match[1],
            name: file.name,
          }]);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Data file handling
      try {
        const parsed = await parseFile(file);
        setFiles([...files, parsed]);
      } catch (err) {
        if (err instanceof FileTooLargeError || err instanceof UnsupportedFileError) {
          setFileError(err.message);
        } else {
          setFileError(`Failed to parse "${file.name}".`);
        }
      }
    }
  }
  e.target.value = "";
};
```

**Step 5: Update `hasContent` to include files**

```ts
const hasContent = backlog.trim() || images.length > 0 || files.length > 0;
```

**Step 6: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: add file upload handling to BacklogInput"
```

---

### Task 4: Update the upload button label and accept attribute

**Files:**
- Modify: `src/app/intake/page.tsx`

**Step 1: Update the upload label and accept**

Change the upload label section in `BacklogInput` from:

```tsx
<label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors w-fit">
  <Camera size={20} weight="duotone" />
  <span>Add photo or screenshot (Miro, post-its, whiteboard...)</span>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleImageUpload}
    className="hidden"
  />
</label>
```

To:

```tsx
<label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors w-fit">
  <Camera size={20} weight="duotone" />
  <span>Add photo, screenshot, or file (CSV, Excel, TXT...)</span>
  <input
    type="file"
    accept="image/*,.csv,.tsv,.txt,.xlsx,.xls"
    multiple
    onChange={handleFileUpload}
    className="hidden"
  />
</label>
```

**Step 2: Update the subtitle text**

Change line 173 from:

```tsx
Paste your backlog, upload a photo of your task board, or both.
```

To:

```tsx
Paste your backlog, upload a file or photo, or both.
```

**Step 3: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: update upload button to accept data files"
```

---

### Task 5: Add file preview chips and error display

**Files:**
- Modify: `src/app/intake/page.tsx`

**Step 1: Add file preview chips after image previews**

Inside the `{/* Image previews */}` section (or just after it), add file preview chips. Place this inside the `<div className="space-y-3">` block, after the image preview `div`:

```tsx
{/* File previews */}
{files.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {files.map((f, i) => (
      <div
        key={`file-${i}`}
        className="relative group flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
      >
        <FileIcon size={16} weight="duotone" className="text-indigo-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
            {f.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {f.preview}
          </p>
        </div>
        <button
          onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
          className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
)}

{/* File error */}
{fileError && (
  <p className="text-xs text-red-500 dark:text-red-400">{fileError}</p>
)}
```

**Step 2: Verify the UI renders**

Run: `npm run dev`
Navigate to `/intake`, accept consent, verify:
- Upload button shows updated text
- Uploading a CSV/XLSX shows a chip with filename and row count
- Uploading an image still shows thumbnail
- X button removes files
- Error appears for files > 500KB or unsupported types

**Step 3: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: add file preview chips and error display"
```

---

### Task 6: Merge file content into backlog on submission

**Files:**
- Modify: `src/app/intake/page.tsx`

**Step 1: Update IntakePage to merge file content when starting**

In `IntakePage`, change the `onStart` handler to merge file content into the backlog before passing to `IntakeConversation`. Replace the simple `onStart={() => setStarted(true)}` with a function:

```ts
const handleStart = () => {
  // Merge parsed file content into backlog text
  if (files.length > 0) {
    const fileContent = files
      .map((f) => `\n\n--- Imported from ${f.name} ---\n\n${f.content}`)
      .join("");
    setBacklog((prev) => (prev.trim() ? prev + fileContent : fileContent.trimStart()));
  }
  setStarted(true);
};
```

Pass `onStart={handleStart}` to `BacklogInput` instead of `onStart={() => setStarted(true)}`.

**Step 2: Verify end-to-end flow**

Run: `npm run dev`
1. Go to `/intake`, accept consent
2. Upload a small CSV file
3. Optionally type some text in the textarea
4. Click "Let's go"
5. Verify the AI intake conversation starts and Claude references the file data

**Step 3: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: merge parsed file content into backlog on intake start"
```

---

### Task 7: Build verification

**Step 1: Run the production build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

**Step 3: Final commit if any fixes needed**

If build/lint required fixes, commit them:

```bash
git add -A
git commit -m "fix: resolve build/lint issues from file import feature"
```
