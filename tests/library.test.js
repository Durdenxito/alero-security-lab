import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBooks, normalizeBook, statusOf, parseLibrary, serializeLibrary, filterBooks, statsOf } from '../src/library.js';
test('el estado se calcula a partir de las páginas', () => {
  const book = initialBooks()[0];
  assert.equal(statusOf({ ...book, currentPage: 0 }), 'unread');
  assert.equal(statusOf(book), 'reading');
  assert.equal(statusOf({ ...book, currentPage: book.pages }), 'finished');
});
test('se rechazan cantidades inválidas y valores fuera de catálogo', () => {
  const book = initialBooks()[0];
  for (const input of [{ ...book, pages: 0 }, { ...book, currentPage: -1 }, { ...book, currentPage: book.pages + 1 }, { ...book, pages: Infinity }, { ...book, palette: 'url(javascript:alert(1))' }, { ...book, title: ' ' }]) assert.throws(() => normalizeBook(input));
});
test('la importación y la exportación conservan los libros y rechazan duplicados', () => {
  const books = initialBooks();
  assert.deepEqual(parseLibrary(serializeLibrary(books)), books);
  assert.throws(() => parseLibrary(JSON.stringify({ version: 1, books: [books[0], books[0]] })), /repetidos/);
  assert.throws(() => parseLibrary('{}'));
  assert.throws(() => parseLibrary('invalid'));
  assert.throws(() => parseLibrary(JSON.stringify({ version: 1, books: Array(251).fill(books[0]) })));
});
test('las propiedades inesperadas no se propagan al estado', () => {
  const book = initialBooks()[0];
  const imported = parseLibrary(JSON.stringify({ version: 1, books: [{ ...book, admin: true, constructor: { prototype: { polluted: true } } }] }));
  assert.deepEqual(imported, [book]);
  assert.equal({}.polluted, undefined);
});
test('búsqueda sin tildes, filtros y orden no alteran el original', () => {
  const books = initialBooks();
  assert.equal(filterBooks(books, 'all', 'cortazar')[0].title, 'Rayuela');
  assert.equal(filterBooks(books, 'reading', '').length, 2);
  assert.equal(filterBooks(books, 'finished', '').length, 1);
  assert.equal(filterBooks(books, 'all', 'inexistente').length, 0);
  filterBooks(books, 'all', '', 'title');
  assert.equal(books[0].title, 'Ficciones');
});
test('las estadísticas se derivan de las lecturas', () => {
  const stats = statsOf(initialBooks());
  assert.deepEqual(stats, { total: 6, pages: 314, unread: 3, reading: 2, finished: 1 });
});
