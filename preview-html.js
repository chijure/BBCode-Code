'use strict';

/**
 * Página HTML de la vista previa. Es independiente de la API de VS Code.
 *
 * Los colores y medidas de los temas de XDA salen del CSS de xdaforums.com
 * (XenForo 2 + UI.X): "XDA Dark", "XDA Theme" (claro) y "XDA Classic".
 *
 * Temas:
 *   xda          oscuro o claro según el tema de VS Code
 *   xda-dark     XDA Dark
 *   xda-light    XDA Theme (claro)
 *   xda-classic  XDA Classic
 *   vscode       solo el contenido, con los colores del editor
 */
const THEMES = ['xda', 'xda-dark', 'xda-light', 'xda-classic', 'vscode'];

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const XDA_DARK = `
  --page-bg: #24272c;
  --header-bg: #1b1d21;
  --header-fg: #a1a3ae;
  --post-bg: #2d3036;
  --user-bg: #393d43;
  --fg: #ffffff;
  --muted: #a1a3ae;
  --border: #474c54;
  --link: #2daae9;
  --link-hover: #1db4ff;
  --accent: #2daae9;
  --block-bg: #393d43;
  --block-border: 0 solid #474c54;
  --block-border-left: 3px solid #2daae9;
  --block-title-border: #50565f;
  --block-title-padding: 12px 15px;
  --block-title-size: 12px;
  --quote-size: 12px;
  --code-bg: #2d3036;
  --button-bg: #1b1d21;
  --button-fg: #2daae9;
  --button-hover-bg: #101113;
  --button-hover-fg: #ffffff;
  --radius: 4px;
  --shadow: 0 2px 4px 0 rgba(27, 29, 33, 0.1), 0 10px 16px 0 rgba(27, 29, 33, 0.3);
  --font-size: 13px;
  --title-size: 22px;
`;

const XDA_LIGHT = `
  --page-bg: #f7f9fc;
  --header-bg: #eaedf2;
  --header-fg: #70727b;
  --post-bg: #ffffff;
  --user-bg: #f1f3f6;
  --fg: #1b1d21;
  --muted: #70727b;
  --border: #d7dde6;
  --link: #1b7cad;
  --link-hover: #2092cc;
  --accent: #2daae9;
  --block-bg: #f1f3f6;
  --block-border: 0 solid #d7dde6;
  --block-border-left: 3px solid #2daae9;
  --block-title-border: #cbd2de;
  --block-title-padding: 12px 15px;
  --block-title-size: 12px;
  --quote-size: 12px;
  --code-bg: #ffffff;
  --button-bg: #eaedf2;
  --button-fg: #1b7cad;
  --button-hover-bg: #dae0e8;
  --button-hover-fg: #1b1d21;
  --radius: 4px;
  --shadow: 0 2px 4px 0 rgba(48, 51, 57, 0.04), 0 10px 20px 0 rgba(48, 51, 57, 0.12);
  --font-size: 13px;
  --title-size: 22px;
`;

const XDA_CLASSIC = `
  --page-bg: #ebebeb;
  --header-bg: #ebebeb;
  --header-fg: #70727b;
  --post-bg: #f9f9f9;
  --user-bg: #f9f9f9;
  --fg: #1b1d21;
  --muted: #70727b;
  --border: #d2d2d2;
  --link: #1b7cad;
  --link-hover: #2092cc;
  --accent: #2daae9;
  --block-bg: #ebebeb;
  --block-border: 1px solid #d2d2d2;
  --block-border-left: 1px solid #d2d2d2;
  --block-title-border: #c7c7c7;
  --block-title-padding: 10px 15px;
  --block-title-size: 13px;
  --quote-size: 13px;
  --code-bg: #f9f9f9;
  --button-bg: #f9f9f9;
  --button-fg: #1b7cad;
  --button-hover-bg: #ececec;
  --button-hover-fg: #1b1d21;
  --radius: 0;
  --shadow: none;
  --font-size: 14px;
  --title-size: 20px;
`;

