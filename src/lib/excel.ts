import ExcelJS from "exceljs";

// Column order matches the entry form / blueprint section 08 exactly, plus
// Sprint (export only — import is always scoped to one chosen sprint).
export const EXPORT_HEADERS = [
  "Sprint",
  "Feature",
  "Task Type",
  "Task",
  "Assignee",
  "Android POC",
  "Android (Hrs)",
  "Activity",
  "Test Build Shared Date (Android)",
  "Remark",
] as const;

export const IMPORT_HEADERS = [
  "Feature",
  "Task Type",
  "Task",
  "Assignee",
  "Android POC",
  "Android (Hrs)",
  "Activity",
  "Test Build Shared Date (Android)",
  "Remark",
] as const;

export type ExportRow = {
  sprintName: string;
  feature: string;
  taskType: string;
  task: string | null;
  assignee: string;
  androidPoc: string | null;
  hours: number;
  activity: string;
  testBuildSharedDate: string | null;
  remark: string | null;
};

export async function buildExportWorkbook(rows: ExportRow[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Entries");
  sheet.columns = EXPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "Task" || header === "Remark" || header === "Feature" ? 32 : 18,
  }));
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    sheet.addRow({
      Sprint: r.sprintName,
      Feature: r.feature,
      "Task Type": r.taskType,
      Task: r.task ?? "",
      Assignee: r.assignee,
      "Android POC": r.androidPoc ?? "",
      "Android (Hrs)": r.hours,
      Activity: r.activity,
      "Test Build Shared Date (Android)": r.testBuildSharedDate ?? "",
      Remark: r.remark ?? "",
    });
  }
  return wb.xlsx.writeBuffer();
}

export async function buildImportTemplateWorkbook(lookups: {
  taskTypes: string[];
  activities: string[];
  members: string[];
}): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Import");
  sheet.columns = IMPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "Task" || header === "Remark" || header === "Feature" ? 32 : 20,
  }));
  sheet.getRow(1).font = { bold: true };

  // Hidden lookup sheet backing the dropdown validations (Excel data
  // validation "list" formulas can't reference literal arrays directly).
  const lookupSheet = wb.addWorksheet("Lookups");
  lookupSheet.state = "veryHidden";
  lookups.taskTypes.forEach((v, i) => (lookupSheet.getCell(i + 1, 1).value = v));
  lookups.activities.forEach((v, i) => (lookupSheet.getCell(i + 1, 2).value = v));
  lookups.members.forEach((v, i) => (lookupSheet.getCell(i + 1, 3).value = v));

  const ROWS = 200;
  const colRange = (col: string, count: number) => `Lookups!$${col}$1:$${col}$${Math.max(count, 1)}`;
  for (let row = 2; row <= ROWS + 1; row++) {
    sheet.getCell(`B${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [colRange("A", lookups.taskTypes.length)],
      showErrorMessage: true,
      errorTitle: "Invalid Task Type",
      error: "Pick a value from the dropdown.",
    };
    sheet.getCell(`D${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [colRange("C", lookups.members.length)],
      showErrorMessage: true,
      errorTitle: "Invalid Assignee",
      error: "Pick a value from the dropdown.",
    };
    sheet.getCell(`E${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [colRange("C", lookups.members.length)],
    };
    sheet.getCell(`F${row}`).dataValidation = {
      type: "decimal",
      operator: "between",
      formulae: [0.5, 100],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Invalid Hours",
      error: "Hours must be between 0.5 and 100.",
    };
    sheet.getCell(`G${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [colRange("B", lookups.activities.length)],
      showErrorMessage: true,
      errorTitle: "Invalid Activity",
      error: "Pick a value from the dropdown.",
    };
  }

  return wb.xlsx.writeBuffer();
}

export type ParsedImportRow = {
  rowNumber: number;
  feature: string;
  taskType: string;
  task: string;
  assignee: string;
  androidPoc: string;
  hours: number | null;
  activity: string;
  testBuildSharedDate: string;
  remark: string;
};

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value == null) return "";
  const v = cell.value;
  if (typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text ?? "");
  if (typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result ?? "");
  return String(v).trim();
}

function cellDate(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value == null) return "";
  const v = cell.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const text = cellText(cell);
  const parsed = text ? new Date(text) : null;
  return parsed && !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
}

export async function parseImportWorkbook(buffer: Buffer): Promise<ParsedImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = wb.worksheets[0];
  const rows: ParsedImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const feature = cellText(row.getCell(1));
    const taskType = cellText(row.getCell(2));
    const task = cellText(row.getCell(3));
    const assignee = cellText(row.getCell(4));
    const androidPoc = cellText(row.getCell(5));
    const hoursRaw = row.getCell(6).value;
    const hours =
      typeof hoursRaw === "number" ? hoursRaw : hoursRaw ? Number(cellText(row.getCell(6))) : null;
    const activity = cellText(row.getCell(7));
    const testBuildSharedDate = cellDate(row.getCell(8));
    const remark = cellText(row.getCell(9));

    if (!feature && !taskType && !assignee && !activity && hours == null) return; // skip blank rows

    rows.push({
      rowNumber,
      feature,
      taskType,
      task,
      assignee,
      androidPoc,
      hours: hours != null && !Number.isNaN(hours) ? hours : null,
      activity,
      testBuildSharedDate,
      remark,
    });
  });
  return rows;
}
