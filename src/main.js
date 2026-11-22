import { ACCOUNTS, BENEFICIARIES, STORAGE_KEY, balance, initialState, money, parseState, transfer, toCsv } from './bank.js';
const $ = selector => document.querySelector(selector);
let state = initialState(), selected = 'daily', requestId, timer;
function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(timer); timer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function commit(next) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { throw new Error('No se pudo guardar. Revisa los permisos o el espacio del navegador.'); }
  state = next; render();
}
function element(tag, text, className) { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; }
function render() {
  $('#total-balance').textContent = money(ACCOUNTS.reduce((sum, account) => sum + balance(state, account.id), 0));
  const savings = balance(state, 'savings'); $('#goal-amount').textContent = money(savings); $('#goal').value = savings; $('#goal-percent').textContent = `${Math.min(100, Math.floor(savings / 6000))}% de tu meta`;
  $('#account-list').replaceChildren(...ACCOUNTS.map(account => {
    const button = element('button', '', `account${selected === account.id ? ' selected' : ''}`);
    button.setAttribute('aria-pressed', String(selected === account.id)); button.setAttribute('aria-label', `Ver ${account.name}`);
    const info = element('span', '', 'account-info'), amount = element('span', '', 'account-balance');
    info.append(element('strong', account.name), element('small', `Soles · ${account.number}`)); amount.append(element('strong', money(balance(state, account.id))), element('small', 'Saldo disponible'));
    button.append(element('span', account.id === 'daily' ? '▤' : '↗', 'account-icon'), info, amount); button.addEventListener('click', () => { selected = account.id; render(); }); return button;
  }));
  $('#activity-account').textContent = ACCOUNTS.find(a => a.id === selected).name;
  const query = $('#search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), filter = $('#filter').value;
  const transactions = state.transactions.filter(item => (item.from === selected || item.to === selected) && (filter === 'all' || (filter === 'in' ? item.to === selected : item.from === selected)) && item.concept.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query)).slice().reverse();
  $('#transactions').replaceChildren(...transactions.map(item => {
    const row = document.createElement('tr'), cell = document.createElement('td'), title = element('div', '', 'transaction-title'), info = document.createElement('span');
    const incoming = item.to === selected, internal = ACCOUNTS.some(a => a.id === item.from) && ACCOUNTS.some(a => a.id === item.to);
    info.append(element('strong', item.concept), element('small', internal ? 'Entre tus cuentas' : incoming ? 'Abono recibido' : 'Pago registrado'));
    title.append(element('span', incoming ? '↙' : '↗', 'tx-icon'), info); cell.append(title);
    row.append(cell, element('td', new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', timeZone: 'America/Lima' }).format(new Date(item.date)), 'date'), element('td', `${incoming ? '+' : '−'} ${money(item.cents)}`, `amount${incoming ? ' income' : ''}`)); return row;
  }));
  $('#count').textContent = `${transactions.length} movimientos`; $('#empty').hidden = transactions.length > 0;
  $('#card-state').textContent = state.frozen ? 'Tarjeta en pausa' : 'Disponible para usar'; $('#freeze').textContent = state.frozen ? 'Reactivar tarjeta' : 'Pausar tarjeta'; $('#freeze').setAttribute('aria-pressed', String(state.frozen)); $('#card-dot').classList.toggle('paused', state.frozen); $('.bank-card').classList.toggle('paused', state.frozen);
}
for (const account of ACCOUNTS) $('#from').add(new Option(`${account.name} ${account.number}`, account.id));
function destinations(preferred) {
  const current = preferred ?? $('#to').value; $('#to').replaceChildren();
  for (const account of ACCOUNTS.filter(a => a.id !== $('#from').value)) $('#to').add(new Option(`Mi ${account.name.toLowerCase()} ${account.number}`, account.id));
  for (const person of BENEFICIARIES) $('#to').add(new Option(person.name, person.id));
  if ([...$('#to').options].some(option => option.value === current)) $('#to').value = current;
  $('#available').textContent = `Disponible: ${money(balance(state, $('#from').value))}`;
}
function openTransfer(saving = false) {
  $('#transfer-form').reset(); $('#from').value = saving ? 'daily' : selected; destinations(saving ? 'savings' : undefined); $('#form-error').textContent = ''; requestId = crypto.randomUUID(); $('#transfer-dialog').showModal();
}
$('#open-transfer').addEventListener('click', () => openTransfer()); $('#nav-transfer').addEventListener('click', () => openTransfer()); $('#save-money').addEventListener('click', () => openTransfer(true)); $('#from').addEventListener('change', () => destinations());
document.querySelectorAll('.close').forEach(button => button.addEventListener('click', () => $('#transfer-dialog').close()));
$('#transfer-form').addEventListener('submit', event => {
  event.preventDefault(); const button = $('#submit-transfer'); if (button.disabled) return; button.disabled = true;
  try { const fields = Object.fromEntries(new FormData(event.currentTarget)); commit(transfer(state, { ...fields, id: requestId })); $('#transfer-dialog').close(); notify('Transferencia registrada. Tus saldos están actualizados.'); }
  catch (error) { $('#form-error').textContent = error.message; } finally { button.disabled = false; }
});
$('#search').addEventListener('input', render); $('#filter').addEventListener('change', render);
$('#freeze').addEventListener('click', () => { try { commit({ ...state, frozen: !state.frozen }); } catch (error) { notify(error.message); } });
$('#export').addEventListener('click', () => {
  const data = toCsv(state.transactions.filter(item => item.from === selected || item.to === selected), selected), url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a'); link.href = url; link.download = `alero-${selected}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) state = parseState(stored); } catch { notify('No se pudo leer el estado guardado. Se muestran los datos de demostración.'); }
render();
