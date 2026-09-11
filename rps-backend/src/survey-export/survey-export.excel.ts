import { BadRequestException } from '@nestjs/common';
import { Workbook } from 'exceljs';

function encodeExcelText(value: string): string {
  // OOXML escaping preserves CRLF and control characters otherwise normalized
  // or removed by the XML writer. Escape literal _xNNNN_ sequences first.
  return value.replace(/_x([0-9a-f]{4})_/gi, '_x005F_x$1_').replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B-\u001F\u007F]/g,
    (character) =>
      `_x${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`,
  );
}

// Only the allowlisted export columns reach this writer, never employee entities.
export async function serializeSurveyWorkbook(
  kind: 'closed' | 'text',
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  if (
    rows.length > 1_048_575 ||
    rows.some((row) => row.some((value) => value.length > 32_767))
  ) {
    throw new BadRequestException({
      code: 'SURVEY_EXCEL_LIMIT_EXCEEDED',
      message:
        'Ces réponses dépassent les limites du format Excel. Choisissez CSV pour télécharger leur contenu intégral.',
    });
  }

  const workbook = new Workbook();
  workbook.creator = 'Laroche 360';
  const sheet = workbook.addWorksheet(
    kind === 'closed' ? 'Questions fermées' : 'Questions texte',
    { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] },
  );
  const widths =
    kind === 'closed' ? [23, 28, 65, 22, 40, 30] : [23, 28, 65, 90, 30];
  sheet.columns = headers.map((header, index) => ({
    header,
    width: widths[index],
  }));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: headers.length },
  };
  const heading = sheet.getRow(1);
  heading.height = 32;
  heading.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF172554' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  let previousRespondent: string | undefined;
  let groupIndex = -1;
  for (const values of rows) {
    const startsGroup = values[0] !== previousRespondent;
    if (startsGroup) groupIndex += 1;
    previousRespondent = values[0];
    // Plain string values cannot create Excel formulas or clickable hyperlinks.
    // Keep the original text, including =, +, -, @, whitespace and newlines.
    const row = sheet.addRow(values.map(encodeExcelText));
    let lineCount = 1;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.numFmt = '@';
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: column === 1,
        color: { argb: 'FF172033' },
      };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: groupIndex % 2 === 0 ? 'FFFFFFFF' : 'FFEFF6FF' },
      };
      if (startsGroup) {
        cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } };
      }
      const lines = values[column - 1]
        .split(/\r\n|\r|\n/)
        .reduce(
          (total, line) =>
            total +
            Math.max(1, Math.ceil(line.length / (widths[column - 1] - 2))),
          0,
        );
      lineCount = Math.max(lineCount, lines);
    });
    // Excel limits row height; the full text remains stored in the cell.
    row.height = Math.min(409, Math.max(28, lineCount * 15 + 10));
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
