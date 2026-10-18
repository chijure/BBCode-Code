const vscode = require('vscode');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { bbcodeToHtml } = require('./bbcode-renderer');
const { registerEditorFeatures } = require('./editor-features');
const { buildPage, buildContent, THEMES } = require('./preview-html');

const UPDATE_DELAY_MS = 150;

/**
 * Datos del contenido de la vista previa (sin la página alrededor).
 */
function previewOptions(webview, document) {
  const config = vscode.workspace.getConfiguration('bbcode.preview', document.uri);
  const baseUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
  const theme = config.get('theme', 'xda');

  const body = bbcodeToHtml(document.getText(), {
    mentionUrl: config.get('mentionUrl'),
    collapseBlankLines: theme !== 'vscode' && config.get('xdaLineBreaks', true),
    lineMarkers: true,
    resolveImage: (src) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) {
        return src.startsWith('file:') ? webview.asWebviewUri(vscode.Uri.parse(src)).toString() : src;
      }
      const target = path.isAbsolute(src) ? vscode.Uri.file(src) : vscode.Uri.joinPath(baseUri, src);
      return webview.asWebviewUri(target).toString();
    }
  });

  return {
    body,
    theme,
    title: path.basename(document.fileName).replace(/\.bbcode$/i, ''),
    author: os.userInfo().username
  };
}

/**
 * Construye el HTML completo para el webview.
 */
