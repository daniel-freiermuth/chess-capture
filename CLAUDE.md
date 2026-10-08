# chess-capture

Phone web app (PWA): photograph a chess board, set up / correct the position,
open it in Lichess. Static site in `site/`, no build step, no backend, no
login. Deployed to GitHub Pages by `.github/workflows/pages.yml` on push to
`main`.

## Commands
```bash
npm test        # node --test; covers site/fen.js
npm run serve   # local server for site/
```

## Conventions
- Mobile-first: design and check every change at phone width (≈360–390 px)
  and in dark mode. Touch targets ≥ 44 px.
- `site/fen.js` stays pure (no DOM) so it runs under Node tests. Board is
  `board[row][col]`, row 0 = rank 8, col 0 = file a, squares hold FEN letters
  or `null`.
- All asset paths are RELATIVE: the site is served from
  `https://<owner>.github.io/chess-capture/`, not the domain root.
- Lichess hand-off is a plain link: `lichess.org/editor/<fen>` or
  `lichess.org/analysis/standard/<fen>`, spaces in the FEN replaced by `_`.
- Pieces are Unicode glyphs (solid set for both colours, white drawn as an
  outline by CSS, `U+FE0E` appended so phones don't render the emoji pawn).
- When adding a file to `site/`, add it to `SHELL` in `site/sw.js` too, and
  bump `SHELL_CACHE` when the cached set changes.

## Gotchas
- Share target: Android only, and only once the app is installed. The POST
  to `share-target` is answered by the service worker (there is no server),
  which stashes the image in the `chess-capture-share` cache and redirects to
  `./?shared`; `app.js` picks it up. iOS web apps cannot be share targets.
- The board grid needs `grid-template-rows: repeat(8, 1fr)` as well as the
  columns; without it empty ranks collapse shorter than ranks with pieces.
- `node --test test/` fails on Node 22 (it treats the directory as a module);
  plain `node --test` discovers `test/*.test.js`.

## Git
Conventional Commits for commit messages and PR titles. Work on a branch,
open a PR to `main`.
