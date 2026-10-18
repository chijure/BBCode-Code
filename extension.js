const vscode = require('vscode');
const path = require('path');
const os = require('os');
const { bbcodeToHtml } = require('./bbcode-renderer');
const { registerEditorFeatures } = require('./editor-features');
const { buildPage, THEMES } = require('./preview-html');

const UPDATE_DELAY_MS = 150;

/**
 * Construye el HTML completo para el webview.
 */
function buildPreviewHtml(webview, document) {
  const config = vscode.workspace.getConfiguration('bbcode.preview', document.uri);
  const baseUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
  const theme = config.get('theme', 'xda');

  const body = bbcodeToHtml(document.getText(), {
    mentionUrl: config.get('mentionUrl'),
    collapseBlankLines: theme !== 'vscode' && config.get('xdaLineBreaks', true),
    resolveImage: (src) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) {
        return src.startsWith('file:') ? webview.asWebviewUri(vscode.Uri.parse(src)).toString() : src;
      }
      const target = path.isAbsolute(src) ? vscode.Uri.file(src) : vscode.Uri.joinPath(baseUri, src);
      return webview.asWebviewUri(target).toString();
    }
  });

  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: http: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`
  ].join('; ');

  return buildPage({
    body,
    csp,
    theme,
    title: path.basename(document.fileName).replace(/\.bbcode$/i, ''),
    author: config.get('author') || os.userInfo().username,
    userTitle: config.get('userTitle', 'Senior Member'),
    avatarUrl: config.get('avatarUrl', '')
  });
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

/**
 * Panel de vista previa único que sigue al documento BBCode activo.
 */
class PreviewManager {
  constructor() {
    this.panel = undefined;
    this.document = undefined;
    this.timer = undefined;
    this.disposables = [
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === this.document) this.scheduleUpdate();
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (this.panel && editor && editor.document.languageId === 'bbcode' && editor.document !== this.document) {
          this.setDocument(editor.document);
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('bbcode.preview')) this.scheduleUpdate();
      })
    ];
  }

  show(document) {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'bbcodePreview',
        'BBCode Preview',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, enableFindWidget: true }
      );
      this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'images', 'icon.png');
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.document = undefined;
        clearTimeout(this.timer);
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
    }
    this.setDocument(document);
  }

  setDocument(document) {
    this.document = document;
    const docFolder = vscode.Uri.file(path.dirname(document.uri.fsPath));
    const workspaceFolders = (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri);
    this.panel.webview.options = {
      enableScripts: false,
      localResourceRoots: [docFolder, ...workspaceFolders]
    };
    this.panel.title = `Preview ${path.basename(document.fileName)}`;
    this.update();
  }

  scheduleUpdate() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), UPDATE_DELAY_MS);
  }

  update() {
    if (!this.panel || !this.document) return;
    this.panel.webview.html = buildPreviewHtml(this.panel.webview, this.document);
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
    vscode.commands.registerCommand('bbcode.preview.changeTheme', changeTheme)
  );
  registerEditorFeatures(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
