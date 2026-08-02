'use strict';

const KEYWORDS = new Set([
  'let', 'const', 'func', 'if', 'else', 'while', 'repeat', 'as', 'for', 'in',
  'return', 'true', 'false', 'null', 'and', 'or', 'not', 'break', 'continue',
  'async', 'await',
]);

// Multi-char operators must be listed longest-first so the lexer prefers them
// over their shorter prefixes (e.g. '==' before '=').
const OPERATORS = [
  '...', '=>', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '(', ')', '{', '}', '[', ']',
  ',', '.', ':',
];

class EscriptSyntaxError extends Error {
  constructor(message, line) {
    super(`E-script syntax error (line ${line}): ${message}`);
    this.line = line;
  }
}

function isDigit(ch) { return ch >= '0' && ch <= '9'; }
function isIdentStart(ch) { return /[A-Za-z_]/.test(ch); }
function isIdentPart(ch) { return /[A-Za-z0-9_]/.test(ch); }

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  const n = source.length;

  function peek(offset = 0) { return source[i + offset]; }

  while (i < n) {
    const ch = source[i];

    if (ch === '\n') { tokens.push({ type: 'NEWLINE', line }); line += 1; i += 1; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i += 1; continue; }

    // Comments: // ... or # ... to end of line
    if (ch === '#' || (ch === '/' && peek(1) === '/')) {
      while (i < n && source[i] !== '\n') i += 1;
      continue;
    }

    // Strings: double-quoted allow {expr} interpolation, single-quoted are literal.
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      i += 1;
      const parts = []; // array of { text } or { expr: tokens[] }
      let buf = '';
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < n) {
          const next = source[i + 1];
          const map = { n: '\n', t: '\t', '"': '"', "'": "'", '\\': '\\', '{': '{', '}': '}' };
          buf += map[next] !== undefined ? map[next] : next;
          i += 2;
          continue;
        }
        if (quote === '"' && source[i] === '{') {
          parts.push({ text: buf });
          buf = '';
          i += 1;
          let depth = 1;
          let exprSrc = '';
          while (i < n && depth > 0) {
            if (source[i] === '{') depth += 1;
            else if (source[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
            exprSrc += source[i];
            if (source[i] === '\n') line += 1;
            i += 1;
          }
          parts.push({ expr: exprSrc });
          continue;
        }
        if (source[i] === '\n') line += 1;
        buf += source[i];
        i += 1;
      }
      if (i >= n) throw new EscriptSyntaxError('unterminated string', startLine);
      i += 1; // closing quote
      parts.push({ text: buf });
      tokens.push({ type: 'STRING', parts, line: startLine });
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(peek(1)))) {
      let start = i;
      while (i < n && isDigit(source[i])) i += 1;
      if (source[i] === '.' && isDigit(source[i + 1])) {
        i += 1;
        while (i < n && isDigit(source[i])) i += 1;
      }
      tokens.push({ type: 'NUMBER', value: source.slice(start, i), line });
      continue;
    }

    if (isIdentStart(ch)) {
      let start = i;
      while (i < n && isIdentPart(source[i])) i += 1;
      const word = source.slice(start, i);
      if (KEYWORDS.has(word)) tokens.push({ type: word.toUpperCase(), value: word, line });
      else tokens.push({ type: 'IDENT', value: word, line });
      continue;
    }

    const matchedOp = OPERATORS.find((op) => source.startsWith(op, i));
    if (matchedOp) {
      tokens.push({ type: matchedOp, line });
      i += matchedOp.length;
      continue;
    }

    throw new EscriptSyntaxError(`unexpected character '${ch}'`, line);
  }

  tokens.push({ type: 'EOF', line });
  return tokens;
}

module.exports = { tokenize, EscriptSyntaxError };
