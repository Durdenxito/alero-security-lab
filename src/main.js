import { STORAGE_KEY, normalizeBook, parseLibrary, serializeLibrary, initialBooks, statusOf, filterBooks, statsOf } from './library.js';
import { fillIcons } from './icons.js';

const $ = selector => document.querySelector(selector);
const state = { books: [], filter: 'all', query: '', sort: 'recent', featured: null, editing: null, deleting: null };
const statusLabels = { unread: 'Por leer', reading: 'Leyendo', finished: 'Terminado' };
let toastTimer;
function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500); }
function persist(books) {
  if (books.length > 250) throw new Error('Tu biblioteca admite hasta 250 libros.');
  try { localStorage.setItem(STORAGE_KEY, serializeLibrary(books)); } catch { throw new Error('No se pudo guardar. Comprueba el espacio y los permisos del navegador.'); }
  state.books = books;
  render();
}
function render() {
  const stats = statsOf(state.books);
  for (const [id, value] of Object.entries({ 'nav-total': stats.total, 'nav-reading': stats.reading, 'nav-finished': stats.finished, 'stat-total': stats.total, 'stat-pages': new Intl.NumberFormat('es-PE').format(stats.pages), 'library-count': `${stats.total} libros` })) $(`#${id}`).textContent = value;
  document.querySelectorAll('[data-filter]').forEach(button => { button.classList.toggle('active', button.dataset.filter === state.filter); button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)); button.querySelector('span').textContent = stats[button.dataset.filter === 'all' ? 'total' : button.dataset.filter]; });
  document.querySelectorAll('[data-view]').forEach(button => { const active = button.dataset.view === (state.filter === 'unread' ? 'all' : state.filter); button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  state.featured = state.books.find(book => statusOf(book) === 'reading') ?? state.books.find(book => statusOf(book) === 'unread') ?? null;
  const featured = state.featured;
  $('#current-title').textContent = featured?.title ?? 'Tu próxima historia te espera';
  $('#current-author').textContent = featured?.author ?? 'Añade un libro y empieza a leer.';
  const progress = featured ? Math.round(featured.currentPage / featured.pages * 100) : 0;
  $('#current-progress').value = progress;
  $('#current-progress-text').textContent = featured ? `${featured.currentPage} de ${featured.pages} páginas` : 'Cada historia empieza en la primera página';
  $('#continue-reading').disabled = !featured;
  $('#featured-cover').dataset.palette = featured?.palette ?? 'fern';
  $('.featured-cover-title').textContent = featured?.title ?? 'Tu próxima lectura';
  $('.featured-cover-author').textContent = featured?.author ?? 'Folio';
  const filtered = filterBooks(state.books, state.filter, state.query, state.sort);
  $('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'libro' : 'libros'}`;
  $('#book-grid').replaceChildren();
  $('#empty-state').hidden = filtered.length > 0;
  for (const book of filtered) {
    const node = $('#book-template').content.cloneNode(true);
    const card = node.querySelector('.book-card');
    card.dataset.bookId = book.id;
    const cover = card.querySelector('.book-cover');
    cover.dataset.palette = book.palette;
    cover.setAttribute('aria-label', `Abrir ${book.title}`);
    cover.addEventListener('click', () => openProgress(book.id));
    card.querySelector('.cover-category').textContent = book.genre;
    card.querySelector('.cover-title').textContent = book.title;
    card.querySelector('.cover-author').textContent = book.author;
    card.querySelector('h3').textContent = book.title;
    card.querySelector('.book-author').textContent = book.author;
    const status = statusOf(book);
    card.querySelector('.status').textContent = statusLabels[status];
    card.querySelector('.status').dataset.status = status;
    card.querySelector('.book-page-count').textContent = `${book.currentPage} / ${book.pages} pág.`;
    card.querySelector('.book-progress').value = book.currentPage / book.pages * 100;
    card.querySelector('.book-progress').setAttribute('aria-label', `Progreso de ${book.title}`);
    card.querySelector('.edit-book').setAttribute('aria-label', `Editar ${book.title}`);
    card.querySelector('.edit-book').addEventListener('click', () => openBook(book.id));
    fillIcons(card);
    $('#book-grid').append(node);
  }
}
function openBook(id = null) {
  state.editing = id;
  const form = $('#book-form');
  form.reset(); $('#book-error').textContent = '';
  const book = state.books.find(book => book.id === id);
  $('#book-dialog-title').textContent = book ? 'Editar libro' : 'Añadir un libro';
  $('#delete-book').hidden = !book;
  if (book) for (const key of ['id', 'title', 'author', 'pages', 'currentPage', 'genre', 'palette', 'notes']) form.elements.namedItem(key).value = book[key];
  $('#book-dialog').showModal(); form.elements.title.focus();
}
function openProgress(id) {
  const book = state.books.find(book => book.id === id);
  if (!book) return;
  state.editing = id;
  $('#progress-error').textContent = '';
  $('#progress-book-title').textContent = `${book.title} · ${book.author}`;
  const field = $('#progress-form').elements.currentPage;
  field.max = book.pages; field.value = book.currentPage;
  $('#progress-hint').textContent = `De ${book.pages} páginas. Al llegar al final, pasará a Terminados.`;
  $('#progress-dialog').showModal(); field.focus(); field.select();
}
fillIcons();
try { const saved = localStorage.getItem(STORAGE_KEY); state.books = saved === null ? initialBooks() : parseLibrary(saved); }
catch { state.books = []; notify('No se pudo cargar la biblioteca. Importa una copia guardada para recuperarla.'); }
render();
$('#add-book').addEventListener('click', () => openBook());
$('#continue-reading').addEventListener('click', () => { if (state.featured) openProgress(state.featured.id); });
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('[data-filter], [data-view]').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter ?? button.dataset.view; render(); }));
$('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; render(); });
$('#clear-search').addEventListener('click', () => { state.query = ''; state.filter = 'all'; $('#search').value = ''; render(); });
$('#book-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const existing = state.books.find(book => book.id === state.editing);
  try {
    const book = normalizeBook({ id: existing?.id ?? crypto.randomUUID(), title: form.elements.title.value, author: form.elements.author.value, pages: Number(form.elements.pages.value), currentPage: Number(form.elements.currentPage.value), genre: form.elements.genre.value, palette: form.elements.palette.value, notes: form.elements.notes.value, createdAt: existing?.createdAt ?? Date.now() });
    persist(existing ? state.books.map(item => item.id === book.id ? book : item) : [book, ...state.books]);
    $('#book-dialog').close(); notify(existing ? 'Libro actualizado.' : 'Una nueva historia en tu biblioteca.');
  } catch (error) { $('#book-error').textContent = error.message; }
});
$('#progress-form').addEventListener('submit', event => {
  event.preventDefault();
  const book = state.books.find(book => book.id === state.editing);
  try {
    const updated = normalizeBook({ ...book, currentPage: Number(event.currentTarget.elements.currentPage.value) });
    persist(state.books.map(item => item.id === book.id ? updated : item));
    $('#progress-dialog').close(); notify(statusOf(updated) === 'finished' ? 'Una historia terminada. ¡A por la siguiente!' : 'Tu nueva página ya está guardada.');
  } catch (error) { $('#progress-error').textContent = error.message; }
});
$('#delete-book').addEventListener('click', () => { state.deleting = state.editing; $('#delete-title').textContent = state.books.find(book => book.id === state.deleting).title; $('#book-dialog').close(); $('#delete-dialog').showModal(); });
$('#delete-form').addEventListener('submit', event => { event.preventDefault(); try { persist(state.books.filter(book => book.id !== state.deleting)); $('#delete-dialog').close(); notify('Libro eliminado de tu biblioteca.'); } catch (error) { notify(error.message); } });
$('#export-button').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([serializeLibrary(state.books)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'mi-biblioteca-folio.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Tu copia de la biblioteca está lista.'); });
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; try { if (file.size > 2_000_000) throw new Error('El archivo supera el límite de 2 MB.'); const incoming = parseLibrary(await file.text()); const ids = new Set(state.books.map(book => book.id)); const additions = incoming.filter(book => !ids.has(book.id)); persist([...additions, ...state.books]); notify(`${additions.length} libros importados. Tus libros existentes se conservaron.`); } catch (error) { notify(error.message); } finally { event.target.value = ''; } });
