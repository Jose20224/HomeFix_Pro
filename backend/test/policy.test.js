const test = require('node:test');
const assert = require('node:assert/strict');
const { id, text, optionalText, transition, specialtyCode } = require('../src/lib/policy');

test('id acepta enteros positivos', () => assert.equal(id('42'), 42));
for (const [name, value] of [
  ['cero', 0], ['negativo', -2], ['decimal', 1.5], ['texto', 'abc'], ['vacío', ''], ['infinito', Infinity],
]) test('id rechaza ' + name, () => assert.throws(() => id(value), { message: 'Identificador inválido' }));
test('text elimina espacios externos', () => assert.equal(text('  Casa 12  ', 'Campo'), 'Casa 12'));
test('text rechaza vacío', () => assert.throws(() => text('  ', 'Campo'), { message: 'Campo inválido' }));
test('text respeta el máximo', () => assert.throws(() => text('12345', 'Campo', 4), { message: 'Campo inválido' }));
test('optionalText acepta ausencia', () => assert.equal(optionalText(undefined, 'Campo'), undefined));
test('optionalText acepta vacío', () => assert.equal(optionalText('', 'Campo'), undefined));
test('transición permite ASIGNADO a EN_PROGRESO', () => assert.equal(transition('ASIGNADO', 'EN_PROGRESO'), true));
test('transición permite EN_PROGRESO a FINALIZADO', () => assert.equal(transition('EN_PROGRESO', 'FINALIZADO'), true));
test('transición rechaza saltar a FINALIZADO', () => assert.equal(transition('ASIGNADO', 'FINALIZADO'), false));
test('transición rechaza reabrir un servicio', () => assert.equal(transition('FINALIZADO', 'EN_PROGRESO'), false));
for (const [name, code] of [
  ['Electricidad', 'ELECTRICIDAD'], ['Plomería', 'PLOMERIA'], ['Aire Acondicionado', 'AIRE_ACONDICIONADO'], ['Mantenimiento General', 'MANTENIMIENTO_GENERAL'],
]) test('specialtyCode convierte ' + name, () => assert.equal(specialtyCode(name), code));
