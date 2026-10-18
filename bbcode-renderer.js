'use strict';

/**
 * Renderer BBCode -> HTML basado en un parser con pila (tokenizer + árbol),
 * compatible con el dialecto de XenForo usado en XDA Developers.
 *
 * Las etiquetas desconocidas se dejan como texto (p. ej. "[ROM][UNOFFICIAL]"),
 * las etiquetas sin cerrar se cierran solas al final del bloque que las contiene
 * y los cierres huérfanos se muestran tal cual.
 */

// Escala de [SIZE=1..7] de XenForo 2.
const SIZE_MAP = { 1: 9, 2: 10, 3: 12, 4: 15, 5: 18, 6: 22, 7: 26 };

/**
 * block: tag de bloque (se elimina un salto de línea tras la apertura y tras el cierre).
 * raw:   el contenido no se parsea (true o función que recibe la opción).
 * isVoid: no tiene cierre.
 */
const TAGS = {
  b: {}, i: {}, u: {}, s: {}, strike: {}, sub: {}, sup: {},
  color: {}, size: {}, font: {}, highlight: {},
  center: { block: true }, left: { block: true }, right: { block: true },
  justify: { block: true }, indent: { block: true }, heading: { block: true },
  url: { raw: (opt) => !opt }, email: { raw: (opt) => !opt },
  mention: {}, user: {},
  img: { raw: true }, attach: { raw: true },
  media: { raw: true, block: true }, youtube: { raw: true, block: true },
  quote: { block: true }, spoiler: { block: true }, ispoiler: {},
  code: { raw: true, block: true }, php: { raw: true, block: true }, html: { raw: true, block: true },
  icode: { raw: true }, plain: { raw: true }, noparse: { raw: true },
  list: { block: true }, ul: { block: true }, ol: { block: true },
  '*': { block: true }, li: { block: true },
  table: { block: true }, tr: { block: true }, td: { block: true }, th: { block: true },
  hr: { block: true, isVoid: true }
};

const LIST_TAGS = new Set(['list', 'ul', 'ol']);
// Etiquetas que no se reabren al resolver un anidamiento cruzado.
const STRUCTURAL_TAGS = new Set(['list', 'ul', 'ol', '*', 'li', 'table', 'tr', 'td', 'th']);

const TAG_RE = /\[(\/?)([a-zA-Z][a-zA-Z0-9]*|\*)((?:=|\s)(?:"[^"\n]*"|'[^'\n]*'|[^\]"'\n])*)?\]/g;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unquote = (value) => {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
    return v.slice(1, -1);
  }
  return v;
};

