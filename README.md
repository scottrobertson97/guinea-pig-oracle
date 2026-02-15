# Guinea Pig Oracle

A static, browser-first oracle card app with:

- Single-card draws
- Daily card mode (same card for each local date)
- Animated spread dealing
- Adjustable deal speed and animation style
- Searchable card library
- Search filters (meaning side, keyword tag, favorites-only)
- Favorite cards with quick access section
- Persistent reading history (single + spread)
- Notes per saved reading
- One-click share for saved readings

## Run The App

No local server is required.

1. Open `index.html` directly in your browser.
2. Navigate with the top tabs:
   - `Draw` for single-card pulls
   - `Spread` for custom spread deals
   - `Library` for card browsing/search

Optional local server (if you prefer one):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Data Model

- Source deck data: `deck.json`
- Browser-loaded deck data: `deck-data.js`

`deck-data.js` is generated from `deck.json` so the app can run from `file://` without CORS issues.

Regenerate it after editing `deck.json`:

```bash
./scripts/build_deck_data.sh
```

## Reading History

- Stored in browser `localStorage`
- Key: `oracle-reading-history-v1`
- Supports:
  - auto-save on draw/spread
  - restore from history panel
  - clear history by type (single or spread page)
  - per-reading notes saved to history entries
  - one-click share actions for single/spread history items

### Notes Per Reading

- Each saved history item includes a note field.
- Edit the note in the history card and click `Save Note` (or blur the field to auto-save).
- Notes persist with the same reading entry in `localStorage`.

### Daily Card Mode

- Click `Daily Card` on the Draw page.
- The daily draw is deterministic for your local calendar date.
- Re-drawing daily mode on the same date returns the same card/orientation.
- A daily reading is stored in history as `Daily Card`.

### Deal Controls

- Spread page includes two deal controls:
  - `Deal speed`: `Slow`, `Normal`, `Fast`
  - `Animation style`: `Classic`, `Snappy`, `Dramatic`
- Controls affect the live dealing animation timing and feel.
- Preferences persist in browser storage and are reused next visit.

### Favorites And Filters

- Every rendered card has a `Favorite` toggle button.
- Favorites are stored in browser `localStorage` under `oracle-favorites-v1`.
- Library page includes:
  - meaning-side filter (`All`, `Upright`, `Reversed`)
  - keyword tag filter
  - favorites-only toggle
  - `Favorite Cards` quick access section

### Sharing Readings

- Click `Share` on any saved reading item in Draw or Spread history.
- If `navigator.share` is available, the native share sheet opens.
- If native share is unavailable, the reading summary is copied to clipboard.
- Shared text includes card data and saved notes. If an image path exists, its URL is included.

## Project Structure

- `index.html` / `index.js`: single-card draw page
- `spread.html` / `spread.js`: spread layout + dealing animation
- `library.html` / `library.js`: full deck browsing + search
- `app.js`: shared deck loading, card rendering, history API, and favorites API
- `ui-components.js`: shared UI components (history list item/time/card mapping + note editor + sharing helpers)
- `styles.css`: app styling and animations
- `deck.json`: canonical deck content
- `deck-data.js`: generated browser deck payload
- `scripts/build_deck_data.sh`: deck-data generator
- `FEATURE_BACKLOG.md`: prioritized roadmap and completed items

## Card Art Utilities

Generate local deterministic SVG art for every card:

```bash
python3 scripts/generate_svg_cards.py
./scripts/build_deck_data.sh
```

If you use `scripts/generate_images.py`, it reads prompts from `deck.json` and updates card art files with model-generated images.

Environment:

- Set `OPENAI_API_KEY` in your local `.env` file
- Do not commit real API keys to source control

## Roadmap

See `FEATURE_BACKLOG.md` for current priorities and completed work.
