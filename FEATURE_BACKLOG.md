# Feature Backlog

This backlog lists possible additions for the Guinea Pig Oracle app.
For setup and architecture details, see `README.md`.

## Completed

| ID | Feature | Notes |
| --- | --- | --- |
| F-001 | Save Reading History | Completed: persistent single/spread history with restore and clear actions. |
| F-002 | Notes Per Reading | Completed: per-reading notes with persistent save in both history panels. |
| F-003 | Share Reading Card | Completed: one-click sharing from history items with native share or clipboard fallback. |
| F-004 | Daily Card Mode | Completed: deterministic daily card draw mode with history integration. |
| F-005 | Favorite Cards | Completed: per-card favorites with quick access panel and persistence. |
| F-006 | Search Filters | Completed: library filters for meaning side, keyword tags, and favorites-only mode. |
| F-007 | Animated Shuffle + Deal Controls | Completed: user-adjustable deal speed and animation style controls. |
| T-003 | Componentize UI Scripts | Completed: shared reusable UI helpers extracted into `ui-components.js`. |

## Now (High Impact, Low-Medium Effort)

| ID | Feature | Why It Helps | Effort |
| --- | --- | --- | --- |
| F-008 | Reading Templates | Save custom spreads with labels and card counts. | M |
| F-009 | Card Detail Modal | Full-screen card view with prompt, meaning, and reversed interpretation. | M |
| F-010 | Guided Reading Flow | Step-by-step prompts for reflection after each drawn card. | M |

## Next (Medium Effort, Strong UX)

| ID | Feature | Why It Helps | Effort |
| --- | --- | --- | --- |
| F-011 | Undo / Redraw Per Slot | Lets users redo one card without resetting whole spread. | M |
| F-012 | Audio Ambience Toggle | Optional ambient sounds for ritual mood. | S |

## Later (Larger Scope)

| ID | Feature | Why It Helps | Effort |
| --- | --- | --- | --- |
| F-013 | PWA Offline Install | App can be installed on phone/desktop and run offline. | L |
| F-014 | Multi-Deck Support | Switch between themed decks (base deck, seasonal deck, etc.). | L |
| F-015 | Deck Builder UI | Create/edit/import custom cards without editing JSON manually. | L |
| F-016 | Cloud Sync | Keep readings/favorites across devices. | L |
| F-017 | Community Spread Gallery | Users publish and reuse spread layouts from others. | L |
| F-018 | AI Reflection Assistant | Optional prompt-based interpretation summary for a full spread. | L |

## Technical Quality Backlog

| ID | Improvement | Why It Matters | Effort |
| --- | --- | --- | --- |
| T-001 | Add Test Coverage | Prevent regressions in deck loading, spread rendering, and animations. | M |
| T-002 | TypeScript Migration | Improves safety for complex UI state and animation logic. | L |
| T-004 | Accessibility Pass (WCAG) | Better keyboard nav, labels, contrast, and screen-reader support. | M |
| T-005 | Performance Pass | Faster image rendering/lazy loading and smoother animation on mobile. | M |
| T-006 | Error UI States | Friendly failures for missing images/data issues instead of silent breaks. | S |

## Suggested Build Order

1. F-008 Reading Templates
2. F-009 Card Detail Modal
3. F-010 Guided Reading Flow
4. F-011 Undo / Redraw Per Slot
5. T-001 Add Test Coverage
