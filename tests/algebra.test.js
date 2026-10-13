#!/usr/bin/env node
/* Pruebas unitarias del núcleo algebraico (js/algebra.js). Uso: node tests/algebra.test.js */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ctx = { console, Math, BigInt };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'algebra.js'), 'utf8'), ctx);
const { Alg } = ctx;
const { P, fac } = Alg;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error('✘ ' + name + '\n   ' + e.message);
    process.exitCode = 1;
  }
}

const strip = (html) => html.replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '');

test('lectura y orden estándar', () => {
  assert.strictEqual(Alg.text(P('3 + x^2 - 2x').sorted()), 'x^2 - 2x + 3');
  assert.strictEqual(Alg.text(P('3 + x^2 - 2x')), '3 + x^2 - 2x');
  assert.strictEqual(Alg.text(P('y^2 + x^2 + 2xy').sorted()), 'x^2 + 2xy + y^2');
  assert.strictEqual(Alg.text(P('x + -3')), 'x - 3');
  assert.strictEqual(Alg.text(P('x - -3')), 'x + 3');
  assert.strictEqual(Alg.text(P('2x + 3x - 5x')), '0');
});

test('operaciones', () => {
  assert.ok(P('x+2').mul('x-2').equals('x^2-4'));
  assert.ok(P('2x-3').pow(2).equals('4x^2-12x+9'));
  assert.ok(P('x+y+3').pow(2).equals('x^2+y^2+9+2xy+6x+6y'));
  assert.ok(fac(1, 'x+2', ['x-1', 2]).expand().equals(P('x+2').mul(P('x-1').pow(2))));
  assert.ok(fac('3x', 'x-2').expand().equals('3x^2-6x'));
  assert.strictEqual(P('6x^3y + 9x^2y^2 - 12xy^3').monoGcd().toString(), '3xy');
  assert.strictEqual(Alg.text(P('6x^3 + 9x^2 - 12x').divMono('3x')), '2x^2 + 3x - 4');
});

test('HTML', () => {
  assert.strictEqual(strip(Alg.raw(P('x^2 - x + 1'))), 'x^2 − x + 1');
  assert.strictEqual(strip(Alg.raw(fac(-1, 'x+1', 'x-2'))), '−(x + 1)(x − 2)');
  assert.strictEqual(strip(Alg.raw(fac('3x', 'x+1'))), '3x(x + 1)');
  assert.strictEqual(strip(Alg.raw(fac(1, ['2x-3', 2]))), '(2x − 3)^2');
  assert.strictEqual(strip(Alg.rawPow(P('2x'), 2)), '(2x)^2');
  assert.strictEqual(strip(Alg.rawPow(P('x'), 3)), 'x^3');
  assert.strictEqual(strip(Alg.rawPow(-3, 2)), '(−3)^2');
  assert.strictEqual(strip(Alg.rawPow(5, 2)), '5^2');
  assert.strictEqual(strip(Alg.fx('(a - b)^{2n} = a*b')), '(a − b)^2n = a·b');
  assert.strictEqual(Alg.eq('A', 'A', 'B', 'B'), 'A = B');
});

test('raíces de monomios', () => {
  assert.strictEqual(Alg.text(Alg.monoRoot('4x^2y^6', 2)), '2xy^3');
  assert.strictEqual(Alg.text(Alg.monoRoot('-27x^3', 3)), '-3x');
  assert.strictEqual(Alg.monoRoot('8x^2', 2), null);
  assert.strictEqual(Alg.monoRoot('-4x^2', 2), null);
});

const REDUCIBLES = [
  '2x + 4',
  'x^2 + x',
  'x^2 - 9',
  '4x^2 - 25y^2',
  'x^4 - 16',
  'x^3 + 8',
  '8x^3 - 27y^3',
  'x^2 + 5x + 6',
  'x^2 - x - 12',
  '6x^2 + 7x + 2',
  'x^2 + 2xy + y^2',
  '4x^2 - 12xy + 9y^2',
  'x^2y^2 + 3xy - 10',
  'x^4 + x^2y^2 + y^4',
  'x^4 + 3x^2 + 4',
  'x^4 - 3x^2 + 9',
  'x^4 - 7x^2y^2 + y^4',
  'x^4 + 4',
  '4x^4 + y^4',
  'x^3 - 6x^2 + 12x - 8',
  '8x^3 + 36x^2y + 54xy^2 + 27y^3',
  'x^3 + 2x^2 + 3x + 6',
  '2xy - 8x + 3y - 12',
  'ax + bx + ay + by',
  'x^3 - x^2 - x + 1',
  'x^4 - 5x^2 + 4',
];
const IRREDUCIBLES = [
  'x + 3',
  '2x - 5y',
  'x^2 + 4',
  'x^2 + x + 1',
  'x^2 - 2',
  'x^2 + 3x + 1',
  '4x^2 - 6x + 9',
  'x^2 - xy + y^2',
  'x^4 + 1',
  'x^2 + xy + y^2',
  'x^2 + 3xy + 3y^2',
  'x^2 - 3x + 3',
  '2x^2 + 3',
  'x^2y^2 - 2xy + 4',
  'x^3 + 2',
];

test('detecta polinomios que se pueden factorizar', () => {
  for (const s of REDUCIBLES) assert.ok(Alg.reducibleReason(P(s)), s + ' debería poder factorizarse');
});

test('no marca polinomios irreducibles', () => {
  for (const s of IRREDUCIBLES) {
    const r = Alg.reducibleReason(P(s));
    assert.strictEqual(r, null, s + ' es irreducible pero se marcó: ' + r);
  }
});

console.log(process.exitCode ? '' : '✔ ' + passed + ' pruebas del núcleo algebraico pasaron.');
