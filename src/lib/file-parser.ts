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

function isSupportedFile(ext: string): boolean {
  return ["csv", "tsv", "xlsx", "xls", "txt"].includes(ext);
}

function makePreview(rows: string[][]): string {
  if (rows.length === 0) return "Empty file";
  const cols = Math.max(...rows.map((r) => r.length));
  // Subtract 1 for header row
  const dataRows = Math.max(0, rows.length - 1);
  return `${dataRows} rows, ${cols} columns`;
}

function rowsToTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

function parseCsvTsv(text: string, ext: string): { rows: string[][]; content: string } {
  const delimiter = ext === "tsv" ? "\t" : ",";
  const rows = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));
  return {
    rows,
    content: rowsToTsv(rows),
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
      preview: makePreview(parsed.rows),
    };
  }

  // xlsx / xls
  const buffer = await file.arrayBuffer();
  const { rows, content } = await parseXlsx(buffer);
  return {
    name: file.name,
    type: "tabular",
    content,
    preview: makePreview(rows),
  };
}
