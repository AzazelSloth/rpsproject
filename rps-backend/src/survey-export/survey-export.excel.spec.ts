import { BadRequestException } from '@nestjs/common';
import { ValueType, Workbook } from 'exceljs';
import { serializeSurveyWorkbook } from './survey-export.excel';

async function readWorkbook(buffer: Buffer) {
  const workbook = new Workbook();
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  return workbook;
}

describe('Survey Excel presentation', () => {
  const headers = [
    'Répondant',
    'Section',
    'Question',
    'Type de question',
    'Réponse',
    'Statut',
  ];

  it('preserves the closed rows, scales and statuses with a visual group per respondent', async () => {
    const rows = [
      [
        'R-AAAAAAAAAAAAAAAA',
        'Charge',
        'Question A',
        'Échelle A',
        'Plutôt d’accord',
        'Répondu',
      ],
      ['R-AAAAAAAAAAAAAAAA', 'Charge', 'Question F', 'Échelle F', '', 'Sauté'],
      [
        'R-BBBBBBBBBBBBBBBB',
        'Autonomie',
        'Question 1 à 5',
        'Échelle 1 à 5',
        '3',
        'Répondu',
      ],
      [
        'R-BBBBBBBBBBBBBBBB',
        'Autonomie',
        'Un choix',
        'Choix multiple',
        '',
        'Je préfère ne pas répondre',
      ],
    ];
    const workbook = await readWorkbook(
      await serializeSurveyWorkbook('closed', headers, rows),
    );
    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.worksheets[0];
    expect(sheet.columnCount).toBe(headers.length);
    expect(sheet.rowCount).toBe(rows.length + 1);
    [headers, ...rows].forEach((values, index) => {
      expect(sheet.getRow(index + 1).values).toEqual([undefined, ...values]);
    });
    expect(sheet.views[0]).toMatchObject({
      state: 'frozen',
      xSplit: 1,
      ySplit: 1,
    });
    expect(sheet.autoFilter).toBe('A1:F5');
    expect(sheet.getCell('A1').font.bold).toBe(true);
    expect(sheet.getColumn(3).width).toBe(65);
    expect(sheet.getCell('C2').alignment.wrapText).toBe(true);
    expect(sheet.getCell('A2').fill).toEqual(sheet.getCell('A3').fill);
    expect(sheet.getCell('A3').fill).not.toEqual(sheet.getCell('A4').fill);
    expect(sheet.getCell('A4').border.top?.style).toBe('thin');
  });

  it('preserves long multiline free text, whitespace, punctuation and accents exactly', async () => {
    const question = 'Une question longue : "conditions de travail" ? '.repeat(
      20,
    );
    const answer =
      '  Première ligne ; "témoignage"\nDeuxième ligne\r\n' +
      'Texte libre. '.repeat(300);
    const workbook = await readWorkbook(
      await serializeSurveyWorkbook(
        'text',
        ['Répondant', 'Section', 'Question', 'Réponse textuelle', 'Statut'],
        [
          [
            'R-AAAAAAAAAAAAAAAA',
            'Expression libre',
            question,
            answer,
            'Répondu',
          ],
        ],
      ),
    );
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('C2').value).toBe(question);
    expect(sheet.getCell('D2').value).toBe(answer);
    expect(sheet.getCell('D2').alignment.wrapText).toBe(true);
    expect(sheet.getRow(2).height).toBeGreaterThan(28);
    expect(sheet.columnCount).toBe(5);
  });

  it.each([
    '=HYPERLINK("https://example.test")',
    '+1+1',
    '-1+1',
    '@SUM(A1)',
    '  =1+1',
    'https://example.test',
    '00123',
  ])(
    'stores %s as literal text, never a formula or hyperlink',
    async (answer) => {
      const workbook = await readWorkbook(
        await serializeSurveyWorkbook(
          'text',
          ['Répondant', 'Section', 'Question', 'Réponse textuelle', 'Statut'],
          [['R-AAAAAAAAAAAAAAAA', 'Section', 'Question', answer, 'Répondu']],
        ),
      );
      const cell = workbook.worksheets[0].getCell('D2');
      expect(cell.type).toBe(ValueType.String);
      expect(cell.value).toBe(answer);
      expect(cell.formula).toBeUndefined();
      expect(cell.hyperlink).toBeUndefined();
    },
  );

  it('exports an empty workbook with its headers', async () => {
    const workbook = await readWorkbook(
      await serializeSurveyWorkbook('closed', headers, []),
    );
    expect(workbook.worksheets[0].rowCount).toBe(1);
    expect(workbook.worksheets[0].autoFilter).toBe('A1:F1');
  });

  it('preserves literal Excel escape sequences and control characters', async () => {
    const answer = '  _x000D_ _x005F_ _x000a_\r\nfin\t\u000B\u007F';
    const workbook = await readWorkbook(
      await serializeSurveyWorkbook(
        'text',
        ['Répondant', 'Section', 'Question', 'Réponse textuelle', 'Statut'],
        [['R-AAAAAAAAAAAAAAAA', 'Section', 'Question', answer, 'Répondu']],
      ),
    );
    expect(workbook.worksheets[0].getCell('D2').value).toBe(answer);
  });

  it('rejects text exceeding Excel cell limits instead of truncating it', async () => {
    await expect(
      serializeSurveyWorkbook(
        'text',
        ['Répondant', 'Section', 'Question', 'Réponse textuelle', 'Statut'],
        [
          [
            'R-AAAAAAAAAAAAAAAA',
            'Section',
            'Question',
            'x'.repeat(32_768),
            'Répondu',
          ],
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
