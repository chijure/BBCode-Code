const test = require('node:test');
const assert = require('node:assert');
const { bbcodeToHtml } = require('../bbcode-renderer');

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
