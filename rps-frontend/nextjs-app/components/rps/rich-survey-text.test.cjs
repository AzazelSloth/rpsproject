const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const marker = '<!--rps-rich-text-->';
const compiled = ts.transpileModule(readFileSync(join(__dirname, 'rich-survey-text.tsx'), 'utf8'), {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  },
}).outputText;

// Exercise the actual editor callbacks and renderer without requiring a DOM.
function fixture(initialValue = '') {
  const effects = [];
  const commands = [];
  const values = [];
  const componentModule = { exports: {} };
  const document = {
    execCommand(command, _showUI, html) {
      commands.push({ command, html });
      if (command === 'insertHTML') editable.props.ref.current.innerHTML = html;
    },
  };
  runInNewContext(compiled, {
    exports: componentModule.exports, document,
    require(name) {
      if (name === 'react') return {
        ...React,
        useRef: (current) => ({ current }),
        useState: (value) => [value, () => {}],
        useEffect: (effect) => effects.push(effect),
      };
      if (name === '@/components/rps/linked-survey-text') return require('./linked-survey-text.ts');
      return require(name);
    },
  });
  const { SurveyRichTextEditor, RichSurveyText } = componentModule.exports;
  const tree = SurveyRichTextEditor({ id: 'introduction', value: initialValue, onChange: (value) => values.push(value) });
  function findEditable(element) {
    if (!React.isValidElement(element)) return null;
    if (element.props.contentEditable) return element;
    return React.Children.toArray(element.props.children).map(findEditable).find(Boolean);
  }
  const editable = findEditable(tree);
  editable.props.ref.current = { innerHTML: '' };
  effects.forEach((effect) => effect());
  return {
    editable, commands, values,
    input(html) {
      editable.props.ref.current.innerHTML = html;
      editable.props.onInput();
      return values.at(-1);
    },
    render(text) {
      return renderToStaticMarkup(React.createElement(RichSurveyText, { text }));
    },
  };
}

test('preserves Enter, repeated blank lines and Shift+Enter from editing through rendering and reopening', () => {
  const screen = fixture();
  for (const html of [
    'Introduction<div><br></div><div><br></div><div>Suite<br>Fin</div>',
    '<p>Introduction</p><p></p><p><br></p><p>Suite<br>Fin</p>',
    'Introduction<br><br><br>Suite<br>Fin',
  ]) {
    const saved = screen.input(html);
    const normalized = html.replaceAll('<br>', '<br />');
    assert.equal(saved, marker + normalized);
    assert.ok(screen.render(saved).endsWith(normalized + '</div>'));
    assert.equal(fixture(saved).editable.props.ref.current.innerHTML, normalized);
  }
});

test('keeps emphasis, lists and protected links on save and display', () => {
  const screen = fixture();
  const saved = screen.input('<div><b>Gras</b> <i>Italique</i> <u>Souligné</u></div>' +
    '<ul><li>Premier</li><li>Second</li></ul><ol><li>Étape</li></ol>' +
    '<a href="https://example.com/?a=1&amp;b=2">En savoir plus</a>');
  const rendered = screen.render(saved);
  assert.ok(rendered.includes('<strong>Gras</strong> <em>Italique</em> <u>Souligné</u>'));
  assert.ok(rendered.includes('<ul><li>Premier</li><li>Second</li></ul><ol><li>Étape</li></ol>'));
  assert.ok(rendered.includes('href="https://example.com/?a=1&amp;b=2"'));
  assert.ok(rendered.includes('target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"'));
});

test('removes unsafe markup both when saving and rendering previously stored content', () => {
  const screen = fixture();
  const html = '<div onclick="alert(1)" style="position:fixed"><strong>Texte</strong></div>' +
    '<script>alert(2)</script><img src=x onerror="alert(3)"><iframe src="https://example.com"></iframe>' +
    '<a href="javascript:alert(4)">Lien</a>';
  for (const text of [screen.input(html), marker + html]) {
    const rendered = screen.render(text);
    assert.ok(rendered.includes('<div><strong>Texte</strong></div>'));
    assert.doesNotMatch(rendered, /onclick|onerror|style=|<script|<img|<iframe|javascript:|alert\(/);
  }
});

test('pasting rich text preserves supported formatting and sanitizes before DOM insertion', () => {
  const screen = fixture();
  let prevented = false;
  screen.editable.props.onPaste({
    preventDefault() { prevented = true; },
    clipboardData: { getData: (type) => type === 'text/html'
      ? '<p><b>Bonjour</b></p><p><br></p><p onclick="alert(1)">Suite</p><script>alert(2)</script>'
      : 'Bonjour\n\nSuite' },
  });
  assert.equal(prevented, true);
  assert.equal(screen.commands[0].command, 'insertHTML');
  assert.equal(screen.commands[0].html, '<p><strong>Bonjour</strong></p><p><br /></p><p>Suite</p>');
  assert.equal(screen.values[0], marker + screen.commands[0].html);
});

test('plain text clipboard content remains literal and retains its line breaks', () => {
  const screen = fixture();
  const text = 'Texte <b>littéral</b>\n\nSuite';
  screen.editable.props.onPaste({
    preventDefault() {},
    clipboardData: { getData: (type) => type === 'text/plain' ? text : '' },
  });
  assert.equal(screen.commands[0].command, 'insertText');
  assert.equal(screen.commands[0].html, text);
});

test('old plain text remains escaped and editable with its paragraphs and clickable links', () => {
  const screen = fixture('Introduction\r\n\r\nSuite <b>texte</b>');
  assert.equal(screen.editable.props.ref.current.innerHTML, 'Introduction<br><br>Suite &lt;b&gt;texte&lt;/b&gt;');
  const rendered = screen.render('Introduction\n\nSuite <b>texte</b> https://example.com');
  assert.ok(rendered.includes('Introduction\n\nSuite &lt;b&gt;texte&lt;/b&gt;'));
  assert.ok(rendered.includes('href="https://example.com"'));
});

test('empty blocks do not turn an empty introduction into a nonempty page', () => {
  assert.equal(fixture().input('<div><br></div><p><br></p>'), '');
});
