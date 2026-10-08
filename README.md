# chess-capture

Photograph a chess board with your phone and open the position in Lichess.
No account, no server: everything runs in the browser.

## Using it

1. Open the app and tap **Take photo** (or **Choose image**). On Android,
   once the app is installed, you can also share a photo to it from the
   gallery or camera app.
2. Set up the position on the board under the photo: pick a piece from the
   palette and tap squares. Tapping a square that already holds that piece
   clears it.
3. Choose who is to move, then **Analyse on Lichess**. If the position isn't
   legal yet (a missing king, say), analysis is disabled and **Open in Lichess
   board editor** lets you finish it there.

Castling rights are assumed wherever king and rook stand on their home
squares; en passant is never set. A photo can't show either.

**Automatic recognition isn't built yet.** For now you set up the position
by hand. Recognition will fill the board in for you to correct (see Roadmap).

### Installing on your phone

Open the site and use **Add to Home screen** (Android Chrome: menu → *Install
app*; iOS Safari: share → *Add to Home Screen*). Installing is what makes the
app appear in Android's share sheet. iOS does not let web apps receive shares,
so on iPhone use **Take photo**.

## Development

No build step. Serve `site/` and open it:

```bash
npm run serve   # http://localhost:8080
npm test        # unit tests for the FEN logic (Node 22+)
```

- `site/fen.js` — board model, FEN, legality checks, Lichess links. Pure, tested.
- `site/app.js` — UI: board editor, photo input, share pickup.
- `site/sw.js` — service worker: offline cache and the share-target receiver.
- `site/manifest.webmanifest` — PWA manifest, including `share_target`.

### Deploying

Every push to `main` deploys `site/` to GitHub Pages
(`.github/workflows/pages.yml`). One-time setup: **Settings → Pages → Source =
GitHub Actions**.

## Roadmap

- On-device board recognition: find the board's corners, flatten it, and
  classify the 64 squares with a small model run through ONNX Runtime Web.
  [chesscog](https://github.com/georg-wolflein/chesscog) is the starting
  point.
- Detect which side White is on from the board's coordinates or the pieces.
