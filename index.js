'use strict';

const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { generate } = require('./codegen');

function compile(source) {
  return generate(parse(tokenize(source)));
}

module.exports = { compile };
