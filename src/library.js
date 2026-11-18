export const STORAGE_KEY = 'folio.library.v1';
export const GENRES = ['Narrativa', 'Ensayo', 'Poesía', 'Ciencia ficción', 'No ficción'];
export const PALETTES = ['fern', 'clay', 'ink', 'lilac', 'honey', 'sky'];

function text(value, label, max, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new Error(`${label}: introduce un texto ${required ? 'entre 1 y' : 'de hasta'} ${max} caracteres.`);
  }
  return value.trim();
}

export function normalizeBook(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('El libro no tiene un formato válido.');
  if (typeof input.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(input.id)) throw new Error('El identificador del libro no es válido.');
  if (!Number.isInteger(input.pages) || input.pages < 1 || input.pages > 20000) throw new Error('El total debe estar entre 1 y 20.000 páginas.');
  if (!Number.isInteger(input.currentPage) || input.currentPage < 0 || input.currentPage > input.pages) throw new Error('La página actual debe estar entre 0 y el total de páginas.');
  if (!GENRES.includes(input.genre) || !PALETTES.includes(input.palette)) throw new Error('El género o el color del libro no es válido.');
  if (!Number.isSafeInteger(input.createdAt) || input.createdAt < 0) throw new Error('La fecha del libro no es válida.');
  return { id: input.id, title: text(input.title, 'Título', 120), author: text(input.author, 'Autor', 100), pages: input.pages, currentPage: input.currentPage, genre: input.genre, palette: input.palette, notes: text(input.notes ?? '', 'Notas', 1200, false), createdAt: input.createdAt };
}

export function statusOf(book) {
  return book.currentPage === book.pages ? 'finished' : book.currentPage > 0 ? 'reading' : 'unread';
}

export function parseLibrary(json) {
  if (typeof json !== 'string' || json.length > 2_000_000) throw new Error('El archivo supera el límite de 2 MB.');
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('No se pudo leer el archivo JSON.'); }
  if (data?.version !== 1 || !Array.isArray(data.books) || data.books.length > 250) throw new Error('Importa un archivo de Folio con hasta 250 libros.');
  const books = data.books.map(normalizeBook);
  if (new Set(books.map(book => book.id)).size !== books.length) throw new Error('El archivo contiene libros con identificadores repetidos.');
  return books;
}

export function serializeLibrary(books) {
  return JSON.stringify({ version: 1, books: books.map(normalizeBook) }, null, 2);
}

export function filterBooks(books, filter, query, sort = 'recent') {
  const needle = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  return books.filter(book => (filter === 'all' || statusOf(book) === filter) && `${book.title} ${book.author}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(needle)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'es') : sort === 'progress' ? b.currentPage / b.pages - a.currentPage / a.pages : b.createdAt - a.createdAt);
}

export function statsOf(books) {
  return { total: books.length, pages: books.reduce((sum, book) => sum + book.currentPage, 0), unread: books.filter(book => statusOf(book) === 'unread').length, reading: books.filter(book => statusOf(book) === 'reading').length, finished: books.filter(book => statusOf(book) === 'finished').length };
}

export function initialBooks() {
  return [
    ['ficciones', 'Ficciones', 'Jorge Luis Borges', 240, 92, 'Narrativa', 'fern', 'Volver al cuento de la biblioteca.'],
    ['rayuela', 'Rayuela', 'Julio Cortázar', 600, 0, 'Narrativa', 'clay', 'Una lectura sin prisa.'],
    ['mano', 'La mano izquierda de la oscuridad', 'Ursula K. Le Guin', 304, 126, 'Ciencia ficción', 'ink', ''],
    ['estrella', 'La hora de la estrella', 'Clarice Lispector', 96, 96, 'Narrativa', 'lilac', 'Una de esas historias que se quedan.'],
    ['habitos', 'Hábitos atómicos', 'James Clear', 336, 0, 'No ficción', 'honey', 'Recomendación para este mes.'],
    ['orwell', '1984', 'George Orwell', 328, 0, 'Narrativa', 'sky', ''],
  ].map(([id, title, author, pages, currentPage, genre, palette, notes], i) => normalizeBook({ id, title, author, pages, currentPage, genre, palette, notes, createdAt: 1_700_000_000_000 - i }));
}
