export const STORAGE_KEY = 'alero.bank.v1';
export const ACCOUNTS = [{ id: 'daily', name: 'Cuenta diaria', number: '•• 2094', opening: 1200000 }, { id: 'savings', name: 'Ahorro flexible', number: '•• 7801', opening: 350000 }];
export const BENEFICIARIES = [{ id: 'lucia', name: 'Lucía Torres' }, { id: 'electric', name: 'Luz del hogar' }];
export const money = cents => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
export function parseAmount(value) {
  if (typeof value !== 'string' || !/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Escribe un importe con hasta dos decimales.');
  const [whole, decimal = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (cents <= 0 || cents > 100000000) throw new Error('El importe debe estar entre S/ 0.01 y S/ 1,000,000.00.');
  return cents;
}
export function initialState() {
  return { version: 1, frozen: false, transactions: [
    { id: 'seed-1', from: 'external', to: 'daily', cents: 280000, concept: 'Abono de planilla', date: '2026-11-20T10:00:00.000Z' },
    { id: 'seed-2', from: 'daily', to: 'external', cents: 18450, concept: 'Mercado de barrio', date: '2026-11-20T15:20:00.000Z' },
    { id: 'seed-3', from: 'daily', to: 'electric', cents: 12490, concept: 'Recibo de luz', date: '2026-11-21T13:00:00.000Z' },
    { id: 'seed-4', from: 'daily', to: 'savings', cents: 100000, concept: 'Ahorro del mes', date: '2026-11-21T16:00:00.000Z' },
    { id: 'seed-5', from: 'daily', to: 'lucia', cents: 8500, concept: 'Almuerzo del sábado', date: '2026-11-21T18:10:00.000Z' },
  ] };
}
const own = id => ACCOUNTS.some(account => account.id === id);
export function balance(state, account) {
  const info = ACCOUNTS.find(item => item.id === account);
  if (!info) throw new Error('Cuenta desconocida.');
  return state.transactions.reduce((sum, item) => sum + (item.to === account ? item.cents : 0) - (item.from === account ? item.cents : 0), info.opening);
}
export function transfer(state, { id, from, to, amount, concept }, date = new Date().toISOString()) {
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id) || state.transactions.some(item => item.id === id)) throw new Error('Esta operación ya fue registrada o su identificador no es válido.');
  if (!own(from) || !(own(to) || BENEFICIARIES.some(item => item.id === to)) || from === to) throw new Error('Selecciona cuentas de origen y destino diferentes.');
  const cents = parseAmount(amount);
  if (typeof concept !== 'string' || !concept.trim() || concept.trim().length > 100) throw new Error('Escribe un concepto de hasta 100 caracteres.');
  if (!Number.isFinite(Date.parse(date))) throw new Error('Fecha no válida.');
  if (balance(state, from) < cents) throw new Error('El saldo de la cuenta no alcanza para este importe.');
  if (state.transactions.length >= 1000) throw new Error('Se alcanzó el límite de 1,000 movimientos de esta demo.');
  return { ...state, transactions: [...state.transactions, { id, from, to, cents, concept: concept.trim(), date }] };
}
export function parseState(text) {
  const value = JSON.parse(text);
  if (value?.version !== 1 || typeof value.frozen !== 'boolean' || !Array.isArray(value.transactions) || value.transactions.length > 1000) throw new Error('Datos guardados no válidos.');
  const transactions = value.transactions.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,64}$/.test(item.id) || !Number.isSafeInteger(item.cents) || item.cents <= 0 || item.cents > 100000000 || typeof item.concept !== 'string' || !item.concept.trim() || item.concept.length > 100 || typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date)) || !(own(item.from) || item.from === 'external') || !(own(item.to) || item.to === 'external' || BENEFICIARIES.some(b => b.id === item.to)) || item.from === item.to) throw new Error('Movimiento guardado no válido.');
    return { id: item.id, from: item.from, to: item.to, cents: item.cents, concept: item.concept, date: item.date };
  });
  if (new Set(transactions.map(item => item.id)).size !== transactions.length) throw new Error('Movimientos duplicados.');
  const result = { version: 1, frozen: value.frozen, transactions: [] };
  for (const item of transactions) {
    if (own(item.from) && balance(result, item.from) < item.cents) throw new Error('El historial contiene un saldo negativo.');
    result.transactions.push(item);
  }
  return result;
}
export function toCsv(transactions, account) {
  const cell = value => `"${String(value).replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  return '\uFEFFFecha,Concepto,Importe PEN\r\n' + transactions.map(item => [item.date, item.concept, ((item.to === account ? item.cents : -item.cents) / 100).toFixed(2)].map(cell).join(',')).join('\r\n');
}
