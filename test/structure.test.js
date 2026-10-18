const test = require('node:test');
const assert = require('node:assert');
const { outline, foldingRanges, headingLevel } = require('../structure');

test('headingLevel reconoce los títulos de XDA', () => {
  assert.strictEqual(headingLevel('[CENTER][B][SIZE="7"][COLOR="DeepSkyBlue"]Phoenix[/COLOR] Kernel[/SIZE][/B]'), 1);
  assert.strictEqual(headingLevel('[SIZE=5][COLOR=red]Downloads[/COLOR][/SIZE]'), 2);
  assert.strictEqual(headingLevel('[B][SIZE="4"]The REQUIREMENTS[/SIZE][/B]'), 3);
  assert.strictEqual(headingLevel('[HEADING=2]Instalación[/HEADING]'), 2);
  assert.strictEqual(headingLevel('[B][U]Contributors[/U][/B]'), 4);
  assert.strictEqual(headingLevel('[B]Install instructions:[/B]'), 4);
  // No son títulos
  assert.strictEqual(headingLevel('[B]chijure[/B]'), 0);
  assert.strictEqual(headingLevel('[SIZE=3][B]Kernel Phoenix[/B][/SIZE]'), 0);
  assert.strictEqual(headingLevel('[SIZE="5"][URL="https://x"]Phoenix-V1[/URL][/SIZE]'), 0);
  assert.strictEqual(headingLevel('[COLOR="Red"][SIZE="5"][CENTER]Do not mirror the links.[/CENTER][/SIZE][/COLOR]'), 0);
  assert.strictEqual(headingLevel('Texto [SIZE=5]suelto[/SIZE]'), 0);
});

test('outline arma secciones, spoilers e ignora [CODE]', () => {
  const text = [
    '[SIZE=6]Título[/SIZE]',
    '[SIZE=4]Uno[/SIZE]',
    'texto',
    '[SPOILER="Detalles"]',
    'x',
    '[/SPOILER]',
    '[CODE]',
    '[SIZE=4]no es título[/SIZE]',
    '[/CODE]',
    '[SIZE=4]Dos[/SIZE]',
    'fin',
    ''
  ].join('\n');
  assert.deepStrictEqual(outline(text).map((s) => [s.kind, s.title, s.level, s.line, s.endLine]), [
    ['section', 'Título', 1, 0, 10],
    ['section', 'Uno', 3, 1, 8],
    ['spoiler', 'Spoiler: Detalles', 5, 3, 5],
    ['section', 'Dos', 3, 9, 10]
  ]);
});

test('foldingRanges pliega bloques de varias líneas y secciones', () => {
  const text = '[SIZE=4]A[/SIZE]\n[QUOTE]\nx\ny\n[/QUOTE]\n[LIST][*]a[/LIST]\n[SIZE=4]B[/SIZE]\nz';
  assert.deepStrictEqual(foldingRanges(text), [
    { start: 0, end: 5 },
    { start: 1, end: 3 },
    { start: 6, end: 7 }
  ]);
});
