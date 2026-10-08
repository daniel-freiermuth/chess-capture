// Position model and FEN/Lichess helpers. Pure functions, no DOM, so they
// can be unit-tested under Node (see test/fen.test.js).
//
// A board is board[row][col]: row 0 is rank 8 (FEN order), col 0 is file a.
// A square holds a FEN piece letter (KQRBNP white, kqrbnp black) or null.

export const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const PIECES = 'KQRBNPkqrbnp';

export function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

export function startBoard() {
  return parsePlacement(START_PLACEMENT);
}

/** Parses the piece-placement field of a FEN. Throws on malformed input. */
export function parsePlacement(placement) {
  const rows = placement.split('/');
  if (rows.length !== 8) throw new Error(`expected 8 ranks, got ${rows.length}`);
  return rows.map((row, r) => {
    const out = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) out.push(null);
      } else if (PIECES.includes(ch)) {
        out.push(ch);
      } else {
        throw new Error(`bad character '${ch}' in rank ${8 - r}`);
      }
    }
    if (out.length !== 8) throw new Error(`rank ${8 - r} has ${out.length} squares`);
    return out;
  });
}

export function toPlacement(board) {
  return board
    .map((row) => {
      let s = '';
      let gap = 0;
      for (const sq of row) {
        if (sq) {
          if (gap) s += gap;
          s += sq;
          gap = 0;
        } else {
          gap++;
        }
      }
      return gap ? s + gap : s;
    })
    .join('/');
}

/**
 * Castling rights inferred from the picture: a right is assumed whenever the
 * king and that rook still stand on their home squares. A photo can't show
 * whether they moved and came back, so this is the most useful default.
 */
export function inferCastling(board) {
  let s = '';
  if (board[7][4] === 'K') {
    if (board[7][7] === 'R') s += 'K';
    if (board[7][0] === 'R') s += 'Q';
  }
  if (board[0][4] === 'k') {
    if (board[0][7] === 'r') s += 'k';
    if (board[0][0] === 'r') s += 'q';
  }
  return s || '-';
}

/** Full FEN. En passant is unknowable from a photo, move counters reset. */
export function toFen(board, turn) {
  return `${toPlacement(board)} ${turn} ${inferCastling(board)} - 0 1`;
}

/**
 * Things that make the position illegal. Lichess's editor accepts these (you
 * can fix them there), but analysis refuses them.
 */
export function problems(board) {
  const count = (p) => board.flat().filter((sq) => sq === p).length;
  const out = [];
  for (const [king, side] of [['K', 'White'], ['k', 'Black']]) {
    const n = count(king);
    if (n === 0) out.push(`${side} has no king`);
    if (n > 1) out.push(`${side} has ${n} kings`);
  }
  for (const [pawn, side] of [['P', 'White'], ['p', 'Black']]) {
    if (count(pawn) > 8) out.push(`${side} has more than 8 pawns`);
  }
  if ([...board[0], ...board[7]].some((sq) => sq === 'P' || sq === 'p')) {
    out.push('A pawn is on the first or last rank');
  }
  return out;
}

/** Link into Lichess: 'editor' to tweak the position, 'analysis' to analyse it. */
export function lichessUrl(fen, mode) {
  const path = mode === 'analysis' ? 'analysis/standard' : 'editor';
  return `https://lichess.org/${path}/${fen.replace(/ /g, '_')}`;
}
