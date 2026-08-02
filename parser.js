'use strict';

const { tokenize, EscriptSyntaxError } = require('./lexer');

function parse(tokens) {
  let pos = 0;

  function peek(offset = 0) { return tokens[pos + offset]; }
  function at(type) { return peek().type === type; }
  function atAny(...types) { return types.includes(peek().type); }
  function line() { return peek().line; }

  function advance() { return tokens[pos++]; }

  function expect(type, context) {
    if (!at(type)) {
      throw new EscriptSyntaxError(
        `expected '${type}'${context ? ` (${context})` : ''} but found '${peek().type}'`,
        line(),
      );
    }
    return advance();
  }

  function skipNewlines() { while (at('NEWLINE')) advance(); }
  function skipStatementSep() { while (atAny('NEWLINE')) advance(); }

  function parseProgram() {
    const body = [];
    skipNewlines();
    while (!at('EOF')) {
      body.push(parseStatement());
      skipStatementSep();
    }
    return { type: 'Program', body };
  }

  function parseStatement() {
    if (at('LET') || at('CONST')) return parseVarDecl();
    if (at('ASYNC') && peek(1).type === 'FUNC') { advance(); return parseFuncDecl(true); }
    if (at('FUNC')) return parseFuncDecl(false);
    if (at('IF')) return parseIf();
    if (at('WHILE')) return parseWhile();
    if (at('REPEAT')) return parseRepeat();
    if (at('FOR')) return parseForIn();
    if (at('RETURN')) return parseReturn();
    if (at('BREAK')) { const t = advance(); return { type: 'Break', line: t.line }; }
    if (at('CONTINUE')) { const t = advance(); return { type: 'Continue', line: t.line }; }
    if (at('{')) return parseBlock();
    const expr = parseExpression();
    return { type: 'ExprStmt', expression: expr, line: expr.line };
  }

  function parseVarDecl() {
    const kindTok = advance();
    const kind = kindTok.type.toLowerCase();
    const name = at('{') ? parseObjectPattern() : expect('IDENT', 'variable name').value;
    let init = null;
    if (at('=')) { advance(); init = parseExpression(); }
    else if (kind === 'const') {
      throw new EscriptSyntaxError('const declarations need a value', kindTok.line);
    }
    return { type: 'VarDecl', kind, name, init, line: kindTok.line };
  }

  function parseObjectPattern() {
    expect('{');
    const keys = [];
    while (!at('}')) {
      keys.push(expect('IDENT', 'destructured key').value);
      if (at(',')) advance(); else break;
    }
    expect('}');
    return { type: 'ObjectPattern', keys };
  }

  function parseParamList() {
    expect('(');
    const params = [];
    while (!at(')')) {
      params.push(expect('IDENT', 'parameter name').value);
      if (at(',')) advance(); else break;
    }
    expect(')');
    return params;
  }

  function parseFuncDecl(isAsync) {
    const tok = advance();
    const name = expect('IDENT', 'function name').value;
    const params = parseParamList();
    if (at('=>')) {
      advance();
      const body = parseExpression();
      return { type: 'FuncDecl', name, params, body, isExprBody: true, isAsync, line: tok.line };
    }
    const body = parseBlock();
    return { type: 'FuncDecl', name, params, body, isExprBody: false, isAsync, line: tok.line };
  }

  function parseBlock() {
    const tok = expect('{');
    skipNewlines();
    const body = [];
    while (!at('}')) {
      body.push(parseStatement());
      skipStatementSep();
    }
    expect('}');
    return { type: 'Block', body, line: tok.line };
  }

  function parseIf() {
    const tok = advance();
    const test = parseExpression();
    const consequent = parseBlock();
    let alternate = null;
    skipNewlines_ifElseFollows();
    if (at('ELSE')) {
      advance();
      if (at('IF')) alternate = parseIf();
      else alternate = parseBlock();
    }
    return { type: 'If', test, consequent, alternate, line: tok.line };

    function skipNewlines_ifElseFollows() {
      let lookahead = 0;
      while (peek(lookahead).type === 'NEWLINE') lookahead += 1;
      if (peek(lookahead).type === 'ELSE') { while (at('NEWLINE')) advance(); }
    }
  }

  function parseWhile() {
    const tok = advance();
    const test = parseExpression();
    const body = parseBlock();
    return { type: 'While', test, body, line: tok.line };
  }

  function parseRepeat() {
    const tok = advance();
    const count = parseExpression();
    let loopVar = null;
    if (at('AS')) { advance(); loopVar = expect('IDENT', 'loop variable').value; }
    const body = parseBlock();
    return { type: 'Repeat', count, loopVar, body, line: tok.line };
  }

  function parseForIn() {
    const tok = advance();
    const varName = expect('IDENT', 'loop variable').value;
    expect('IN', 'for-in loop');
    const iterable = parseExpression();
    const body = parseBlock();
    return { type: 'ForIn', varName, iterable, body, line: tok.line };
  }

  function parseReturn() {
    const tok = advance();
    if (at('NEWLINE') || at('}') || at('EOF')) return { type: 'Return', argument: null, line: tok.line };
    const argument = parseExpression();
    return { type: 'Return', argument, line: tok.line };
  }

  function parseExpression() { return parseAssignment(); }

  function parseAssignment() {
    const left = parseArrowOrLogicalOr();
    if (atAny('=', '+=', '-=', '*=', '/=')) {
      const op = advance();
      const right = parseAssignment();
      return { type: 'Assign', operator: op.type, target: left, value: right, line: op.line };
    }
    return left;
  }

  function parseArrowOrLogicalOr() {
    const start = pos;
    const isAsync = at('ASYNC');
    if (isAsync) advance();
    const arrow = tryParseArrowParams();
    if (arrow) {
      const arrowTok = expect('=>');
      if (at('{')) {
        const body = parseBlock();
        return { type: 'ArrowFunc', params: arrow, body, isExprBody: false, isAsync, line: arrowTok.line };
      }
      const body = parseExpression();
      return { type: 'ArrowFunc', params: arrow, body, isExprBody: true, isAsync, line: arrowTok.line };
    }
    pos = start;
    return parseLogicalOr();
  }

  function tryParseArrowParams() {
    const start = pos;
    if (at('IDENT') && peek(1).type === '=>') {
      const name = advance().value;
      return [name];
    }
    if (!at('(')) return null;
    let depth = 0;
    let i = pos;
    while (i < tokens.length) {
      if (tokens[i].type === '(') depth += 1;
      else if (tokens[i].type === ')') { depth -= 1; if (depth === 0) { i += 1; break; } }
      else if (tokens[i].type === 'NEWLINE' && depth === 0) break;
      i += 1;
    }
    if (tokens[i] && tokens[i].type === '=>') {
      const params = parseParamList();
      return params;
    }
    pos = start;
    return null;
  }

  function parseLogicalOr() {
    let node = parseLogicalAnd();
    while (atAny('OR', '||')) {
      const op = advance();
      const right = parseLogicalAnd();
      node = { type: 'Logical', operator: '||', left: node, right, line: op.line };
    }
    return node;
  }

  function parseLogicalAnd() {
    let node = parseEquality();
    while (atAny('AND', '&&')) {
      const op = advance();
      const right = parseEquality();
      node = { type: 'Logical', operator: '&&', left: node, right, line: op.line };
    }
    return node;
  }

  function parseEquality() {
    let node = parseRelational();
    while (atAny('==', '!=')) {
      const op = advance();
      const right = parseRelational();
      node = { type: 'Binary', operator: op.type, left: node, right, line: op.line };
    }
    return node;
  }

  function parseRelational() {
    let node = parseAdditive();
    while (atAny('<', '>', '<=', '>=')) {
      const op = advance();
      const right = parseAdditive();
      node = { type: 'Binary', operator: op.type, left: node, right, line: op.line };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (atAny('+', '-')) {
      const op = advance();
      const right = parseMultiplicative();
      node = { type: 'Binary', operator: op.type, left: node, right, line: op.line };
    }
    return node;
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (atAny('*', '/', '%')) {
      const op = advance();
      const right = parseUnary();
      node = { type: 'Binary', operator: op.type, left: node, right, line: op.line };
    }
    return node;
  }

  function parseUnary() {
    if (atAny('NOT', '!', '-', 'AWAIT')) {
      const op = advance();
      const argument = parseUnary();
      const operator = op.type === 'NOT' ? '!' : op.type === 'AWAIT' ? 'await' : op.type;
      return { type: 'Unary', operator, argument, line: op.line };
    }
    return parseCallOrMember();
  }

  function parseCallOrMember() {
    let node = parsePrimary();
    for (;;) {
      if (at('(')) {
        advance();
        const args = [];
        while (!at(')')) {
          args.push(parseExpression());
          if (at(',')) advance(); else break;
        }
        expect(')');
        node = { type: 'Call', callee: node, arguments: args, line: node.line };
      } else if (at('.')) {
        advance();
        const prop = expect('IDENT', 'property name').value;
        node = { type: 'Member', object: node, property: { type: 'Identifier', name: prop }, computed: false, line: node.line };
      } else if (at('[')) {
        advance();
        const prop = parseExpression();
        expect(']');
        node = { type: 'Member', object: node, property: prop, computed: true, line: node.line };
      } else break;
    }
    return node;
  }

  function parsePrimary() {
    const tok = peek();
    if (at('NUMBER')) { advance(); return { type: 'NumberLiteral', value: tok.value, line: tok.line }; }
    if (at('STRING')) {
      advance();
      const parts = tok.parts.map((p) => (p.text !== undefined
        ? { text: p.text }
        : { expr: parse(tokenize(p.expr)).body[0]?.expression ?? { type: 'NullLiteral' } }));
      return { type: 'StringLiteral', parts, line: tok.line };
    }
    if (at('TRUE')) { advance(); return { type: 'BooleanLiteral', value: true, line: tok.line }; }
    if (at('FALSE')) { advance(); return { type: 'BooleanLiteral', value: false, line: tok.line }; }
    if (at('NULL')) { advance(); return { type: 'NullLiteral', line: tok.line }; }
    if (at('IDENT')) { advance(); return { type: 'Identifier', name: tok.value, line: tok.line }; }
    if (at('(')) {
      advance();
      const expr = parseExpression();
      expect(')');
      return expr;
    }
    if (at('[')) {
      advance();
      const elements = [];
      skipNewlines();
      while (!at(']')) {
        elements.push(parseExpression());
        skipNewlines();
        if (at(',')) { advance(); skipNewlines(); } else break;
      }
      skipNewlines();
      expect(']');
      return { type: 'ArrayLiteral', elements, line: tok.line };
    }
    if (at('{')) {
      advance();
      const properties = [];
      skipNewlines();
      while (!at('}')) {
        let key;
        if (at('STRING')) { key = { computed: false, raw: JSON.stringify(advance().parts.map((p) => p.text || '').join('')) }; }
        else key = { computed: false, raw: JSON.stringify(expect('IDENT', 'object key').value) };
        expect(':');
        const value = parseExpression();
        properties.push({ key, value });
        skipNewlines();
        if (at(',')) { advance(); skipNewlines(); } else break;
      }
      skipNewlines();
      expect('}');
      return { type: 'ObjectLiteral', properties, line: tok.line };
    }
    throw new EscriptSyntaxError(`unexpected token '${tok.type}'`, tok.line);
  }

  const program = parseProgram();
  expect('EOF');
  return program;
}

module.exports = { parse };