const VSCODE_VARS = `
  --page-bg: var(--vscode-editor-background);
  --header-bg: var(--vscode-editor-background);
  --header-fg: var(--vscode-descriptionForeground, #888);
  --post-bg: var(--vscode-editor-background);
  --user-bg: var(--vscode-editor-background);
  --fg: var(--vscode-editor-foreground);
  --muted: var(--vscode-descriptionForeground, #888);
  --border: var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
  --link: var(--vscode-textLink-foreground);
  --link-hover: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
  --accent: var(--vscode-textLink-foreground);
  --block-bg: var(--vscode-textBlockQuote-background, rgba(128, 128, 128, 0.1));
  --block-border: 0 solid transparent;
  --block-border-left: 3px solid var(--vscode-textLink-foreground);
  --block-title-border: var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
  --block-title-padding: 8px 12px;
  --block-title-size: 12px;
  --quote-size: inherit;
  --code-bg: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.1));
  --button-bg: var(--vscode-button-secondaryBackground, rgba(128, 128, 128, 0.2));
  --button-fg: var(--vscode-button-secondaryForeground, inherit);
  --button-hover-bg: var(--vscode-button-secondaryHoverBackground, rgba(128, 128, 128, 0.3));
  --button-hover-fg: var(--vscode-button-secondaryForeground, inherit);
  --radius: 3px;
  --shadow: none;
  --font-size: 14px;
  --title-size: 20px;
`;

const STYLES = `
  .theme-xda-dark { ${XDA_DARK} }
  .theme-xda-light { ${XDA_LIGHT} }
  .theme-xda-classic { ${XDA_CLASSIC} }
  .theme-vscode { ${VSCODE_VARS} }
  body.vscode-light .theme-xda { ${XDA_LIGHT} }
  body.vscode-dark .theme-xda, body.vscode-high-contrast .theme-xda { ${XDA_DARK} }
  body.vscode-high-contrast-light .theme-xda { ${XDA_LIGHT} }

  html, body { margin: 0; padding: 0; }
  body { background: var(--vscode-editor-background); }
  .page {
    min-height: 100vh;
    box-sizing: border-box;
    padding: 20px;
    background: var(--page-bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: var(--font-size);
    line-height: 1.4;
    word-wrap: break-word;
  }
  .theme-vscode.page { padding: 16px 24px; line-height: 1.5; }

  /* Encabezado del hilo (.p-body-header) */
  .thread-header {
    margin-bottom: 20px;
    padding: 15px;
    background: var(--header-bg);
    border-radius: var(--radius);
    color: var(--header-fg);
  }
  .thread-title { margin: 0 0 3px; font-size: var(--title-size); font-weight: 700; color: var(--fg); }

  /* Mensaje (.message) */
  .post {
    display: flex;
    background: var(--post-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .theme-xda-classic .post { border: 1px solid var(--border); }
  .post-user {
    flex: 0 0 150px;
    box-sizing: border-box;
    padding: 15px;
    text-align: center;
    background: var(--user-bg);
    border-right: 1px solid var(--border);
  }
  .avatar {
    width: 96px; height: 96px; margin: 0 auto 6px;
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    background: var(--accent); color: #fff;
    font-size: 58px; line-height: 1;
    overflow: hidden;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .username { font-weight: 700; color: var(--link); }
  .user-title { font-size: 12px; }
  .post-main { flex: 1; min-width: 0; padding: 15px; }
  .post-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 12px; padding-bottom: 12px;
    font-size: 12px; color: var(--muted);
    border-bottom: 1px solid var(--border);
  }
  .post-body { padding-bottom: 15px; }
  @media (max-width: 650px) {
    .page { padding: 10px; }
    .post { flex-direction: column; }
    .post-user {
      display: flex; align-items: center; gap: 10px; text-align: left;
      border-right: 0; border-bottom: 1px solid var(--border);
    }
    .avatar { width: 48px; height: 48px; margin: 0; font-size: 29px; }
  }

  /* Contenido BBCode (.bbWrapper) */
  a { color: var(--link); text-decoration: none; }
  a:hover { color: var(--link-hover); text-decoration: underline; }
  ul, ol { margin: 1em 0; overflow: hidden; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid var(--border); clear: both; }
  .bb-heading { margin: .5em 0; clear: both; }
  h2.bb-heading { font-size: 22px; }
  h3.bb-heading { font-size: 15px; }
  h4.bb-heading { font-size: 14px; }

  .bb-quote, .bb-code {
    display: flow-root;
    margin: .5em 0;
    background: var(--block-bg);
    border: var(--block-border);
    border-left: var(--block-border-left);
  }
  .bb-quote-title, .bb-code-title {
    padding: var(--block-title-padding);
    font-size: var(--block-title-size);
    border-bottom: 1px solid var(--block-title-border);
  }
  .bb-quote-title { font-weight: 700; }
  .bb-quote-body { padding: 12px 15px; font-size: var(--quote-size); }
  .bb-code pre {
    margin: 0;
    padding: 12px 15px;
    max-height: 70vh;
    overflow: auto;
    background: var(--code-bg);
  }
  code, .bb-icode { font-family: Monaco, Menlo, Consolas, 'Roboto Mono', 'Ubuntu Mono', monospace; font-size: 12px; line-height: 1.4; }
  .bb-code code { white-space: pre; tab-size: 4; }
  .bb-icode { padding: 1px 4px; border-radius: 3px; background: var(--block-bg); }

  .bb-spoiler { margin: .5em 0; }
  .bb-spoiler summary {
    display: inline-flex; align-items: center;
    height: 35px; padding: 0 15px;
    cursor: pointer; list-style: none;
    font-weight: 700;
    color: var(--button-fg);
    background: var(--button-bg);
    border-radius: var(--radius);
  }
  .theme-xda-classic .bb-spoiler summary { border: 1px solid var(--border); }
  .bb-spoiler summary:hover { color: var(--button-hover-fg); background: var(--button-hover-bg); }
  .bb-spoiler summary::-webkit-details-marker { display: none; }
  .bb-spoiler-body {
    margin-top: .2em;
    padding: 12px 15px;
    background: var(--block-bg);
    border: var(--block-border);
    border-left: var(--block-border-left);
  }
  .bb-ispoiler { filter: blur(6px); cursor: pointer; }
  .bb-ispoiler:hover { filter: none; }

  .bb-table { border: none; border-collapse: collapse; max-width: 100%; }
  .bb-table td, .bb-table th { background: var(--post-bg); border: 1px solid var(--border); padding: 4px; vertical-align: top; }
  .bb-table th { border-bottom: 2px solid var(--accent); }

  .bb-mention { font-weight: 700; }
  .bb-attach { padding: 2px 6px; border: 1px dashed var(--border); border-radius: 3px; }
  .bb-media { position: relative; display: inline-block; width: 560px; max-width: 100%; }
  .bb-media img { width: 100%; }
  .bb-media-label {
    position: absolute; left: 8px; bottom: 8px; padding: 2px 8px; border-radius: 3px;
    background: rgba(0, 0, 0, 0.75); color: #fff; font-size: 12px;
  }
`;

