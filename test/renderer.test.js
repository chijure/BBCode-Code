const test = require('node:test');
const assert = require('node:assert');
const { bbcodeToHtml, diagnose, openTagsAt } = require('../bbcode-renderer');

test('atributos con comillas dobles, simples y sin comillas', () => {
  assert.strictEqual(bbcodeToHtml('[SIZE="4"]a[/SIZE]'), '<span style="font-size:15px">a</span>');
  assert.strictEqual(bbcodeToHtml('[COLOR=Red]a[/COLOR]'), '<span style="color:Red">a</span>');
  assert.match(bbcodeToHtml("[URL='https://x.com']a[/URL]"), /href="https:\/\/x\.com"/);
});

test('items de lista con etiquetas dentro', () => {
  assert.strictEqual(
    bbcodeToHtml('[LIST=1]\n[*] [B]a[/B]: b\n[*]c\n[/LIST]'),
    '<ol><li><strong>a</strong>: b</li><li>c</li></ol>'
  );
});

test('listas ordenadas estilo phpBB: [list=1|a|A|i|I] (#1)', () => {
  assert.strictEqual(bbcodeToHtml('[list=1][*]x[/list]'), '<ol><li>x</li></ol>');
  for (const type of ['a', 'A', 'i', 'I']) {
    assert.strictEqual(bbcodeToHtml(`[list=${type}]\n[*]x\n[*]y\n[/list]`), `<ol type="${type}"><li>x</li><li>y</li></ol>`);
  }
});

test('listas anidadas dentro de citas', () => {
  const html = bbcodeToHtml('[QUOTE][LIST][*]a[LIST][*]b[/LIST][/LIST][/QUOTE]');
  assert.match(html, /<blockquote[^>]*>.*<ul><li>a<ul><li>b<\/li><\/ul><\/li><\/ul>/);
});

test('etiquetas desconocidas quedan como texto', () => {
  assert.strictEqual(bbcodeToHtml('[ROM][UNOFFICIAL] x'), '[ROM][UNOFFICIAL] x');
});

test('anidamiento cruzado se reabre', () => {
  assert.strictEqual(
    bbcodeToHtml('[SIZE=5][CENTER]a[/SIZE]b[/CENTER]'),
    '<span style="font-size:18px"><div style="text-align:center">a</div></span><div style="text-align:center">b</div>'
  );
});

test('code y plain no se parsean', () => {
  assert.match(bbcodeToHtml('[CODE][B]x[/B][/CODE]'), /<code>\[B\]x\[\/B\]<\/code>/);
  assert.strictEqual(bbcodeToHtml('[PLAIN]XDA:DevDB [B][/PLAIN]'), 'XDA:DevDB [B]');
});

test('spoiler con título, mention y tabla', () => {
  assert.match(bbcodeToHtml('[SPOILER="Por qué"]x[/SPOILER]'), /<summary>Spoiler: Por qué<\/summary>/);
  assert.match(bbcodeToHtml('[MENTION=5]bob[/MENTION]'), /href="https:\/\/xdaforums\.com\/member\.php\?u=5">@bob/);
  assert.strictEqual(
    bbcodeToHtml('[TABLE]\n[TR][TD]a[/TD][TD]b[/TD][/TR]\n[/TABLE]'),
    '<table class="bb-table"><tr><td>a</td><td>b</td></tr></table>'
  );
});

test('bloquea URLs javascript y escapa HTML', () => {
  assert.strictEqual(bbcodeToHtml('[URL="javascript:alert(1)"]x[/URL]'), 'x');
  assert.strictEqual(bbcodeToHtml('<script>'), '&lt;script&gt;');
});

test('diagnose: etiqueta sin cerrar, cierre huérfano y anidamiento cruzado', () => {
  const messages = (text) => diagnose(text).map((i) => i.message);
  assert.deepStrictEqual(diagnose('[B]ok[/B] [ROM][UNOFFICIAL]'), []);
  assert.deepStrictEqual(messages('x [B]a'), ['[B] no se cerró: falta [/B].']);
  assert.deepStrictEqual(diagnose('x [B]a')[0], { start: 2, end: 5, message: '[B] no se cerró: falta [/B].' });
  assert.deepStrictEqual(messages('a[/LIST]'), ['[/LIST] no tiene una etiqueta de apertura.']);
  assert.deepStrictEqual(messages('[SIZE=5][CENTER]a[/SIZE]b[/CENTER]'), [
    'Anidamiento cruzado: [/SIZE] se cierra mientras [CENTER] sigue abierta.'
  ]);
  assert.deepStrictEqual(messages('[*] suelto'), ['[*] está fuera de una lista ([LIST]).']);
  assert.deepStrictEqual(messages('[CODE]x'), ['[CODE] no se cerró: falta [/CODE].']);
});

test('openTagsAt: etiquetas abiertas para autocerrar', () => {
  assert.deepStrictEqual(openTagsAt('[CENTER][B]x[/B][SIZE=4][color=Red]a'), ['CENTER', 'SIZE', 'color']);
  assert.deepStrictEqual(openTagsAt('[LIST][*][B]a'), ['LIST', 'B']);
  assert.deepStrictEqual(openTagsAt('[QUOTE][CODE]x [B]y'), ['QUOTE', 'CODE']);
  assert.deepStrictEqual(openTagsAt('[B]a[/B]'), []);
});

test('collapseBlankLines imita los saltos del editor de XDA', () => {
  const src = '[SIZE=4][B]About[/B][/SIZE]\n\nText one.\n\nText two.\n[LIST]\n[*]a\n[/LIST]\n\n[COLOR=Red][CENTER]x[/CENTER][/COLOR]\n\nNext\n';
  assert.strictEqual(
    bbcodeToHtml(src, { collapseBlankLines: true }),
    '<span style="font-size:15px"><strong>About</strong></span><br>\nText one.<br>\nText two.<br>\n' +
      '<ul><li>a</li></ul><span style="color:Red"><div style="text-align:center">x</div></span>Next'
  );
});

test('buildPage aplica el tema y la maqueta del post', () => {
  const { buildPage } = require('../preview-html');
  const page = buildPage({ body: '<b>hola</b>', csp: "default-src 'none'", theme: 'xda-classic', title: 'Mi post' });
  assert.match(page, /class="page theme-xda-classic"/);
  assert.match(page, /<h1 class="thread-title">Mi post<\/h1>/);
  assert.doesNotMatch(page, /post-user|avatar|Senior Member/);
  assert.doesNotMatch(buildPage({ body: 'x', csp: '', theme: 'vscode' }), /class="post"/);
  assert.match(buildPage({ body: 'x', csp: '', theme: 'otro' }), /theme-xda"/);
});

test('lineMarkers: data-line con la línea del archivo original', () => {
  const html = bbcodeToHtml('\n\n[CENTER]T[/CENTER]\nhola\n[LIST]\n[*]a\n[/LIST]', { lineMarkers: true });
  assert.match(html, /^<div data-line="2" style="text-align:center">/);
  assert.match(html, /<span data-line="3"><\/span>hola/);
  assert.match(html, /<ul data-line="4"><li data-line="5">/);
  assert.doesNotMatch(bbcodeToHtml('[B]x[/B]'), /data-line/);
});
