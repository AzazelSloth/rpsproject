const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile only this client component; routing and network dependencies are
// stubbed so these render tests never contact the application or the database.
const source = readFileSync(join(__dirname, 'survey-list-table.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const componentModule = { exports: {} };
const unexpectedRequest = () => { throw new Error('No network requests allowed'); };
runInNewContext(compiled, {
  exports: componentModule.exports,
  URLSearchParams,
  require(name) {
    if (name === 'next/link') return { default: (props) => React.createElement('a', props) };
    if (name === 'next/navigation') return { useRouter: () => ({ refresh: unexpectedRequest }) };
    if (name === '@/components/rps/ui') return {
      Card: ({ children }) => React.createElement('div', null, children),
      Pill: ({ children }) => React.createElement('span', null, children),
    };
    if (name === '@/lib/trpc/client') return { getTrpcClient: unexpectedRequest };
    if (name === '@/components/rps/survey-timing-dialog') return { SurveyTimingDialog: () => null };
    return require(name);
  },
});
const { SurveyListTable } = componentModule.exports;
const survey = {
  id: 42, title: 'Sondage test', companyName: 'Entreprise test', status: 'active',
  participationRate: 50, completedParticipants: 1, totalParticipants: 2,
  startDate: null, endDate: null,
};

for (const canViewTiming of [false, true]) {
  for (const canDeleteTestSurveys of [false, true]) {
    test(`survey list hides only results (timing=${canViewTiming}, delete=${canDeleteTestSurveys})`, () => {
      const options = { showResults: false, canViewTiming, canDeleteTestSurveys };
      const html = renderToStaticMarkup(React.createElement(SurveyListTable, { ...options, surveys: [survey] }));
      assert.ok(!html.includes('Voir les résultats'));
      assert.ok(!html.includes('>Résultats</th>'));
      assert.ok(!html.includes('/results?'));
      assert.ok(html.includes('/surveys?tab=edit&amp;campaignId=42'));
      assert.ok(html.includes('50%'));
      assert.ok(html.includes('1/2 participants'));
      assert.equal(html.includes('aria-label="Horodateur"'), canViewTiming);
      assert.equal(html.includes('Supprimer'), canDeleteTestSurveys);
      const expectedColumns = 5 + Number(canViewTiming) + Number(canDeleteTestSurveys);
      assert.equal((html.match(/<th /g) ?? []).length, expectedColumns);
      assert.equal((html.match(/<td /g) ?? []).length, expectedColumns);
      const emptyHtml = renderToStaticMarkup(React.createElement(SurveyListTable, { ...options, surveys: [] }));
      assert.ok(emptyHtml.includes(`colSpan="${expectedColumns}"`));
    });
  }
}

test('dashboard retains results by default', () => {
  const html = renderToStaticMarkup(React.createElement(SurveyListTable, { surveys: [survey], scenario: 'test' }));
  assert.ok(html.includes('Voir les résultats'));
  assert.ok(html.includes('/results?view=detail&amp;campaignId=42&amp;scenario=test'));
  const emptyHtml = renderToStaticMarkup(React.createElement(SurveyListTable, { surveys: [] }));
  assert.ok(emptyHtml.includes('colSpan="6"'));
});

test('only the surveys list page opts out of the results column', () => {
  const page = readFileSync(join(__dirname, '../..', 'app/(app)/surveys/page.tsx'), 'utf8');
  assert.match(page, /<SurveyListTable\s+showResults=\{false\}/);
  const dashboard = readFileSync(join(__dirname, 'dashboard-content.tsx'), 'utf8');
  assert.ok(!dashboard.includes('showResults={false}'));
});
