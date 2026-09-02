import type { Syllabus } from "@/lib/schemas/syllabus";

function moduleObjectives(mod: Syllabus["modules"][number]): string[] {
  return mod.lessons.flatMap((lesson) => lesson.learningObjectives);
}

const HEADER_FILL = "FFE2E8F0"; // slate-200
const WEEK_FILL = "FFE0E7FF"; // indigo-100
const ALT_ROW_FILL = "FFF8FAFC"; // slate-50

// Builds a formatted .xlsx workbook of learning outcomes, grouped one
// styled block per week rather than repeating the week/module title on
// every row (the complaint about the raw-CSV version this replaces).
export async function buildOutcomesWorkbookBlob(syllabus: Syllabus): Promise<Blob> {
  // Dynamically imported so this fairly large library only loads when
  // someone actually exports, not as part of the main page bundle — same
  // reasoning as the PDF renderer's dynamic import in handleDownloadPdf.
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SyllabusFlow";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Learning Outcomes");

  sheet.mergeCells("A1:B1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = syllabus.courseTitle;
  titleCell.font = { bold: true, size: 14 };

  const headerRow = sheet.addRow(["#", "Objective"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  });

  let dataRowIndex = 0;
  for (const [moduleIndex, mod] of syllabus.modules.entries()) {
    const weekTitle = mod.title.replace(/^Week \d+:\s*/, "");
    const weekRow = sheet.addRow([`Week ${moduleIndex + 1}: ${weekTitle}`]);
    sheet.mergeCells(`A${weekRow.number}:B${weekRow.number}`);
    const weekCell = sheet.getCell(`A${weekRow.number}`);
    weekCell.font = { bold: true };
    weekCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WEEK_FILL } };

    moduleObjectives(mod).forEach((objective, i) => {
      const row = sheet.addRow([i + 1, objective]);
      if (dataRowIndex % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
        });
      }
      dataRowIndex++;
    });
  }

  // ExcelJS never renders text, so there's no true auto-fit — this
  // approximates it from character counts, which is the standard
  // workaround for these libraries.
  const allTexts = [
    syllabus.courseTitle,
    "Objective",
    ...syllabus.modules.flatMap((mod) => [mod.title, ...moduleObjectives(mod)]),
  ];
  const longest = Math.max(...allTexts.map((t) => t.length));
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = Math.min(Math.max(longest + 2, 20), 100);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
