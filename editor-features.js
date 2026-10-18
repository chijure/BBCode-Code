const vscode = require('vscode');
const { diagnose, openTagsAt } = require('./bbcode-renderer');
const { outline, foldingRanges } = require('./structure');

const VALIDATE_DELAY_MS = 300;

const isBBCode = (document) => document && document.languageId === 'bbcode';
const config = (document) => vscode.workspace.getConfiguration('bbcode', document && document.uri);

/**
 * Mayúsculas o minúsculas para las etiquetas que inserta la extensión.
 * En "auto" se usa el estilo que predomina en el documento (XDA usa mayúsculas).
 */
function tagCase(document) {
  const setting = config(document).get('tagCase', 'auto');
  if (setting === 'upper' || setting === 'lower') return setting;
  const text = document.getText();
  const upper = (text.match(/\[\/?[A-Z]{1,10}[\]=\s]/g) || []).length;
  const lower = (text.match(/\[\/?[a-z]{1,10}[\]=\s]/g) || []).length;
  return lower > upper ? 'lower' : 'upper';
}

const applyCase = (name, document) => (tagCase(document) === 'lower' ? name.toLowerCase() : name.toUpperCase());

// ---------------------------------------------------------------------------
// Diagnósticos
// ---------------------------------------------------------------------------

function registerDiagnostics(context) {
  const collection = vscode.languages.createDiagnosticCollection('bbcode');
  const timers = new Map();

  const validate = (document) => {
    if (!isBBCode(document)) return;
    if (!config(document).get('validate', true)) {
      collection.delete(document.uri);
      return;
    }
    const diagnostics = diagnose(document.getText()).map((issue) => {
      const range = new vscode.Range(document.positionAt(issue.start), document.positionAt(issue.end));
      const diagnostic = new vscode.Diagnostic(range, issue.message, vscode.DiagnosticSeverity.Warning);
      diagnostic.source = 'bbcode';
      return diagnostic;
    });
    collection.set(document.uri, diagnostics);
  };

  const schedule = (document) => {
    const key = document.uri.toString();
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      validate(document);
    }, VALIDATE_DELAY_MS));
  };

  vscode.workspace.textDocuments.forEach(validate);
  context.subscriptions.push(
    collection,
    vscode.workspace.onDidOpenTextDocument(validate),
    vscode.workspace.onDidChangeTextDocument((event) => schedule(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => {
      clearTimeout(timers.get(document.uri.toString()));
      collection.delete(document.uri);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('bbcode.validate')) vscode.workspace.textDocuments.forEach(validate);
    }),
    { dispose: () => timers.forEach(clearTimeout) }
  );
}

// ---------------------------------------------------------------------------
// Formato: Cmd+B, Cmd+I, Cmd+U, enlace
// ---------------------------------------------------------------------------

/**
 * Si la selección ya está envuelta en la etiqueta (dentro o justo alrededor),
 * devuelve la edición que la quita; si no, null.
 */
function findUnwrap(document, selection, tag) {
  const selected = document.getText(selection);
  const inside = selected.match(new RegExp(`^\\[${tag}(?:=[^\\]]*)?\\]([\\s\\S]*)\\[\\/${tag}\\]$`, 'i'));
  if (inside) return { range: selection, text: inside[1] };

  const before = document.getText(new vscode.Range(new vscode.Position(Math.max(0, selection.start.line - 1), 0), selection.start));
  const after = document.getText(new vscode.Range(selection.end, document.lineAt(Math.min(document.lineCount - 1, selection.end.line + 1)).range.end));
  const open = before.match(new RegExp(`\\[${tag}(?:=[^\\]]*)?\\]$`, 'i'));
  const close = after.match(new RegExp(`^\\[\\/${tag}\\]`, 'i'));
  if (!open || !close) return null;

  const startOffset = document.offsetAt(selection.start) - open[0].length;
  const endOffset = document.offsetAt(selection.end) + close[0].length;
  return {
    range: new vscode.Range(document.positionAt(startOffset), document.positionAt(endOffset)),
    text: selected
  };
}

async function toggleTag(args) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isBBCode(editor.document)) return;
  const tag = String((args && args.tag) || 'B');
  const { document } = editor;

  const unwraps = editor.selections.map((selection) => findUnwrap(document, selection, tag));
  if (unwraps.every(Boolean)) {
    await editor.edit((builder) => unwraps.forEach((u) => builder.replace(u.range, u.text)));
    return;
  }

  const name = applyCase(tag, document);
  await editor.insertSnippet(new vscode.SnippetString(`[${name}]\${1:\${TM_SELECTED_TEXT}}[/${name}]`));
}

async function insertLink() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isBBCode(editor.document)) return;
  const name = applyCase('url', editor.document);
  const selected = editor.document.getText(editor.selection).trim();

  const snippet = /^(https?:\/\/|www\.)\S+$/i.test(selected)
    ? `[${name}=\${TM_SELECTED_TEXT}]\${1:texto}[/${name}]`
    : `[${name}=\${1:https://}]\${2:\${TM_SELECTED_TEXT}}[/${name}]`;
  await editor.insertSnippet(new vscode.SnippetString(snippet));
}

