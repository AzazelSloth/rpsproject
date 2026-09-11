import {
  neutralizeCsvFormula,
  serializeCsvDocument,
} from './csv.util';

describe('CSV export utilities', () => {
  it('declares the separator for Excel while preserving accents and quoted cells', () => {
    const csv = serializeCsvDocument(
      ['Répondant', 'Réponse'],
      [['R-123', 'Très bien; "merci"\net vous ?']],
      { excelSeparatorHint: true },
    );
    expect(csv).toBe(
      '\uFEFFsep=;\r\n"Répondant";"Réponse"\r\n' +
      '"R-123";"Très bien; ""merci""\net vous ?"\r\n',
    );
  });

  it('produces an Excel-compatible UTF-8 semicolon document', () => {
    const csv = serializeCsvDocument(
      ['Répondant', 'Question', 'Réponse'],
      [['R-A82K91', 'Comment ça va ?', 'Très bien']],
    );

    expect(csv).toBe(
      '\uFEFF"Répondant";"Question";"Réponse"\r\n' +
        '"R-A82K91";"Comment ça va ?";"Très bien"\r\n',
    );
  });

  it('escapes quotes and preserves line breaks inside quoted cells', () => {
    const csv = serializeCsvDocument(['Texte'], [['Une "citation"\net la suite']]);

    expect(csv).toBe(
      '\uFEFF"Texte"\r\n"Une ""citation""\net la suite"\r\n',
    );
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-2+3', '@command', ' \t=1+1'])(
    'neutralizes spreadsheet formula input %s',
    (value) => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
      expect(serializeCsvDocument(['Valeur'], [[value]])).toContain(
        `"'${value}"`,
      );
    },
  );

  it('does not alter ordinary negative text embedded after other characters', () => {
    expect(neutralizeCsvFormula('R-ABC123')).toBe('R-ABC123');
  });
});
