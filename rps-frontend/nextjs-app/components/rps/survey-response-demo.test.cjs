const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the real component with a controlled draft session, without network calls.
function fixture({ started = false, section = 0, ready = true, completed = false } = {}) {
  const buttons = [];
  const persistence = {
    draft: { answers: { 'q1': 'Ma réponse sauvegardée' }, currentSection: section, started },
    ready, completed, state: 'saved',
  };
  // The component destructures this callback from the hook result.
  persistence.setHasStarted = (value) => { persistence.draft.started = value; };
  function compile(file) {
    const compiled = ts.transpileModule(readFileSync(join(__dirname, file), 'utf8'), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const componentModule = { exports: {} };
    runInNewContext(compiled, {
      exports: componentModule.exports,
      require(name) {
        if (name === '@/components/rps/use-survey-draft') return { useSurveyDraft: () => persistence };
        if (name === '@/components/rps/ui') return {
          Card: ({ children }) => React.createElement('div', null, children),
          PrimaryButton: (props) => { buttons.push(props); return React.createElement('button', props); },
          SecondaryButton: (props) => React.createElement('button', props),
        };
        if (name === '@/components/rps/survey-privacy-footer') return {
          SurveyPrivacyFooter: () => React.createElement('footer', null, 'Confidentialité'),
        };
        if (name === '@/components/rps/linked-survey-text') return { LinkedSurveyText: ({ text }) => text };
        if (name === '@/components/rps/rich-survey-text') return { RichSurveyText: ({ text }) => text };
        if (name === '@/components/rps/survey-response-answer') return compile('survey-response-answer.ts');
        if (name === '@/lib/trpc/client') return {
          getTrpcClient: () => { throw new Error('Unexpected network request'); },
        };
        return require(name);
      },
    });
    return componentModule.exports;
  }
  const { SurveyResponseDemo } = compile('survey-response-demo.tsx');
  const props = {
    participantToken: 'test-token', employeeId: 7,
    employeeName: 'EMPLOYEE_SECRET', employeeTitle: 'JOB_SECRET',
    companyName: 'COMPANY_SECRET', campaignName: 'TEMPLATE_SURVEY_SECRET',
    introductionText: 'Bienvenue dans le questionnaire.', conclusionText: 'Merci de votre participation.',
    questions: [
      { id: 's1', type: 'section', title: 'Première section', sectionId: 1 },
      { id: 'q1', type: 'text', title: 'Première question', sectionId: 1 },
      { id: 's2', type: 'section', title: 'Deuxième section', sectionId: 2 },
      { id: 'q2', type: 'text', title: 'Deuxième question', sectionId: 2 },
    ],
  };
  return {
    buttons, persistence,
    render(overrides = {}) {
      buttons.length = 0;
      const html = renderToStaticMarkup(React.createElement(SurveyResponseDemo, { ...props, ...overrides }));
      for (const hidden of ['EMPLOYEE_SECRET', 'JOB_SECRET', 'COMPANY_SECRET', 'TEMPLATE_SURVEY_SECRET', 'Nom de l&#x27;employeur', 'Prénoms et Nom', 'Titre professionnel']) {
        assert.ok(!html.includes(hidden), `Unexpected identifying display: ${hidden}`);
      }
      assert.ok(html.includes('Confidentialité'));
      return html;
    },
  };
}

test('introduction hides identifying data and starts the questionnaire through the draft session', () => {
  const screen = fixture();
  const html = screen.render();
  assert.ok(html.includes('Bienvenue dans le questionnaire.'));
  assert.ok(!html.includes('Première question'));
  const start = screen.buttons.find((button) => button.children === 'Commencer le sondage');
  assert.equal(start.disabled, false);
  start.onClick();
  assert.equal(screen.persistence.draft.started, true);
  assert.ok(screen.render().includes('Première question'));
});

test('start remains disabled while the saved draft is loading', () => {
  const screen = fixture({ ready: false });
  screen.render();
  assert.equal(screen.buttons.find((button) => button.children === 'Commencer le sondage').disabled, true);
});

test('first section restores saved answers without identifying fields', () => {
  const html = fixture({ started: true }).render();
  assert.ok(html.includes('Ma réponse sauvegardée'));
  assert.ok(html.includes('aria-label="Enregistrer"'));
  assert.ok(!html.includes('Commencer le sondage'));
});

test('resume opens the saved section without repeating the introduction', () => {
  const html = fixture({ started: true, section: 1 }).render();
  assert.ok(html.includes('Deuxième question'));
  assert.ok(!html.includes('Première question'));
  assert.ok(!html.includes('Bienvenue dans le questionnaire.'));
});

test('the last question section offers submission without showing the conclusion', () => {
  const html = fixture({ started: true, section: 1 }).render();
  assert.ok(!html.includes('Merci de votre participation.'));
  assert.ok(!html.includes('Merci. Votre voix compte dans le portrait.'));
  assert.ok(html.includes('Envoyer mes réponses'));
  assert.ok(html.includes('Deuxième question'));
  assert.ok(html.includes('Étape 2 sur 2'));
});

test('an empty introduction opens the questions directly', () => {
  const html = fixture().render({ introductionText: '  ' });
  assert.ok(html.includes('Première question'));
  assert.ok(!html.includes('Commencer le sondage'));
});

test('a completed questionnaire shows the conclusion without introduction or submission controls', () => {
  const html = fixture({ completed: true }).render();
  assert.ok(html.includes('Merci. Votre voix compte dans le portrait.'));
  assert.ok(html.includes('Merci de votre participation.'));
  assert.ok(!html.includes('Commencer le sondage'));
  assert.ok(!html.includes('Première question'));
  assert.ok(!html.includes('Envoyer mes réponses'));
});