/**
 * @param {{ body: string, csp: string, theme?: string, title?: string, author?: string,
 *           userTitle?: string, avatarUrl?: string, date?: Date }} options
 */
function buildPage({ body, csp, theme = 'xda', title = '', author = '', userTitle = 'Senior Member', avatarUrl = '', date = new Date() }) {
  const themeName = THEMES.includes(theme) ? theme : 'xda';
  let content = body;

  if (themeName !== 'vscode') {
    const name = author || 'Autor';
    const shownDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const avatar = avatarUrl
      ? `<div class="avatar"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" width="96" height="96"></div>`
      : `<div class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;
    content = `
      <div class="thread-header">
        <h1 class="thread-title">${escapeHtml(title)}</h1>
        <div class="thread-meta">${escapeHtml(name)} · ${shownDate}</div>
      </div>
      <article class="post">
        <div class="post-user">
          ${avatar}
          <div>
            <div class="username">${escapeHtml(name)}</div>
            <div class="user-title">${escapeHtml(userTitle)}</div>
          </div>
        </div>
        <div class="post-main">
          <div class="post-header"><span>${shownDate}</span><span>#1</span></div>
          <div class="post-body">${body}</div>
        </div>
      </article>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${STYLES}</style>
  </head>
  <body>
    <div class="page theme-${themeName}">${content}</div>
  </body>
</html>`;
}

module.exports = { buildPage, THEMES };
