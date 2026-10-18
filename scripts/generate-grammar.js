// Genera syntaxes/bbcode.tmLanguage.json. Uso: npm run grammar
const fs = require('fs');
const out = process.argv[2] || require('path').join(__dirname, '..', 'syntaxes', 'bbcode.tmLanguage.json');
const TAGS = 'b|i|u|s|strike|sub|sup|color|size|font|highlight|center|left|right|justify|indent|heading|url|email|mention|user|img|attach|media|youtube|quote|spoiler|ispoiler|code|php|html|icode|plain|noparse|list|ul|ol|li|table|tr|td|th|hr';
const tagCaps = (closeGroup = true) => ({
  1: { name: 'punctuation.definition.tag.begin.bbcode' },
  ...(closeGroup ? { 2: { name: 'punctuation.definition.tag.close.bbcode' } } : {}),
});
const open = (nameRe) => `(?i)(\\[)(${nameRe})`;
const closeTag = (nameRe) => ({
  match: `(?i)(\\[)(/)(${nameRe})(\\])`,
  name: 'meta.tag.bbcode',
  captures: {
    1: { name: 'punctuation.definition.tag.begin.bbcode' },
    2: { name: 'punctuation.definition.tag.close.bbcode' },
    3: { name: 'entity.name.tag.bbcode' },
    4: { name: 'punctuation.definition.tag.end.bbcode' }
  }
});
const endCaps = {
  1: { name: 'punctuation.definition.tag.begin.bbcode' },
  2: { name: 'punctuation.definition.tag.close.bbcode' },
  3: { name: 'entity.name.tag.bbcode' },
  4: { name: 'punctuation.definition.tag.end.bbcode' }
};
const openCaps = {
  1: { name: 'punctuation.definition.tag.begin.bbcode' },
  2: { name: 'entity.name.tag.bbcode' },
  3: { patterns: [{ include: '#attributes' }] },
  4: { name: 'punctuation.definition.tag.end.bbcode' }
};

// [CODE=lang] con el resaltado del lenguaje
const LANGS = [
  ['bash|sh|shell|zsh', 'source.shell', 'shellscript'],
  ['java', 'source.java', 'java'],
  ['c', 'source.c', 'c'],
  ['cpp|c\\+\\+', 'source.cpp', 'cpp'],
  ['js|javascript', 'source.js', 'javascript'],
  ['python|py', 'source.python', 'python'],
  ['xml', 'text.xml', 'xml'],
  ['json', 'source.json', 'json'],
  ['diff|patch', 'source.diff', 'diff'],
  ['makefile|make', 'source.makefile', 'makefile'],
  ['ini|properties', 'source.ini', 'ini']
];
const embedded = LANGS.map(([re, scope, id]) => ({
  name: 'meta.code.bbcode',
  begin: `(?i)(\\[)(code)(=["']?(?:${re})["']?)(\\])`,
  beginCaptures: openCaps,
  end: '(?i)(\\[)(/)(code)(\\])',
  endCaptures: endCaps,
  contentName: `meta.embedded.block.${id}`,
  patterns: [{ include: scope }]
}));

