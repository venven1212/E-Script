'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { tokenize, EscriptSyntaxError } = require('./lexer');
const { parse } = require('./parser');
const { generate } = require('./codegen');

function compile(source) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast);
}

function main() {
  const [, , cmd, file] = process.argv;
  if (!cmd || !file || !['run', 'build'].includes(cmd)) {
    console.log('Usage: escript run <file.es>   — compile and run');
    console.log('       escript build <file.es> — compile to .js next to the source file');
    process.exit(1);
  }

  const source = fs.readFileSync(file, 'utf8');

  let js;
  try {
    js = compile(source);
  } catch (err) {
    if (err instanceof EscriptSyntaxError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  if (cmd === 'build') {
    const outPath = file.replace(/\.es$/, '') + '.js';
    fs.writeFileSync(outPath, js);
    console.log(`Built ${outPath}`);
    return;
  }

  const script = new vm.Script(js, { filename: file });
  const context = vm.createContext({ console, Math, JSON, Array, Object, String, Number, Boolean });
  script.runInContext(context);
}

main();
