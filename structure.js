'use strict';

/**
 * Estructura del post para el esquema (Outline) y el plegado.
 * Es independiente de la API de VS Code.
 */
const { parseWithPositions } = require('./bbcode-renderer');

const RAW_TAGS = new Set(['code', 'php', 'html', 'icode', 'plain', 'noparse']);
// Bloques que se pueden plegar cuando ocupan varias líneas.
const FOLDABLE_TAGS = new Set([
  'quote', 'spoiler', 'code', 'php', 'html', 'list', 'ul', 'ol', 'table', 'tr',
  'center', 'left', 'right', 'justify', 'indent', 'plain', 'noparse', 'media'
]);

const KNOWN_TAG_RE = /\[\/?(?:b|i|u|s|strike|sub|sup|color|size|font|highlight|center|left|right|justify|indent|heading|url|email|mention|user|img|attach|media|youtube|quote|spoiler|ispoiler|code|php|html|icode|plain|noparse|list|ul|ol|li|table|tr|td|th|hr|\*)(?:=[^\]]*|\s[^\]]*)?\]/gi;

function lineStarts(text) {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return starts;
}

function lineOfFactory(starts) {
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}

function walk(node, visit) {
  (node.children || []).forEach((child) => {
    if (child.type !== 'tag') return;
    visit(child);
    walk(child, visit);
  });
}

/**
 * Nivel de título de una línea (1-4) o 0 si no es un título.
 */
function headingLevel(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[')) return 0;

  const text = trimmed.replace(KNOWN_TAG_RE, '').trim();
  if (!text || text.length > 80 || /[.!]$/.test(text)) return 0;
  // Una línea que solo es un enlace no es un título.
  const outsideLinks = trimmed.replace(/\[url[^\]]*\][\s\S]*?\[\/url\]/gi, '').replace(KNOWN_TAG_RE, '').trim();
  if (!outsideLinks) return 0;
  // El título tiene que empezar con etiquetas: nada de texto antes del primer formato.
  const leading = trimmed.match(/^(?:\[[^\]/][^\]]*\])+/);
  if (!leading) return 0;

  const heading = leading[0].match(/\[heading=["']?([1-3])/i);
  if (heading) return Number(heading[1]);
  const size = leading[0].match(/\[size=["']?(\d+)/i);
  if (size) {
    const n = Number(size[1]);
    if (n >= 6) return 1;
    if (n === 5) return 2;
    if (n === 4) return 3;
    return 0;
  }
  // [B][U]Contributors[/U][/B] o [B]Install instructions:[/B]
  if (/^\[b\]\[u\]/i.test(trimmed) && /\[\/u\]\[\/b\]$/i.test(trimmed)) return 4;
  if (/^\[b\][^[]+\[\/b\]$/i.test(trimmed) && /:$/.test(text)) return 4;
  return 0;
}

/**
 * Secciones y spoilers del post.
 * @returns {Array<{ kind: 'section'|'spoiler', title: string, level: number, line: number, endLine: number }>}
 */
function outline(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n');
  const lines = source.split('\n');
  const lineOf = lineOfFactory(lineStarts(source));
  const root = parseWithPositions(source);

  // Líneas dentro de [CODE]/[PLAIN] no son títulos.
  const rawLines = new Set();
  const spoilers = [];
  walk(root, (node) => {
    if (RAW_TAGS.has(node.name) && node.closeStart !== undefined) {
      for (let l = lineOf(node.start); l <= lineOf(node.closeStart); l++) rawLines.add(l);
    }
    if (node.name === 'spoiler' && !node.reopened) {
      spoilers.push({
        kind: 'spoiler',
        title: node.option ? `Spoiler: ${node.option}` : 'Spoiler',
        level: 5,
        line: lineOf(node.start),
        endLine: node.closeStart !== undefined ? lineOf(node.closeStart) : lines.length - 1
      });
    }
  });

  const sections = [];
  lines.forEach((line, index) => {
    if (rawLines.has(index)) return;
    const level = headingLevel(line);
    if (!level) return;
    const title = line.replace(KNOWN_TAG_RE, '').trim();
    sections.push({ kind: 'section', title, level, line: index, endLine: lines.length - 1 });
  });

  // Cada sección termina antes de la siguiente del mismo nivel o superior.
  sections.forEach((section, i) => {
    const next = sections.slice(i + 1).find((other) => other.level <= section.level);
    if (next) section.endLine = Math.max(section.line, next.line - 1);
  });
  // Sin contar las líneas en blanco del final.
  sections.forEach((section) => {
    while (section.endLine > section.line && !lines[section.endLine].trim()) section.endLine--;
  });

  return sections.concat(spoilers).sort((a, b) => a.line - b.line || a.level - b.level);
}

/**
 * Rangos plegables: bloques de varias líneas y secciones.
 * @returns {Array<{ start: number, end: number }>}
 */
function foldingRanges(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n');
  const lineOf = lineOfFactory(lineStarts(source));
  const root = parseWithPositions(source);
  const seen = new Set();
  const ranges = [];
  const add = (start, end) => {
    const key = `${start}:${end}`;
    if (end <= start || seen.has(key)) return;
    seen.add(key);
    ranges.push({ start, end });
  };

  walk(root, (node) => {
    if (!FOLDABLE_TAGS.has(node.name) || node.closeStart === undefined) return;
    const start = lineOf(node.start);
    let end = lineOf(node.closeStart);
    // Si el cierre empieza su línea, esa línea queda visible.
    const lineStart = source.lastIndexOf('\n', node.closeStart - 1) + 1;
    if (!source.slice(lineStart, node.closeStart).trim()) end -= 1;
    add(start, end);
  });

  outline(source)
    .filter((item) => item.kind === 'section')
    .forEach((section) => add(section.line, section.endLine));

  return ranges.sort((a, b) => a.start - b.start || b.end - a.end);
}

module.exports = { outline, foldingRanges, headingLevel };
