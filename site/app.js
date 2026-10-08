import {
  emptyBoard,
  startBoard,
  parsePlacement,
  toPlacement,
  toFen,
  problems,
  lichessUrl,
} from './fen.js';

// Solid glyphs for both colours (white is drawn by CSS as a filled outline),
// with U+FE0E so phones don't swap in the emoji pawn.
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const ERASER = 'x';
const PALETTE = ['K', 'Q', 'R', 'B', 'N', 'P', ERASER, 'k', 'q', 'r', 'b', 'n', 'p'];
const STORAGE_KEY = 'chess-capture-state';
const SHARE_CACHE = 'chess-capture-share';

const state = {
  board: startBoard(),
  turn: 'w',
  flipped: false,
  selected: 'P',
};

const $ = (id) => document.getElementById(id);

function isWhite(piece) {
  return piece === piece.toUpperCase();
}

function describe(piece) {
  return `${isWhite(piece) ? 'white' : 'black'} ${NAME[piece.toLowerCase()]}`;
}

function pieceSpan(piece) {
  const span = document.createElement('span');
  span.className = `piece ${isWhite(piece) ? 'white' : 'black'}`;
  span.textContent = GLYPH[piece.toLowerCase()] + '︎';
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function squareName(row, col) {
  return 'abcdefgh'[col] + (8 - row);
}

// --- persistence (a convenience only: the app works without storage) ---

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    state.board = parsePlacement(saved.placement);
    state.turn = saved.turn === 'b' ? 'b' : 'w';
    state.flipped = Boolean(saved.flipped);
  } catch {
    // Unavailable storage or a corrupt entry: keep the defaults.
  }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ placement: toPlacement(state.board), turn: state.turn, flipped: state.flipped }),
    );
  } catch {
    // Private mode or blocked storage.
  }
}

// --- rendering ---

function renderBoard() {
  const boardEl = $('board');
  boardEl.replaceChildren();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const row = state.flipped ? 7 - i : i;
      const col = state.flipped ? 7 - j : j;
      const piece = state.board[row][col];
      const sq = document.createElement('button');
      sq.type = 'button';
      sq.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      sq.dataset.row = row;
      sq.dataset.col = col;
      sq.setAttribute('aria-label', `${squareName(row, col)}${piece ? ', ' + describe(piece) : ', empty'}`);
      if (piece) sq.append(pieceSpan(piece));
      if (j === 0) sq.append(coord('rank', 8 - row));
      if (i === 7) sq.append(coord('file', 'abcdefgh'[col]));
      boardEl.append(sq);
    }
  }
}

function coord(kind, text) {
  const el = document.createElement('span');
  el.className = `coord ${kind}`;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function renderPalette() {
  const paletteEl = $('palette');
  paletteEl.replaceChildren();
  for (const p of PALETTE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.piece = p;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(state.selected === p));
    if (p === ERASER) {
      btn.classList.add('eraser');
      btn.textContent = '✕';
      btn.setAttribute('aria-label', 'Eraser');
    } else {
      btn.append(pieceSpan(p));
      btn.setAttribute('aria-label', describe(p));
    }
    paletteEl.append(btn);
  }
}

function renderControls() {
  $('flip-button').setAttribute('aria-pressed', String(state.flipped));
  $('turn-w').setAttribute('aria-checked', String(state.turn === 'w'));
  $('turn-b').setAttribute('aria-checked', String(state.turn === 'b'));

  const fen = toFen(state.board, state.turn);
  $('fen').textContent = fen;
  $('editor-link').href = lichessUrl(fen, 'editor');

  const issues = problems(state.board);
  $('problems').replaceChildren(
    ...issues.map((text) => Object.assign(document.createElement('li'), { textContent: text })),
  );
  const analysis = $('analysis-link');
  if (issues.length) {
    analysis.removeAttribute('href');
    analysis.setAttribute('aria-disabled', 'true');
  } else {
    analysis.href = lichessUrl(fen, 'analysis');
    analysis.removeAttribute('aria-disabled');
  }
}

function render() {
  renderBoard();
  renderPalette();
  renderControls();
  save();
}

// --- photo ---

let photoUrl = null;

function showPhoto(blob) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(blob);
  const img = $('photo');
  img.src = photoUrl;
  img.hidden = false;
  $('photo-hint').textContent = 'Set up the position below to match the photo. Tap the photo to enlarge it.';
}

function onFileChosen(event) {
  const file = event.target.files?.[0];
  if (file) showPhoto(file);
  event.target.value = '';
}

// An image shared from another app arrives via the service worker (sw.js),
// which parks it in a cache and redirects here with ?shared.
async function takeSharedImage() {
  const params = new URLSearchParams(location.search);
  if (!params.has('shared')) return;
  history.replaceState(null, '', location.pathname);
  try {
    const cache = await caches.open(SHARE_CACHE);
    const response = await cache.match('shared-image');
    if (!response) return;
    showPhoto(await response.blob());
    await cache.delete('shared-image');
  } catch {
    // Cache API unavailable; nothing was shared that we can reach.
  }
}

// --- events ---

function wire() {
  $('board').addEventListener('click', (event) => {
    const sq = event.target.closest('.square');
    if (!sq) return;
    const row = Number(sq.dataset.row);
    const col = Number(sq.dataset.col);
    const current = state.board[row][col];
    // Tapping a square that already holds the selected piece clears it, so a
    // mis-tap is undone by tapping again.
    state.board[row][col] = state.selected === ERASER || current === state.selected ? null : state.selected;
    render();
  });

  $('palette').addEventListener('click', (event) => {
    const btn = event.target.closest('.swatch');
    if (!btn) return;
    state.selected = btn.dataset.piece;
    renderPalette();
  });

  $('start-button').addEventListener('click', () => {
    state.board = startBoard();
    render();
  });
  $('clear-button').addEventListener('click', () => {
    state.board = emptyBoard();
    render();
  });
  $('flip-button').addEventListener('click', () => {
    state.flipped = !state.flipped;
    render();
  });
  $('turn-w').addEventListener('click', () => {
    state.turn = 'w';
    render();
  });
  $('turn-b').addEventListener('click', () => {
    state.turn = 'b';
    render();
  });

  $('camera-input').addEventListener('change', onFileChosen);
  $('file-input').addEventListener('change', onFileChosen);
  $('photo').addEventListener('click', () => $('photo').classList.toggle('enlarged'));

  $('copy-button').addEventListener('click', async () => {
    const btn = $('copy-button');
    try {
      await navigator.clipboard.writeText($('fen').textContent);
      btn.textContent = 'Copied';
    } catch {
      getSelection().selectAllChildren($('fen'));
      btn.textContent = 'Selected';
    }
    setTimeout(() => (btn.textContent = 'Copy FEN'), 1500);
  });
}

load();
wire();
render();
takeSharedImage();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // Offline use and sharing need it; the app itself does not.
  });
}
