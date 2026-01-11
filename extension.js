const vscode = require('vscode');

/**
 * Convert a subset de BBCode a HTML sencillo para la vista previa.
 */
function bbcodeToHtml(text) {
  const escapeHtml = (value) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  let html = escapeHtml(text);

  const simpleTags = [
    { bb: 'b', html: 'strong' },
    { bb: 'i', html: 'em' },
    { bb: 'u', html: 'u' },
    { bb: 's', html: 's' },
    { bb: 'quote', html: 'blockquote' }
  ];

  simpleTags.forEach(({ bb, html: tag }) => {
    const regex = new RegExp(`\\[${bb}\\]([\\s\\S]*?)\\[\\/${bb}\\]`, 'gi');
    html = html.replace(regex, `<${tag}>$1</${tag}>`);
  });

  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>');

  html = html.replace(
    /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
    (_match, link, label) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${label}</a>`
  );

  html = html.replace(/\[img\]([^\]]+)\[\/img\]/gi, (_match, src) => {
    const sanitizedSrc = escapeHtml(src.trim());
    return `<img src="${sanitizedSrc}" alt="BBCode image" />`;
  });

  return html;
}

/**
 * Construye el HTML completo para el webview.
 */
function buildPreviewHtml(content) {
  const body = bbcodeToHtml(content);
  return /* html */ `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          margin: 0;
          padding: 16px;
          line-height: 1.5;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        a { color: var(--vscode-textLink-foreground); }
        pre {
          background: var(--vscode-editor-inactiveSelectionBackground);
          padding: 12px;
          border-radius: 6px;
          overflow: auto;
        }
        blockquote {
          border-left: 3px solid var(--vscode-editor-foreground);
          padding-left: 12px;
          margin-left: 0;
          opacity: 0.9;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        .container {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <div class="container">${body}</div>
    </body>
  </html>`;
}

/**
 * Muestra la vista previa en un webview al lado del editor activo.
 */
function openPreview() {
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document.languageId !== 'bbcode') {
    vscode.window.showInformationMessage('Abre un archivo .bbcode para ver la vista previa.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'bbcodePreview',
    'BBCode Preview',
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  const update = () => {
    const content = editor.document.getText();
    panel.webview.html = buildPreviewHtml(content);
  };

  update();

  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === editor.document) {
      update();
    }
  });

  panel.onDidDispose(() => changeSubscription.dispose());
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const previewCommand = vscode.commands.registerCommand('bbcode.preview', openPreview);
  context.subscriptions.push(previewCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