// ---------------------------------------------------------------------------
// Autocierre: al escribir "[/" se completa la última etiqueta abierta
// ---------------------------------------------------------------------------

function registerAutoClose(context) {
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document || !isBBCode(event.document)) return;
    if (event.reason !== undefined) return; // deshacer / rehacer
    if (event.contentChanges.length !== 1 || editor.selections.length !== 1) return;

    const change = event.contentChanges[0];
    if (change.text !== '/' || change.rangeLength !== 0) return;
    if (!config(event.document).get('autoCloseTags', true)) return;

    const { document } = event;
    const slashOffset = change.rangeOffset;
    if (slashOffset === 0 || document.getText().charAt(slashOffset - 1) !== '[') return;

    const open = openTagsAt(document.getText().slice(0, slashOffset - 1));
    const name = open[open.length - 1];
    if (!name) return;

    const version = document.version;
    const insertAt = document.positionAt(slashOffset + 1);
    const hasBracket = document.getText(new vscode.Range(insertAt, insertAt.translate(0, 1))) === ']';
    // Se espera a que termine el evento para no editar dentro de él.
    setTimeout(async () => {
      if (vscode.window.activeTextEditor !== editor || document.version !== version) return;
      const applied = await editor.edit(
        (builder) => builder.insert(insertAt, hasBracket ? name : `${name}]`),
        { undoStopBefore: false, undoStopAfter: false }
      );
      if (applied) {
        const cursor = insertAt.translate(0, name.length + 1);
        editor.selection = new vscode.Selection(cursor, cursor);
      }
    }, 0);
  }));
}

// ---------------------------------------------------------------------------
// Autocompletado de etiquetas
// ---------------------------------------------------------------------------

const COLORS = 'Red,DeepSkyBlue,Blue,Green,Orange,Magenta,Cyan,Plum,Gray,Black,White';

/** Etiquetas sugeridas al escribir "[". `{T}` es el nombre con el estilo de mayúsculas del documento. */
const TAG_COMPLETIONS = [
  { name: 'B', detail: 'Negrita', body: '{T}]$1[/{T}]' },
  { name: 'I', detail: 'Cursiva', body: '{T}]$1[/{T}]' },
  { name: 'U', detail: 'Subrayado', body: '{T}]$1[/{T}]' },
  { name: 'S', detail: 'Tachado', body: '{T}]$1[/{T}]' },
  { name: 'COLOR', detail: 'Color del texto', body: `{T}=\${1|${COLORS}|}]$2[/{T}]` },
  { name: 'SIZE', detail: 'Tamaño (1-7)', body: '{T}=${1|4,1,2,3,5,6,7|}]$2[/{T}]' },
  { name: 'FONT', detail: 'Fuente', body: '{T}=${1|Verdana,Arial,Courier New,Georgia,Tahoma|}]$2[/{T}]' },
  { name: 'CENTER', detail: 'Centrar', body: '{T}]$1[/{T}]' },
  { name: 'LEFT', detail: 'Alinear a la izquierda', body: '{T}]$1[/{T}]' },
  { name: 'RIGHT', detail: 'Alinear a la derecha', body: '{T}]$1[/{T}]' },
  { name: 'JUSTIFY', detail: 'Justificar', body: '{T}]$1[/{T}]' },
  { name: 'INDENT', detail: 'Sangría', body: '{T}]$1[/{T}]' },
  { name: 'HEADING', detail: 'Título de sección', body: '{T}=${1|1,2,3|}]$2[/{T}]' },
  { name: 'URL', detail: 'Enlace con texto', body: '{T}=${1:https://}]${2:texto}[/{T}]' },
  { name: 'URL', label: 'URL (solo enlace)', detail: 'Enlace simple', body: '{T}]${1:https://}[/{T}]' },
  { name: 'IMG', detail: 'Imagen', body: '{T}]${1:https://}[/{T}]' },
  { name: 'MEDIA', detail: 'Video de YouTube', body: '{T}=youtube]${1:id}[/{T}]' },
  { name: 'MENTION', detail: 'Mencionar usuario', body: '{T}=${1:id}]${2:usuario}[/{T}]' },
  { name: 'EMAIL', detail: 'Correo', body: '{T}]${1:correo@ejemplo.com}[/{T}]' },
  { name: 'QUOTE', detail: 'Cita', body: '{T}]$1[/{T}]' },
  { name: 'QUOTE', label: 'QUOTE=autor', detail: 'Cita con autor', body: '{T}="${1:autor}"]$2[/{T}]' },
  { name: 'SPOILER', detail: 'Spoiler con título', body: '{T}="${1:título}"]\n$2\n[/{T}]' },
  { name: 'ISPOILER', detail: 'Spoiler en línea', body: '{T}]$1[/{T}]' },
  { name: 'CODE', detail: 'Bloque de código', body: '{T}]\n$1\n[/{T}]' },
  { name: 'CODE', label: 'CODE=lenguaje', detail: 'Código con lenguaje', body: '{T}=${1|bash,java,c,cpp,js,php,python,xml|}]\n$2\n[/{T}]' },
  { name: 'ICODE', detail: 'Código en línea', body: '{T}]$1[/{T}]' },
  { name: 'PLAIN', detail: 'Texto sin BBCode', body: '{T}]$1[/{T}]' },
  { name: 'LIST', detail: 'Lista con viñetas', body: '{T}]\n[*]$1\n[/{T}]' },
  { name: 'LIST', label: 'LIST=1', detail: 'Lista numerada', body: '{T}=${1|1,a,A,i,I|}]\n[*]$2\n[/{T}]' },
  { name: '*', detail: 'Item de lista', body: '*]$0' },
  { name: 'TABLE', detail: 'Tabla', body: '{T}]\n[TR][TD]$1[/TD][TD]$2[/TD][/TR]\n[/{T}]' },
  { name: 'TR', detail: 'Fila de tabla', body: '{T}]$1[/{T}]' },
  { name: 'TD', detail: 'Celda de tabla', body: '{T}]$1[/{T}]' },
  { name: 'HR', detail: 'Línea horizontal', body: '{T}]$0' },
  { name: 'SUB', detail: 'Subíndice', body: '{T}]$1[/{T}]' },
  { name: 'SUP', detail: 'Superíndice', body: '{T}]$1[/{T}]' }
];

