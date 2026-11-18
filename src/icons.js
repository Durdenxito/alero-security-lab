const paths = {
  library: ['M4 5h4v15H4z', 'M10 5h4v15h-4z', 'm16 6 4-1 3 14-4 1z'],
  'book-open': ['M12 6C9 4 5 4 2 5v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1Zm0 0v14'],
  check: ['m5 12 4 4L19 6'], search: ['M21 21l-5-5', 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16'],
  plus: ['M12 5v14', 'M5 12h14'], close: ['m6 6 12 12', 'M18 6 6 18'],
  pencil: ['m4 16-1 5 5-1L20 8l-4-4L4 16Z', 'm14 6 4 4'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 16v5h16v-5'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 17v4h16v-4'],
  more: ['M5 12h.01M12 12h.01M19 12h.01'],
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': name === 'more' ? '3' : '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  for (const d of paths[name] ?? []) { const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path); }
  return svg;
}
export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => { element.replaceChildren(icon(element.dataset.icon)); });
}