function parseOptions(rest) {
  if (!rest) return { option: '', attrs: {} };
  if (rest[0] === '=') return { option: unquote(rest.slice(1)), attrs: {} };
  const attrs = {};
  rest.replace(/([a-zA-Z][\w-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"']+)/g, (_m, key, value) => {
    attrs[key.toLowerCase()] = unquote(value);
    return '';
  });
  return { option: '', attrs };
}

/**
 * Convierte el texto BBCode en un árbol de nodos.
 */
function parse(src) {
  return parseDocument(src).root;
}

/**
 * Parsea el texto y además devuelve los problemas encontrados (con offsets sobre
 * `src`) y las etiquetas que quedan abiertas al final.
 * @returns {{ root: object, issues: Array<{ start: number, end: number, message: string }>, openTags: object[] }}
 */
function parseDocument(src) {
  const root = { type: 'tag', name: '#root', children: [] };
  const stack = [root];
  const issues = [];
  let unclosedRaw = null;
  const report = (start, end, message) => issues.push({ start, end, message });
  const label = (n) => `[${n.rawName}]`;
  const top = () => stack[stack.length - 1];
  const append = (node) => top().children.push(node);
  const pushText = (text, offset) => {
    if (!text) return;
    const children = top().children;
    const last = children[children.length - 1];
    if (last && last.type === 'text') last.value += text;
    else children.push({ type: 'text', value: text, start: offset });
  };
  const reopen = (nodes) => nodes.forEach((n) => {
    const clone = { ...n, children: [], reopened: true };
    append(clone);
    stack.push(clone);
  });

  let pos = 0;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(src))) {
    const [full, slash, rawName, rest = ''] = match;
    const name = rawName.toLowerCase();
    const def = TAGS[name];
    const start = match.index;
    const end = start + full.length;
    pushText(src.slice(pos, start), pos);
    pos = end;

    if (!def) {
      pushText(full, start);
      continue;
    }

    if (slash) {
      let i = stack.length - 1;
      while (i > 0 && stack[i].name !== name) i--;
      if (rest || i === 0) {
        report(start, end, `[/${rawName}] no tiene una etiqueta de apertura.`);
        pushText(full, start);
        continue;
      }
      // Anidamiento cruzado ([SIZE][CENTER]x[/SIZE]y[/CENTER]): se cierran las
      // etiquetas internas y se reabren después, como hacen los navegadores.
      const inner = stack.slice(i + 1);
      inner.forEach((n) => {
        if (n.name === '*') return;
        const message = STRUCTURAL_TAGS.has(n.name)
          ? `${label(n)} no se cerró antes de [/${rawName}].`
          : `Anidamiento cruzado: [/${rawName}] se cierra mientras ${label(n)} sigue abierta.`;
        report(start, end, message);
      });
      stack[i].closeStart = start;
      stack.length = i;
      reopen(inner.filter((n) => !STRUCTURAL_TAGS.has(n.name)));
      continue;
    }

    if (name === '*') {
      let j = stack.length - 1;
      while (j > 0 && stack[j].name !== '*' && !LIST_TAGS.has(stack[j].name)) j--;
      if (j === 0) {
        report(start, end, '[*] está fuera de una lista ([LIST]).');
        pushText(full, start);
        continue;
      }
      // Las etiquetas abiertas en el item anterior ([COLOR][*]a[*]b[/COLOR]) continúan en el nuevo.
      const carried = stack.slice(j + 1).filter((n) => !STRUCTURAL_TAGS.has(n.name));
      stack.length = stack[j].name === '*' ? j : j + 1;
      const item = { type: 'tag', name, rawName, start, end, option: '', attrs: {}, children: [] };
      append(item);
      stack.push(item);
      reopen(carried);
      continue;
    }

    const { option, attrs } = parseOptions(rest);
    const node = { type: 'tag', name, rawName, start, end, option, attrs, children: [] };
    const isRaw = typeof def.raw === 'function' ? def.raw(option) : def.raw;

    if (isRaw) {
      const closeRe = new RegExp(`\\[/${escapeRegExp(rawName)}\\]`, 'i');
      const closeMatch = closeRe.exec(src.slice(pos));
      if (!closeMatch) {
        report(start, end, `${label(node)} no se cerró: falta [/${rawName}].`);
        if (!unclosedRaw) unclosedRaw = { node, depth: stack.length };
        pushText(full, start);
        continue;
      }
      node.children.push({ type: 'text', value: src.slice(pos, pos + closeMatch.index) });
      node.closeStart = pos + closeMatch.index;
      pos += closeMatch.index + closeMatch[0].length;
      TAG_RE.lastIndex = pos;
      append(node);
      continue;
    }

    append(node);
    if (!def.isVoid) stack.push(node);
  }
  pushText(src.slice(pos), pos);

  stack.slice(1).forEach((n) => {
    if (n.name !== '*') report(n.start, n.end, `${label(n)} no se cerró: falta [/${n.rawName}].`);
  });
  // Dentro de un [CODE] sin cerrar, lo que sigue no son etiquetas: la abierta es el [CODE].
  const openTags = unclosedRaw
    ? stack.slice(1, unclosedRaw.depth).concat(unclosedRaw.node)
    : stack.slice(1);
  return { root, issues, openTags };
}

/** Árbol con posiciones: cada etiqueta tiene start (apertura) y closeStart (cierre, si existe). */
function parseWithPositions(src) {
  return parseDocument(String(src || '')).root;
}

/**
 * Problemas del documento (etiquetas sin cerrar, cierres huérfanos, anidamiento cruzado...).
 * Los offsets se refieren al texto recibido, sin normalizar.
 */
function diagnose(text) {
  return parseDocument(String(text || '')).issues;
}

/**
 * Etiquetas abiertas al final de `textBefore`, de la más externa a la más interna
 * (sin contar los [*]). Sirve para autocompletar el cierre.
 */
function openTagsAt(textBefore) {
  return parseDocument(String(textBefore || '')).openTags
    .filter((n) => n.name !== '*')
    .map((n) => n.rawName);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const isBlockNode = (node) => node && node.type === 'tag' && TAGS[node.name] && TAGS[node.name].block;

// [COLOR][SIZE][CENTER]x[/CENTER][/SIZE][/COLOR] también termina en un bloque.
const endsWithBlock = (node) => {
  if (!node || node.type !== 'tag') return false;
  if (isBlockNode(node)) return true;
  const children = node.children.filter((c) => c.type !== 'text' || c.value.trim());
  return endsWithBlock(children[children.length - 1]);
};

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children || []).map(textOf).join('');