function provideCompletions(document, position) {
  const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
  const match = linePrefix.match(/\[(\/?)([a-zA-Z*]*)$/);
  if (!match) return undefined;

  const [, slash, typed] = match;
  const nextChar = document.getText(new vscode.Range(position, position.translate(0, 1)));
  const start = position.translate(0, -typed.length);
  // Incluye el "]" que agrega el autocierre de corchetes.
  const range = new vscode.Range(start, nextChar === ']' ? position.translate(0, 1) : position);

  if (slash) {
    // Con el autocierre activo el cierre ya se inserta solo.
    if (config(document).get('autoCloseTags', true)) return undefined;
    const before = document.getText(new vscode.Range(new vscode.Position(0, 0), start.translate(0, -2)));
    return openTagsAt(before).reverse().map((name, index) => {
      const item = new vscode.CompletionItem(`/${name}`, vscode.CompletionItemKind.Keyword);
      item.insertText = `${name}]`;
      item.filterText = name;
      item.range = range;
      item.detail = index === 0 ? 'Cerrar la última etiqueta abierta' : 'Cerrar etiqueta abierta';
      item.sortText = String(index).padStart(3, '0');
      if (index === 0) item.preselect = true;
      return item;
    });
  }

  const lower = tagCase(document) === 'lower';
  return TAG_COMPLETIONS.map((tag, index) => {
    const name = lower ? tag.name.toLowerCase() : tag.name;
    const label = tag.label ? (lower ? tag.label.toLowerCase() : tag.label) : name;
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
    let body = tag.body.replace(/\{T\}/g, name);
    if (lower) body = body.replace(/\[(\/?)(TR|TD)\]/g, (_m, s, t) => `[${s}${t.toLowerCase()}]`);
    item.insertText = new vscode.SnippetString(body);
    item.filterText = name;
    item.range = range;
    item.detail = tag.detail;
    item.sortText = String(index).padStart(3, '0');
    return item;
  });
}

// ---------------------------------------------------------------------------
// Esquema (Outline / breadcrumbs) y plegado
// ---------------------------------------------------------------------------

function provideDocumentSymbols(document) {
  const roots = [];
  const stack = [];
  for (const item of outline(document.getText())) {
    const end = document.lineAt(item.endLine).range.end;
    const range = new vscode.Range(item.line, 0, end.line, end.character);
    const selection = document.lineAt(item.line).range;
    const kind = item.kind === 'spoiler' ? vscode.SymbolKind.Object : vscode.SymbolKind.String;
    const symbol = new vscode.DocumentSymbol(item.title, '', kind, range, selection);

    while (stack.length && (stack[stack.length - 1].level >= item.level || stack[stack.length - 1].endLine < item.line)) {
      stack.pop();
    }
    if (stack.length) stack[stack.length - 1].symbol.children.push(symbol);
    else roots.push(symbol);
    stack.push({ level: item.level, endLine: item.endLine, symbol });
  }
  return roots;
}

function provideFoldingRanges(document) {
  return foldingRanges(document.getText()).map((range) => new vscode.FoldingRange(range.start, range.end));
}

/**
 * @param {vscode.ExtensionContext} context
 */
function registerEditorFeatures(context) {
  registerDiagnostics(context);
  registerAutoClose(context);
  context.subscriptions.push(
    vscode.commands.registerCommand('bbcode.toggleTag', toggleTag),
    vscode.commands.registerCommand('bbcode.insertLink', insertLink),
    vscode.languages.registerCompletionItemProvider('bbcode', { provideCompletionItems: provideCompletions }, '[', '/'),
    vscode.languages.registerDocumentSymbolProvider('bbcode', { provideDocumentSymbols }, { label: 'BBCode' }),
    vscode.languages.registerFoldingRangeProvider('bbcode', { provideFoldingRanges })
  );
}

module.exports = { registerEditorFeatures };
