import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, parseAmount, balance, transfer, parseState, toCsv } from '../src/bank.js';
const payment = { id: 'test-1', from: 'daily', to: 'savings', amount: '0.10', concept: 'Ahorro' };
test('los importes se convierten a céntimos sin redondear', () => {
  assert.equal(parseAmount('0.10'), 10); assert.equal(parseAmount('12,34'), 1234);
  for (const value of ['0', '-1', 'NaN', '1e3', '1.001', '1000000.01', '', 'Infinity', '1,000.00']) assert.throws(() => parseAmount(value));
});
test('transferir entre cuentas conserva el total y no modifica el estado original', () => {
  const state = initialState(), total = balance(state, 'daily') + balance(state, 'savings');
  const next = transfer(state, payment);
  assert.equal(balance(next, 'daily'), balance(state, 'daily') - 10);
  assert.equal(balance(next, 'savings'), balance(state, 'savings') + 10);
  assert.equal(balance(next, 'daily') + balance(next, 'savings'), total); assert.equal(state.transactions.length, 5);
});
test('un pago externo descuenta exactamente el importe', () => {
  const state = initialState(), next = transfer(state, { ...payment, to: 'lucia', amount: '85.25' });
  assert.equal(balance(next, 'daily'), balance(state, 'daily') - 8525); assert.equal(balance(next, 'savings'), balance(state, 'savings'));
});
test('fondos insuficientes, destino inválido y duplicados no generan movimientos', () => {
  const state = initialState();
  for (const fields of [{ amount: '1000000' }, { to: 'daily' }, { to: 'unknown' }, { from: 'external' }, { concept: ' ' }]) assert.throws(() => transfer(state, { ...payment, ...fields }));
  const next = transfer(state, payment); assert.throws(() => transfer(next, payment)); assert.equal(state.transactions.length, 5);
});
test('el estado persistido se valida y descarta propiedades adicionales', () => {
  const state = initialState(); assert.deepEqual(parseState(JSON.stringify({ ...state, arbitrary: true })), state);
  for (const bad of [{ ...state, version: 2 }, { ...state, transactions: [...state.transactions, state.transactions[0]] }, { ...state, transactions: [{ ...state.transactions[0], cents: 0.5 }] }, { ...state, transactions: [{ ...state.transactions[1], cents: 100000000 }] }]) assert.throws(() => parseState(JSON.stringify(bad)));
});
test('la exportación escapa comillas y neutraliza fórmulas CSV', () => {
  const csv = toCsv([{ ...initialState().transactions[0], concept: '=HYPERLINK("x")' }], 'daily');
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"')); assert.ok(csv.includes('2800.00'));
});
