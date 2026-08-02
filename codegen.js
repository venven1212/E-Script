'use strict';

const RESERVED_JS_ONLY = new Set(['print']);

function generate(program) {
  return program.body.map((stmt) => genStatement(stmt, 0)).join('\n');
}

function indent(level) { return '  '.repeat(level); }

function genBlockBody(block, level) {
  return block.body.map((s) => genStatement(s, level)).join('\n');
}

function genStatement(node, level) {
  const pad = indent(level);
  switch (node.type) {
    case 'VarDecl': {
      const target = node.name.type === 'ObjectPattern' ? `{ ${node.name.keys.join(', ')} }` : node.name;
      const init = node.init ? ` = ${genExpr(node.init)}` : '';
      return `${pad}${node.kind} ${target}${init};`;
    }
    case 'FuncDecl': {
      const params = node.params.join(', ');
      const prefix = node.isAsync ? 'async function' : 'function';
      if (node.isExprBody) {
        return `${pad}${prefix} ${node.name}(${params}) { return ${genExpr(node.body)}; }`;
      }
      return `${pad}${prefix} ${node.name}(${params}) {\n${genBlockBody(node.body, level + 1)}\n${pad}}`;
    }
    case 'Block':
      return `${pad}{\n${genBlockBody(node, level + 1)}\n${pad}}`;
    case 'If': {
      let out = `${pad}if (${genExpr(node.test)}) {\n${genBlockBody(node.consequent, level + 1)}\n${pad}}`;
      if (node.alternate) {
        if (node.alternate.type === 'If') {
          out += ` else ${genStatement(node.alternate, level).trimStart()}`;
        } else {
          out += ` else {\n${genBlockBody(node.alternate, level + 1)}\n${pad}}`;
        }
      }
      return out;
    }
    case 'While':
      return `${pad}while (${genExpr(node.test)}) {\n${genBlockBody(node.body, level + 1)}\n${pad}}`;
    case 'Repeat': {
      const iterName = node.loopVar || `_i${level}`;
      return `${pad}for (let ${iterName} = 0; ${iterName} < (${genExpr(node.count)}); ${iterName}++) {\n${genBlockBody(node.body, level + 1)}\n${pad}}`;
    }
    case 'ForIn':
      return `${pad}for (const ${node.varName} of (${genExpr(node.iterable)})) {\n${genBlockBody(node.body, level + 1)}\n${pad}}`;
    case 'Return':
      return `${pad}return${node.argument ? ` ${genExpr(node.argument)}` : ''};`;
    case 'Break':
      return `${pad}break;`;
    case 'Continue':
      return `${pad}continue;`;
    case 'ExprStmt':
      return `${pad}${genExpr(node.expression)};`;
    default:
      throw new Error(`codegen: unknown statement type '${node.type}'`);
  }
}

function genExpr(node) {
  switch (node.type) {
    case 'NumberLiteral': return node.value;
    case 'BooleanLiteral': return String(node.value);
    case 'NullLiteral': return 'null';
    case 'Identifier': return node.name === 'print' ? 'console.log' : node.name;
    case 'StringLiteral': {
      if (node.parts.length === 1 && node.parts[0].text !== undefined) {
        return JSON.stringify(node.parts[0].text);
      }
      const inner = node.parts.map((p) => (p.text !== undefined
        ? p.text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
        : `\${${genExpr(p.expr)}}`)).join('');
      return `\`${inner}\``;
    }
    case 'ArrayLiteral':
      return `[${node.elements.map(genExpr).join(', ')}]`;
    case 'ObjectLiteral':
      return `{ ${node.properties.map((p) => `${p.key.raw}: ${genExpr(p.value)}`).join(', ')} }`;
    case 'Unary':
      return node.operator === 'await'
        ? `await (${genExpr(node.argument)})`
        : `${node.operator}(${genExpr(node.argument)})`;
    case 'Binary':
      return `(${genExpr(node.left)} ${node.operator} ${genExpr(node.right)})`;
    case 'Logical':
      return `(${genExpr(node.left)} ${node.operator} ${genExpr(node.right)})`;
    case 'Assign':
      return `(${genExpr(node.target)} ${node.operator} ${genExpr(node.value)})`;
    case 'Call':
      return `${genExpr(node.callee)}(${node.arguments.map(genExpr).join(', ')})`;
    case 'Member':
      return node.computed ? `${genExpr(node.object)}[${genExpr(node.property)}]` : `${genExpr(node.object)}.${node.property.name}`;
    case 'ArrowFunc': {
      const params = node.params.join(', ');
      const prefix = node.isAsync ? 'async ' : '';
      if (node.isExprBody) return `${prefix}(${params}) => (${genExpr(node.body)})`;
      return `${prefix}(${params}) => {\n${genBlockBody(node.body, 1)}\n}`;
    }
    default:
      throw new Error(`codegen: unknown expression type '${node.type}'`);
  }
}

module.exports = { generate };
