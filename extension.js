const vscode = require('vscode');
const path = require('path');
const { bbcodeToHtml } = require('./bbcode-renderer');
const { registerEditorFeatures } = require('./editor-features');

const UPDATE_DELAY_MS = 150;

/**
 * Construye el HTML completo para el webview.
 */
function buildPreviewHtml(webview, document) {
  const config = vscode.workspace.getConfiguration('bbcode.preview', document.uri);
  const baseUri = vscode.Uri.file(path.dirname(document.uri.fsPath));

  const body = bbcodeToHtml(document.getText(), {
    mentionUrl: config.get('mentionUrl'),
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

  return /* html */ `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" content="${csp}" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          color-scheme: light dark;
          --bb-border: var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
          --bb-muted-bg: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.1));
          --bb-accent: var(--vscode-textLink-foreground, #e45);
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 15px;
          margin: 0;
          padding: 16px 24px;
          line-height: 1.5;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          word-wrap: break-word;
        }
        a { color: var(--vscode-textLink-foreground); text-decoration: none; }
        a:hover { text-decoration: underline; }
        ul, ol { margin: 4px 0; padding-left: 28px; }
        img { max-width: 100%; height: auto; vertical-align: middle; }
        hr { border: 0; border-top: 1px solid var(--bb-border); }
        .bb-quote {
          margin: 8px 0;
          border: 1px solid var(--bb-border);
          border-left: 3px solid var(--bb-accent);
          background: var(--bb-muted-bg);
          border-radius: 3px;
        }
        .bb-quote-title { padding: 6px 12px 0; font-weight: 600; color: var(--bb-accent); }
        .bb-quote-body { padding: 8px 12px; }
        .bb-code { margin: 8px 0; border: 1px solid var(--bb-border); border-radius: 3px; overflow: hidden; }
        .bb-code-title {
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          background: var(--bb-muted-bg);
          border-bottom: 1px solid var(--bb-border);
        }
        .bb-code pre {
          margin: 0;
          padding: 10px;
          overflow: auto;
          max-height: 400px;
          background: var(--vscode-textCodeBlock-background, var(--bb-muted-bg));
        }
        code, .bb-icode { font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; }
        .bb-icode { padding: 1px 4px; border-radius: 3px; background: var(--bb-muted-bg); }
        .bb-spoiler { margin: 8px 0; border: 1px solid var(--bb-border); border-radius: 3px; }
        .bb-spoiler summary { padding: 6px 10px; cursor: pointer; font-weight: 600; background: var(--bb-muted-bg); }
        .bb-spoiler-body { padding: 8px 12px; }
        .bb-ispoiler { background: currentColor; border-radius: 2px; }
        .bb-ispoiler:hover { background: transparent; }
        .bb-table { border-collapse: collapse; margin: 8px 0; }
        .bb-table td, .bb-table th { border: 1px solid var(--bb-border); padding: 4px 8px; vertical-align: top; }
        .bb-table th { background: var(--bb-muted-bg); }
        .bb-mention { font-weight: 600; }
        .bb-attach { padding: 2px 6px; border: 1px dashed var(--bb-border); border-radius: 3px; }
        .bb-media { position: relative; display: inline-block; max-width: 480px; }
        .bb-media-label {
          position: absolute; left: 8px; bottom: 8px; padding: 2px 8px; border-radius: 3px;
          background: rgba(0, 0, 0, 0.75); color: #fff; font-size: 12px;
        }
        .bb-heading { margin: 12px 0 6px; }
      </style>
    </head>
    <body>${body}</body>
  </html>`;
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

  context.subscriptions.push(previewCommand, manager);
  registerEditorFeatures(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