function safeUrl(url) {
  let u = String(url || '').trim();
  if (!u) return null;
  if (/^(javascript|vbscript|data):/i.test(u.replace(/\s/g, ''))) return null;
  if (/^www\./i.test(u)) u = `http://${u}`;
  return u;
}

const AUTOLINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'[\]]+/gi;

function renderText(text, ctx) {
  const lineBreaks = (v) => v.replace(/\n/g, '<br>\n');
  if (ctx.inLink) return lineBreaks(escapeHtml(text));

  let out = '';
  let last = 0;
  text.replace(AUTOLINK_RE, (url, index) => {
    const trimmed = url.replace(/[.,;:!?)]+$/, '');
    out += lineBreaks(escapeHtml(text.slice(last, index)));
    const href = safeUrl(trimmed);
    out += `<a href="${escapeHtml(href)}">${escapeHtml(trimmed)}</a>`;
    last = index + trimmed.length;
    return url;
  });
  return out + lineBreaks(escapeHtml(text.slice(last)));
}

/**
 * Renderiza una lista de nodos hermanos.
 * opts.trim: recorta espacios al inicio y al final del contenido (celdas, items).
 * opts.skipBlank: ignora los textos que solo contienen espacios (entre filas, items...).
 */
function renderNodes(nodes, ctx, opts = {}) {
  let out = '';
  nodes.forEach((node, index) => {
    if (node.type !== 'text') {
      if (opts.skipBlank && !node.children.length && !TAGS[node.name].isVoid) return;
      out += withLine(renderTag(node, ctx), node, ctx);
      return;
    }
    let value = node.value;
    if (opts.skipBlank && !value.trim()) return;
    // El editor de XDA convierte cada párrafo (separado por una línea en blanco) en un solo salto.
    if (ctx.collapseBlankLines) value = value.replace(/\n[ \t]*(?:\n[ \t]*)+/g, '\n');
    if (index === 0 && opts.leadingNewline) value = value.replace(/^[ \t]*\n/, '');
    if (endsWithBlock(nodes[index - 1])) value = value.replace(/^[ \t]*\n/, '');
    if (opts.trim && index === 0) value = value.replace(/^\s+/, '');
    if (opts.trim && index === nodes.length - 1) value = value.replace(/\s+$/, '');
    if (ctx.lineOf && node.start !== undefined && value.trim()) {
      out += `<span data-line="${ctx.lineOf(node.start + Math.max(0, node.value.search(/\S/)))}"></span>`;
    }
    out += renderText(value, ctx);
  });
  return out;
}

// Quita los <br> finales aunque estén dentro de etiquetas inline ("a<br></span>").
const trimTrailingBreaks = (html) => html.replace(/(?:<br>\s*)+((?:<\/[a-z]+>)*)$/, '$1');

// Marca el primer elemento con la línea de origen (para sincronizar el scroll).
function withLine(html, node, ctx) {
  if (!ctx.lineOf || node.start === undefined || node.reopened) return html;
  return html.replace(/^<([a-zA-Z][a-zA-Z0-9]*)/, `<$1 data-line="${ctx.lineOf(node.start)}"`);
}

const blockChildren = (node, ctx) => renderNodes(node.children, ctx, { leadingNewline: true });

function renderSize(option) {
  const value = String(option).trim().toLowerCase();
  if (/^[1-7]$/.test(value)) return `${SIZE_MAP[value]}px`;
  const px = value.match(/^(\d{1,3})(?:px)?$/);
  if (px) return `${Math.min(72, Math.max(8, Number(px[1])))}px`;
  return null;
}

function renderColor(option) {
  const value = String(option).trim();
  if (/^#?[a-zA-Z0-9]+$/.test(value) || /^rgba?\([\d\s.,%]+\)$/i.test(value)) return value;
  return null;
}

function youtubeId(value) {
  const v = value.trim();
  const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,})/);
  if (m) return m[1];
  return /^[\w-]{6,}$/.test(v) ? v : null;
}

