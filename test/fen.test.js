import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  START_PLACEMENT,
  emptyBoard,
  startBoard,
  parsePlacement,
  toPlacement,
  inferCastling,
  toFen,
  problems,
  lichessUrl,
} from '../site/fen.js';

test('placement round-trips', () => {
  const placements = [
    START_PLACEMENT,
    '8/8/8/8/8/8/8/8',
    'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR',
    '4k3/8/8/8/8/8/8/4K2R',
  ];
  for (const p of placements) assert.equal(toPlacement(parsePlacement(p)), p);
});

test('board orientation: row 0 is rank 8, col 0 is file a', () => {
  const board = startBoard();
  assert.equal(board[0][0], 'r'); // a8
  assert.equal(board[7][4], 'K'); // e1
  assert.equal(board[6][3], 'P'); // d2
});

test('malformed placements are rejected', () => {
  assert.throws(() => parsePlacement('8/8/8'));
  assert.throws(() => parsePlacement('9/8/8/8/8/8/8/8'));
  assert.throws(() => parsePlacement('x7/8/8/8/8/8/8/8'));
  assert.throws(() => parsePlacement('ppppppppp/8/8/8/8/8/8/8'));
});

test('castling rights follow kings and rooks on their home squares', () => {
  assert.equal(inferCastling(startBoard()), 'KQkq');
  assert.equal(inferCastling(emptyBoard()), '-');
  assert.equal(inferCastling(parsePlacement('4k3/8/8/8/8/8/8/4K2R')), 'K');
  assert.equal(inferCastling(parsePlacement('r3k3/8/8/8/8/8/8/R3K3')), 'Qq');
  // A rook at home without its king grants nothing.
  assert.equal(inferCastling(parsePlacement('r6r/8/8/8/8/8/8/R5KR')), '-');
});

test('full FEN', () => {
  assert.equal(
    toFen(startBoard(), 'w'),
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  );
  assert.equal(toFen(parsePlacement('4k3/8/8/8/8/8/8/4K3'), 'b'), '4k3/8/8/8/8/8/8/4K3 b - - 0 1');
});

test('problems flag illegal positions', () => {
  assert.deepEqual(problems(startBoard()), []);
  assert.deepEqual(problems(emptyBoard()), ['White has no king', 'Black has no king']);
  assert.deepEqual(problems(parsePlacement('4k3/8/8/8/8/8/8/K3K3')), ['White has 2 kings']);
  assert.deepEqual(problems(parsePlacement('P3k3/8/8/8/8/8/8/4K3')), [
    'A pawn is on the first or last rank',
  ]);
  assert.deepEqual(problems(parsePlacement('4k3/8/8/8/8/PPPPPPPP/P7/4K3')), [
    'White has more than 8 pawns',
  ]);
});

test('Lichess links put underscores for spaces', () => {
  const fen = toFen(startBoard(), 'w');
  assert.equal(
    lichessUrl(fen, 'analysis'),
    'https://lichess.org/analysis/standard/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1',
  );
  assert.equal(
    lichessUrl(fen, 'editor'),
    'https://lichess.org/editor/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1',
  );
});