function buildPreviewHtml(webview, document, line) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: http: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`
  ].join('; ');

  return buildPage({ ...previewOptions(webview, document), csp, nonce, line, uri: document.uri.toString() });
}

// ---------------------------------------------------------------------------
// Copiar y exportar a HTML
// ---------------------------------------------------------------------------

function activeBBCodeDocument() {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === 'bbcode') return editor.document;
  vscode.window.showInformationMessage('Abre un archivo .bbcode para usar este comando.');
  return undefined;
}

function exportBody(document) {
  const config = vscode.workspace.getConfiguration('bbcode.preview', document.uri);
  return bbcodeToHtml(document.getText(), {
    mentionUrl: config.get('mentionUrl'),
    collapseBlankLines: config.get('xdaLineBreaks', true)
  });
}

async function copyHtml() {
  const document = activeBBCodeDocument();
  if (!document) return;
  await vscode.env.clipboard.writeText(exportBody(document));
  vscode.window.setStatusBarMessage('BBCode: HTML copiado al portapapeles', 3000);
}

async function exportHtml() {
  const document = activeBBCodeDocument();
  if (!document) return;
  const config = vscode.workspace.getConfiguration('bbcode.preview', document.uri);
  let theme = config.get('theme', 'xda');
  // Fuera de VS Code no se sabe si el tema es claro u oscuro: se usa el actual.
  if (theme === 'xda') {
    const kind = vscode.window.activeColorTheme.kind;
    theme = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight ? 'xda-light' : 'xda-dark';
  }

  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(document.uri.fsPath.replace(/\.bbcode$/i, '') + '.html'),
    filters: { HTML: ['html'] },
    saveLabel: 'Exportar'
  });
  if (!target) return;

  const html = buildPage({
    body: exportBody(document),
    csp: "default-src 'none'; img-src https: http: data: file:; style-src 'unsafe-inline'",
    theme,
    title: path.basename(document.fileName).replace(/\.bbcode$/i, ''),
    author: os.userInfo().username
  });
  await vscode.workspace.fs.writeFile(target, Buffer.from(html, 'utf8'));

  const open = await vscode.window.showInformationMessage(`Exportado: ${path.basename(target.fsPath)}`, 'Abrir en el navegador');
  if (open) vscode.env.openExternal(target);
}

const THEME_LABELS = {
  xda: 'XDA (oscuro o claro según VS Code)',
  'xda-dark': 'XDA Dark',
  'xda-light': 'XDA Theme (claro)',
  'xda-classic': 'XDA Classic',
  vscode: 'Colores del editor'
};

async function changeTheme() {
  const config = vscode.workspace.getConfiguration('bbcode.preview');
  const current = config.get('theme', 'xda');
  const picked = await vscode.window.showQuickPick(
    THEMES.map((theme) => ({ label: THEME_LABELS[theme], description: theme === current ? 'actual' : '', theme })),
    { placeHolder: 'Estilo de la vista previa BBCode' }
  );
  if (picked) await config.update('theme', picked.theme, vscode.ConfigurationTarget.Global);
}

const editorFor = (document) => vscode.window.visibleTextEditors.find((editor) => editor.document === document);
const topLine = (editor) => (editor && editor.visibleRanges.length ? editor.visibleRanges[0].start.line : 0);
const syncSetting = (name) => vscode.workspace.getConfiguration('bbcode.preview').get(name, true);

/**
 * Panel de vista previa único que sigue al documento BBCode activo y
 * sincroniza su scroll con el editor.
 */
class PreviewManager {
  constructor() {
    this.panel = undefined;
    this.document = undefined;
    this.timer = undefined;
    // Evita que un scroll provocado por la sincronización rebote al otro lado.
    this.ignoreEditorScrollUntil = 0;
    this.ignorePreviewScrollUntil = 0;
    this.disposables = [
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === this.document) this.scheduleUpdate();
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (this.panel && editor && editor.document.languageId === 'bbcode' && editor.document !== this.document) {
          this.setDocument(editor.document);
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (!this.panel || event.textEditor.document !== this.document) return;
        if (Date.now() < this.ignoreEditorScrollUntil || !syncSetting('scrollPreviewWithEditor')) return;
        this.ignorePreviewScrollUntil = Date.now() + 500;
        this.panel.webview.postMessage({ type: 'scroll', line: topLine(event.textEditor) });
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('bbcode.preview')) this.scheduleUpdate();
      })
    ];
  }

  show(document) {
    if (!this.panel) {
      this.attach(vscode.window.createWebviewPanel(
        'bbcodePreview',
        'BBCode Preview',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: true, enableFindWidget: true }
      ));
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
    }
    this.setDocument(document);
  }

  /**
   * Reabre la vista previa que estaba abierta al cerrar VS Code.
   */
  async restore(panel, state) {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.uri));
      if (this.panel) this.panel.dispose();
      this.attach(panel);
      this.setDocument(document, state.line);
    } catch {
      panel.dispose();
    }
  }

  attach(panel) {
    this.panel = panel;
    panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'images', 'icon.png');
    panel.webview.onDidReceiveMessage((message) => this.onMessage(message));
    panel.onDidDispose(() => {
      if (this.panel !== panel) return;
      this.panel = undefined;
      this.document = undefined;
      clearTimeout(this.timer);
    });
  }

  setDocument(document, line) {
    this.document = document;
    const docFolder = vscode.Uri.file(path.dirname(document.uri.fsPath));
    const workspaceFolders = (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri);
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [docFolder, ...workspaceFolders]
    };
    this.panel.title = `Preview ${path.basename(document.fileName)}`;
    const startLine = line !== undefined ? line : topLine(editorFor(document));
    this.panel.webview.html = buildPreviewHtml(this.panel.webview, document, startLine);
  }

  scheduleUpdate() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), UPDATE_DELAY_MS);
  }

  // Reemplaza solo el contenido, para no perder la posición del scroll.
  update() {
    if (!this.panel || !this.document) return;
    const { className, html } = buildContent(previewOptions(this.panel.webview, this.document));
    this.ignorePreviewScrollUntil = Date.now() + 500;
    this.panel.webview.postMessage({ type: 'update', className, html });
  }

  async onMessage(message) {
    if (!this.document || typeof message.line !== 'number') return;
    const line = Math.max(0, Math.min(message.line, this.document.lineCount - 1));
    const position = new vscode.Position(line, 0);

    if (message.type === 'reveal') {
      const editor = editorFor(this.document);
      if (!editor || !syncSetting('scrollEditorWithPreview') || Date.now() < this.ignorePreviewScrollUntil) return;
      this.ignoreEditorScrollUntil = Date.now() + 300;
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
    } else if (message.type === 'open') {
      const editor = editorFor(this.document);
      await vscode.window.showTextDocument(this.document, {
        viewColumn: editor ? editor.viewColumn : vscode.ViewColumn.One,
        selection: new vscode.Range(position, position)
      });
    }
  }

  dispose() {
    clearTimeout(this.timer);
    if (this.panel) this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const manager = new PreviewManager();
  manager.extensionUri = context.extensionUri;

  const previewCommand = vscode.commands.registerCommand('bbcode.preview', (uri) => {
    const editor = vscode.window.activeTextEditor;
    const fromUri = uri instanceof vscode.Uri
      ? vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString())
      : undefined;
    const document = fromUri || (editor && editor.document);

    if (!document || document.languageId !== 'bbcode') {
      vscode.window.showInformationMessage('Abre un archivo .bbcode para ver la vista previa.');
      return;
    }
    manager.show(document);
  });

  context.subscriptions.push(
    previewCommand,
    manager,
    vscode.commands.registerCommand('bbcode.preview.changeTheme', changeTheme),
    vscode.commands.registerCommand('bbcode.copyHtml', copyHtml),
    vscode.commands.registerCommand('bbcode.exportHtml', exportHtml),
    vscode.window.registerWebviewPanelSerializer('bbcodePreview', {
      deserializeWebviewPanel: async (panel, state) => {
        if (state && state.uri) await manager.restore(panel, state);
        else panel.dispose();
      }
    })
  );
  registerEditorFeatures(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