function renderYoutube(id) {
  const safeId = escapeHtml(id);
  return `<a class="bb-media" href="https://www.youtube.com/watch?v=${safeId}">` +
    `<img src="https://img.youtube.com/vi/${safeId}/hqdefault.jpg" alt="YouTube ${safeId}" loading="lazy">` +
    `<span class="bb-media-label">▶ YouTube</span></a>`;
}

function renderImage(node, ctx) {
  const src = safeUrl(textOf(node));
  if (!src) return '';
  const resolved = ctx.resolveImage ? ctx.resolveImage(src) : src;
  const attrs = [];
  const dims = node.option.match(/^(\d{1,4})x(\d{1,4})$/i);
  const width = dims ? dims[1] : (node.attrs.width || '').replace(/px$/i, '');
  const height = dims ? dims[2] : (node.attrs.height || '').replace(/px$/i, '');
  if (/^\d{1,4}$/.test(width)) attrs.push(`width="${width}"`);
  if (/^\d{1,4}$/.test(height)) attrs.push(`height="${height}"`);
  const alt = node.attrs.alt || src.split(/[?#]/)[0].split('/').filter(Boolean).pop() || 'image';
  return `<img class="bb-image" src="${escapeHtml(resolved)}" alt="${escapeHtml(alt)}" loading="lazy" ${attrs.join(' ')}>`;
}

function renderList(node, ctx, tagName, type) {
  const typeAttr = type ? ` type="${type}"` : '';
  return `<${tagName}${typeAttr}>${renderNodes(node.children, ctx, { skipBlank: true })}</${tagName}>`;
}

function renderTag(node, ctx) {
  const inner = () => renderNodes(node.children, ctx);
  const opt = node.option;

  switch (node.name) {
    case 'b': return `<strong>${inner()}</strong>`;
    case 'i': return `<em>${inner()}</em>`;
    case 'u': return `<u>${inner()}</u>`;
    case 's':
    case 'strike': return `<s>${inner()}</s>`;
    case 'sub': return `<sub>${inner()}</sub>`;
    case 'sup': return `<sup>${inner()}</sup>`;
    case 'highlight': return `<mark>${inner()}</mark>`;

    case 'color': {
      const color = renderColor(opt);
      return color ? `<span style="color:${escapeHtml(color)}">${inner()}</span>` : inner();
    }
    case 'size': {
      const size = renderSize(opt);
      return size ? `<span style="font-size:${size}">${inner()}</span>` : inner();
    }
    case 'font': {
      const font = opt.replace(/["';{}<>]/g, '').trim();
      return font ? `<span style="font-family:'${escapeHtml(font)}'">${inner()}</span>` : inner();
    }

    case 'center':
    case 'left':
    case 'right':
    case 'justify':
      return `<div style="text-align:${node.name}">${blockChildren(node, ctx)}</div>`;
    case 'indent': {
      const level = Math.min(10, Math.max(1, parseInt(opt, 10) || 1));
      return `<div style="margin-left:${level * 20}px">${blockChildren(node, ctx)}</div>`;
    }
    case 'heading': {
      const level = Math.min(3, Math.max(1, parseInt(opt, 10) || 1)) + 1;
      return `<h${level} class="bb-heading">${blockChildren(node, ctx)}</h${level}>`;
    }
    case 'hr': return '<hr>';

    case 'url': {
      const href = safeUrl(opt || textOf(node));
      const label = opt ? renderNodes(node.children, { ...ctx, inLink: true }) : escapeHtml(textOf(node).trim());
      return href ? `<a href="${escapeHtml(href)}" title="${escapeHtml(href)}">${label}</a>` : label;
    }
    case 'email': {
      const address = (opt || textOf(node)).trim();
      const label = opt ? renderNodes(node.children, { ...ctx, inLink: true }) : escapeHtml(address);
      return `<a href="mailto:${escapeHtml(address)}">${label}</a>`;
    }
    case 'mention':
    case 'user': {
      const label = escapeHtml(textOf(node).replace(/^@/, ''));
      if (!/^\d+$/.test(opt) || !ctx.mentionUrl) return `<span class="bb-mention">@${label}</span>`;
      const href = ctx.mentionUrl.replace('{id}', opt);
      return `<a class="bb-mention" href="${escapeHtml(href)}">@${label}</a>`;
    }

    case 'img': return renderImage(node, ctx);
    case 'attach': return `<span class="bb-attach">📎 Adjunto ${escapeHtml(textOf(node).trim())}</span>`;
    case 'youtube': {
      const id = youtubeId(textOf(node));
      return id ? renderYoutube(id) : escapeHtml(textOf(node));
    }
    case 'media': {
      const content = textOf(node).trim();
      if (/^youtube$/i.test(opt) || /youtu/.test(content)) {
        const id = youtubeId(content);
        if (id) return renderYoutube(id);
      }
      const href = safeUrl(content);
      return href ? `<a class="bb-media" href="${escapeHtml(href)}">${escapeHtml(opt || 'media')}: ${escapeHtml(content)}</a>` : '';
    }

    case 'quote': {
      const author = opt.split(',')[0].trim();
      const title = author ? `<div class="bb-quote-title">${escapeHtml(author)} said:</div>` : '';
      return `<blockquote class="bb-quote">${title}<div class="bb-quote-body">${blockChildren(node, ctx)}</div></blockquote>`;
    }
    case 'spoiler': {
      const title = opt ? `Spoiler: ${escapeHtml(opt)}` : 'Spoiler';
      return `<details class="bb-spoiler"><summary>${title}</summary><div class="bb-spoiler-body">${blockChildren(node, ctx)}</div></details>`;
    }
    case 'ispoiler': return `<span class="bb-ispoiler" title="Spoiler">${inner()}</span>`;

    case 'code':
    case 'php':
    case 'html': {
      const code = textOf(node).replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, '');
      const lang = node.name === 'code' ? opt : node.name;
      const label = lang ? `Code: ${escapeHtml(lang)}` : 'Code:';
      return `<div class="bb-code"><div class="bb-code-title">${label}</div><pre><code>${escapeHtml(code)}</code></pre></div>`;
    }
    case 'icode': return `<code class="bb-icode">${escapeHtml(textOf(node))}</code>`;
    case 'plain':
    case 'noparse':
      return renderText(textOf(node), { ...ctx, inLink: true });

    case 'list': {
      if (opt === '1') return renderList(node, ctx, 'ol');
      if (/^[aAiI]$/.test(opt)) return renderList(node, ctx, 'ol', opt);
      return renderList(node, ctx, 'ul');
    }
    case 'ul': return renderList(node, ctx, 'ul');
    case 'ol': return renderList(node, ctx, 'ol');
    case '*':
    case 'li':
      return `<li>${trimTrailingBreaks(renderNodes(node.children, ctx, { trim: true }))}</li>`;

    case 'table': return `<table class="bb-table">${renderNodes(node.children, ctx, { skipBlank: true })}</table>`;
    case 'tr': return `<tr>${renderNodes(node.children, ctx, { skipBlank: true })}</tr>`;
    case 'td':
    case 'th': {
      const width = (node.attrs.width || '').match(/^\d{1,4}(px|%)?$/) ? ` style="width:${escapeHtml(node.attrs.width)}"` : '';
      return `<${node.name}${width}>${renderNodes(node.children, ctx, { trim: true })}</${node.name}>`;
    }

    default:
      return inner();
  }
}

const countLeadingLines = (text) => (text.match(/^\s*\n/) || [''])[0].split('\n').length - 1;

/** Devuelve una función offset -> número de línea (base 0) dentro del documento original. */
function lineLookup(source, lineOffset) {
  const starts = [0];
  for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + lineOffset;
  };
}

/**
 * @param {string} text BBCode de entrada.
 * @param {{ resolveImage?: (src: string) => string, mentionUrl?: string, collapseBlankLines?: boolean,
 *           lineMarkers?: boolean }} [options] lineMarkers agrega data-line a los elementos.
 * @returns {string} HTML.
 */
function bbcodeToHtml(text, options = {}) {
  const ctx = {
    resolveImage: options.resolveImage,
    collapseBlankLines: Boolean(options.collapseBlankLines),
    mentionUrl: options.mentionUrl === undefined ? 'https://xdaforums.com/member.php?u={id}' : options.mentionUrl,
    inLink: false
  };
  // Como XenForo, se ignoran las líneas en blanco al inicio y al final del post.
  const normalized = String(text || '').replace(/\r\n?/g, '\n');
  const source = normalized.replace(/^\s*\n/, '').trimEnd();
  // Las líneas en blanco iniciales se quitan, pero los números de línea siguen siendo los del archivo.
  if (options.lineMarkers) ctx.lineOf = lineLookup(source, countLeadingLines(normalized));
  return renderNodes(parse(source).children, ctx);
}

module.exports = { bbcodeToHtml, parse, parseWithPositions, diagnose, openTagsAt, TAGS };