const grammar = {
  $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
  name: 'BBCode',
  scopeName: 'source.bbcode',
  patterns: [{ include: '#content' }],
  repository: {
    content: {
      patterns: [
        { include: '#code' },
        { include: '#raw' },
        { include: '#links' },
        { include: '#formatting' },
        { include: '#list-item' },
        { include: '#tags' },
        { include: '#autolink' }
      ]
    },
    code: {
      patterns: [
        ...embedded,
        {
          name: 'meta.code.bbcode',
          begin: '(?i)(\\[)(code|php|html)((?:=|\\s)[^\\]]*)?(\\])',
          beginCaptures: openCaps,
          end: '(?i)(\\[)(/)(\\2)(\\])',
          endCaptures: endCaps,
          contentName: 'markup.raw.block.bbcode'
        }
      ]
    },
    raw: {
      patterns: [
        {
          name: 'meta.raw.bbcode',
          begin: '(?i)(\\[)(icode)()(\\])',
          beginCaptures: openCaps,
          end: '(?i)(\\[)(/)(icode)(\\])',
          endCaptures: endCaps,
          contentName: 'markup.inline.raw.bbcode'
        },
        {
          name: 'meta.raw.bbcode',
          begin: '(?i)(\\[)(plain|noparse)()(\\])',
          beginCaptures: openCaps,
          end: '(?i)(\\[)(/)(\\2)(\\])',
          endCaptures: endCaps,
          contentName: 'string.unquoted.plain.bbcode'
        }
      ]
    },
    links: {
      patterns: [
        {
          // [URL]https://…[/URL], [IMG]…[/IMG], [EMAIL]…[/EMAIL]
          name: 'meta.link.bbcode',
          begin: '(?i)(\\[)(url|img|email)((?:\\s)[^\\]]*)?(\\])',
          beginCaptures: openCaps,
          end: '(?i)(\\[)(/)(\\2)(\\])',
          endCaptures: endCaps,
          contentName: 'markup.underline.link.bbcode'
        },
        {
          // [URL="https://…"]
          name: 'meta.tag.bbcode',
          match: '(?i)(\\[)(url|email|img)(=)("[^"]*"|\'[^\']*\'|[^\\]]*)(\\])',
          captures: {
            1: { name: 'punctuation.definition.tag.begin.bbcode' },
            2: { name: 'entity.name.tag.bbcode' },
            3: { name: 'keyword.operator.assignment.bbcode' },
            4: { name: 'markup.underline.link.bbcode' },
            5: { name: 'punctuation.definition.tag.end.bbcode' }
          }
        }
      ]
    },
    formatting: {
      patterns: [
        ['b', 'markup.bold.bbcode'],
        ['i', 'markup.italic.bbcode'],
        ['u', 'markup.underline.bbcode'],
        ['s|strike', 'markup.strikethrough.bbcode']
      ].map(([re, scope]) => ({
        begin: `(?i)(\\[)(${re})()(\\])`,
        beginCaptures: openCaps,
        end: `(?i)(\\[)(/)(${re})(\\])`,
        endCaptures: endCaps,
        contentName: scope,
        patterns: [{ include: '#content' }]
      }))
    },
    'list-item': {
      match: '(\\[)(\\*)(\\])',
      name: 'markup.list.item.bbcode',
      captures: {
        1: { name: 'punctuation.definition.tag.begin.bbcode' },
        2: { name: 'punctuation.definition.list.begin.bbcode' },
        3: { name: 'punctuation.definition.tag.end.bbcode' }
      }
    },
    tags: {
      patterns: [
        closeTag(TAGS),
        {
          name: 'meta.tag.bbcode',
          match: `(?i)(\\[)(${TAGS})((?:=|\\s)(?:"[^"\\n]*"|'[^'\\n]*'|[^\\]"'\\n])*)?(\\])`,
          captures: openCaps
        }
      ]
    },
    attributes: {
      patterns: [
        {
          match: '(=)\\s*("[^"]*"|\'[^\']*\')',
          captures: {
            1: { name: 'keyword.operator.assignment.bbcode' },
            2: { name: 'string.quoted.bbcode' }
          }
        },
        {
          match: '(=)\\s*([^\\s"\']+)',
          captures: {
            1: { name: 'keyword.operator.assignment.bbcode' },
            2: { name: 'string.unquoted.bbcode' }
          }
        },
        {
          match: '([a-zA-Z][\\w-]*)\\s*(=)\\s*("[^"]*"|\'[^\']*\'|[^\\s"\']+)',
          captures: {
            1: { name: 'entity.other.attribute-name.bbcode' },
            2: { name: 'keyword.operator.assignment.bbcode' },
            3: { name: 'string.unquoted.bbcode' }
          }
        }
      ]
    },
    autolink: {
      match: '(?i)\\b(?:https?://|www\\.)[^\\s\\[\\]<>"\']+',
      name: 'markup.underline.link.bbcode'
    }
  }
};
fs.writeFileSync(out, JSON.stringify(grammar, null, 2) + '\n');
