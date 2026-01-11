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

  // Named quote [quote=Name]text[/quote]
  html = html.replace(
    /\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi,
    (_m, name, body) => `<blockquote><cite>${escapeHtml(name)}</cite>${body}</blockquote>`
  );

  // Text alignment
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center;">$1</div>');
  html = html.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align:left;">$1</div>');
  html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align:right;">$1</div>');

  // Size and color
  html = html.replace(
    /\[size=([0-9]{1,3})\]([\s\S]*?)\[\/size\]/gi,
    (_m, size, body) => `<span style="font-size:${size}px;">${body}</span>`
  );
  html = html.replace(
    /\[color=([#a-zA-Z0-9(),.\s]+)\]([\s\S]*?)\[\/color\]/gi,
    (_m, color, body) => `<span style="color:${escapeHtml(color.trim())};">${body}</span>`
  );
  // [style size=...] or [style color=...] (limited safe subset)
  html = html.replace(/\[style\s+([^\]]+)\]([\s\S]*?)\[\/style\]/gi, (_m, attrs, body) => {
    const styleParts = [];
    const sizeMatch = attrs.match(/size\s*=\s*([0-9]{1,3})/i);
    if (sizeMatch) styleParts.push(`font-size:${sizeMatch[1]}px`);
    const colorMatch = attrs.match(/color\s*=\s*([#a-zA-Z0-9(),.\s]+)/i);
    if (colorMatch) styleParts.push(`color:${escapeHtml(colorMatch[1].trim())}`);
    const style = styleParts.join(';');
    return style ? `<span style="${style};">${body}</span>` : body;
  });

  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>');
  html = html.replace(/\[code=([^\]]+)\]([\s\S]*?)\[\/code\]/gi, (_m, lang, body) =>
    `<pre><code data-lang="${escapeHtml(lang)}">${body}</code></pre>`
  );
  html = html.replace(/\[pre\]([\s\S]*?)\[\/pre\]/gi, '<pre>$1</pre>');

  html = html.replace(
    /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
    (_match, link, label) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${label}</a>`
  );
  html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, link) => {
    const sanitized = escapeHtml(link.trim());
    return `<a href="${sanitized}" target="_blank" rel="noopener">${sanitized}</a>`;
  });

  html = html.replace(/\[img\]([^\]]+)\[\/img\]/gi, (_match, src) => {
    const sanitizedSrc = escapeHtml(src.trim());
    return `<img src="${sanitizedSrc}" alt="BBCode image" />`;
  });
  html = html.replace(
    /\[img\s+width=([0-9]{1,4})(?:\s+height=([0-9]{1,4}))?\]([^\]]+)\[\/img\]/gi,
    (_m, w, h, src) => {
      const sanitizedSrc = escapeHtml(src.trim());
      const sizeAttrs = [`width="${w}"`].concat(h ? [`height="${h}"`] : []).join(' ');
      return `<img src="${sanitizedSrc}" ${sizeAttrs} alt="BBCode image" />`;
    }
  );
  html = html.replace(/\[img=([0-9]{1,4})x([0-9]{1,4})\]([^\]]+)\[\/img\]/gi, (_m, w, h, src) => {
    const sanitizedSrc = escapeHtml(src.trim());
    return `<img src="${sanitizedSrc}" width="${w}" height="${h}" alt="BBCode image" />`;
  });

  // Spoiler
  html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<details><summary>Spoiler</summary><div>$1</div></details>');

  // Lists and items
  const convertList = (pattern, tagName) => {
    // Repeat until no more matches so nested lists also get converted
    let replaced = true;
    while (replaced) {
      replaced = false;
      html = html.replace(pattern, (_m, body) => {
        replaced = true;
        let items = body.replace(/\[\*\]([^\[]+)/g, (_m2, item) => `<li>${item.trim()}</li>`);
        items = items.replace(/\[li\]([\s\S]*?)\[\/li\]/gi, (_m2, item) => `<li>${item.trim()}</li>`);
        return `<${tagName}>${items}</${tagName}>`;
      });
    }
  };
  convertList(/\[list\]([\s\S]*?)\[\/list\]/gi, 'ul');
  convertList(/\[ul\]([\s\S]*?)\[\/ul\]/gi, 'ul');
  convertList(/\[ol\]([\s\S]*?)\[\/ol\]/gi, 'ol');

  // Tables
  html = html.replace(/\[table\]([\s\S]*?)\[\/table\]/gi, '<table>$1</table>');
  html = html.replace(/\[tr\]([\s\S]*?)\[\/tr\]/gi, '<tr>$1</tr>');
  html = html.replace(/\[th\]([\s\S]*?)\[\/th\]/gi, '<th>$1</th>');
  html = html.replace(/\[td\]([\s\S]*?)\[\/td\]/gi, '<td>$1</td>');

  // YouTube embeds
  html = html.replace(/\[youtube\]([a-zA-Z0-9_-]{5,})\[\/youtube\]/gi, (_m, id) => {
    const safeId = escapeHtml(id.trim());
    return `<iframe src="https://www.youtube.com/embed/${safeId}" title="YouTube video" frameborder="0" allowfullscreen></iframe>`;
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
