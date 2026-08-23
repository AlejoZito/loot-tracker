# Styles Overview

All styling uses the **`[data-theme]` attribute** pattern — no Tailwind theme utilities for visual styles.

---

## Architecture

CSS is split across two locations:

### `client/src/styles/` — global styles
Page-level layout, shared utilities, and per-theme visual overrides. Theme authors add new rules here.

| File | Purpose |
|---|---|
| `base.css` | Structural/layout styles shared by both themes |
| `orc-theme.css` | Visual styles scoped to `[data-theme="orc"]` |
| `material-theme.css` | Visual styles scoped to `[data-theme="material"]` |
| `../index.css` | CSS variable tokens per theme (colors, fonts) |

### `client/src/components/<Name>/base.css` — component-local styles
Self-contained components own a `base.css` for their structural rules. Theme-specific visuals for those components still live in the central theme files (`orc-theme.css`, `material-theme.css`) using the same `[data-theme]` selector pattern.

| Component | base.css contains | Theme overrides in |
|---|---|---|
| `Card` | structural rules + unscoped base visuals (material-style defaults) | `styles/orc-theme.css` for orc-specific overrides |

**Rule:** a component's `base.css` owns its structural rules and unscoped base visuals. Non-default themes override using `[data-theme]` selectors in their central theme file. Do not duplicate card rules in `styles/base.css`.

---

## CSS Variables (Design Tokens)

Defined in `../index.css` under `[data-theme="orc"]` and `[data-theme="material"]`. Use these everywhere — never hardcode colors.

| Variable | Role |
|---|---|
| `--bg` | Page/surface background |
| `--fg` | Primary text and icon color |
| `--primary` | Brand/action color (buttons, active states) |
| `--primary-fg` | Text on `--primary` surfaces |
| `--accent` | Positive/income color (green) |
| `--accent-fg` | Text on `--accent` surfaces |
| `--destructive` | Danger/expense color (red/orange) |
| `--destructive-fg` | Text on `--destructive` surfaces |
| `--muted` | Subdued backgrounds (inputs, toggles) |
| `--muted-fg` | Secondary/placeholder text |
| `--border` | Default border color |
| `--border-light` | Highlight edge (orc bevel top-left) |
| `--border-dark` | Shadow edge (orc bevel bottom-right) |
| `--font-family` | Theme font stack |

---

## base.css — Shared Layout Classes

These classes define **structure only** (dimensions, flex, positioning). Visual styling (colors, fonts, borders) lives in the theme files.

### Global
- `*` — `box-sizing: border-box` on everything
- `body::after` — "📱 UI móvil" badge shown on screens ≥ 768px (mobile-only app indicator)

### Page Shell
- `.page-bg` — full-width, min-height 100vh page wrapper
- `.app-nav` — bottom nav bar shadow

### Content Panel (the framed card)
- `.content-panel` — centered column, max-width 32rem (40rem on desktop)
- `.panel-frame-top` / `.panel-frame-bottom` — top/bottom decorative frame strips
- `.panel-frame-center` — scrollable content area between frames
- `.panel-inner` — inner flex column with 1rem gap

### Form Components
- `.transaction-top-row` — centered row at top of transaction form
- `.transaction-form` — adds bottom padding so content clears the fixed submit button
- `.transaction-form-submit-wrapper` — fixed bottom bar holding the submit button (sits above nav at `bottom: 60px`)
- **Card wrapper** — use the `<Card>` component (`components/Card/Card.tsx`); do not use raw `div` with manual padding here

### Toggle / Segmented Control
- `.toggle-container` — outer pill wrapper
- `.toggle-btn` — individual segment button
- (Active/color variants defined per theme)

### Category Picker
- `.category-btn` — icon + label button, transparent background
- `.category-btn:hover` — `brightness(1.2)` on hover
- `.category-icon` — square image, `aspect-ratio: 1`, covers container
- `.category-label` — 8px label below icon, truncated with ellipsis
- `.category-grid` — overflow-hidden grid container
- `.category-option` — individual grid cell (receives `--card-index` CSS var for stagger animations)

### Switch Toggle (on/off)
- `.switch-toggle` — 3rem × 1.5rem track
- `.switch-thumb` — sliding knob inside track
- `.switch-thumb-off` / `.switch-thumb-on` — positional states

### Currency Input
- `.currency-prefix` — absolutely positioned `$` symbol inside input

### Cuenta (Account) Page
- `.cuenta-page` — full height, bottom padding for nav
- `.cuenta-container` — flex column with gap + top padding
- `.cuenta-portrait-frame` — square avatar frame, max 280px (360px on desktop)
- `.cuenta-portrait` — avatar image, `object-fit: cover` top-aligned
- `.cuenta-username` — capitalized username
- `.cuenta-logout-btn` — icon + label button, no background
- `.cuenta-logout-icon-frame` — 150×150 icon container with overflow hidden
- `.cuenta-logout-icon` — logout icon image

### Expense List Page
- `.expense-list-page` — full height, bottom padding 96px, flex column centered
- `.expense-list-header-bar` — sticky top header (z-index 10), flex column, 12px padding
- `.expense-list-body` — flex column for expense rows
- `.expense-filter-row` — flex row holding filter tabs + search bar
- `.expense-filter-tabs` — flex row of tab buttons
- `.expense-filter-tab` — individual filter tab (flex centered, `border: none`)
- `.expense-filter-tab img` — 12×30px pixelated payer icon
- `.expense-filter-tab__img--inactive` — grayscale + 50% opacity for inactive payer icon

#### Expense Search Bar
- `.expense-search` — collapsed search container
- `.expense-search--open` — expanded state (takes available width)
- `.expense-search-toggle` / `.expense-search-close` — 36px icon buttons
- `.expense-search-input` — text input, slides in with `expense-search-slide-in` animation
- `.expense-search-scope` — row of "All / Notes / Category" scope buttons
- `.expense-search-scope__btn` — individual scope button
- `.expense-search-truncated` — "showing N of M" notice
- `.expense-search-cats` — flex-wrap row of category filter chips
- `.expense-search-cat` — 30×30px circular category chip
- `.expense-search-cat__emoji` — 16px emoji inside chip

#### Expense Rows
- `.expense-row` — row container, min-height 72px, `overflow: hidden`
- `.expense-row-plank` — the visible row face (slides left on swipe via `translateX(-160px)`)
- `.expense-row--swiped` — applied when row is swiped to reveal actions
- `.expense-row-actions` — 160px action panel revealed on swipe (right-aligned)
- `.expense-row-actions__edit` / `.expense-row-actions__delete` — action buttons
- `.expense-row-text` — flex column holding primary + secondary text
- `.expense-row-primary` / `.expense-row-secondary` — truncated text lines
- `.expense-cat-tile` — 36×36px emoji category icon
- `.expense-row-aside` — right-aligned flex column (amount + payer badge)
- `.expense-payer-badge` — payer icon pair
- `.expense-payer-badge__img` — 12×30px pixelated payer icon
- `.expense-payer-badge__secondary` — grayscale + 50% for inactive payer
- `.expense-row-amount` — tabular-nums amount (color variants in theme files)
- `.expense-list-empty` — centered empty state container
- `.expense-row--skeleton` — skeleton loading state (pulsing opacity animation)

#### Expense List Utilities
- `.expense-list-fab` — fixed FAB button (`bottom: 50px`, `right: 1rem`)
- `.expense-list-scroll-trigger` — 1px invisible sentinel for infinite scroll
- `.expense-list-end` — "end of list" message

### Offline Banner
- `.offline-banner` — sticky top bar (z-index 50), 0.75rem font, 0.5rem padding

### Habits Page
- `.habits-page` — full height, bottom padding
- `.habits-header` — space-between row with nav arrows + date label
- `.habits-day-nav` — prev/next arrow buttons (min-width 2.5rem)
- `.habits-day-label` — centered date label
- `.habits-section-title` — section heading
- `.habits-progress-section` — progress bars section
- `.habits-progress-item` — single progress bar row
- `.habits-progress-label` — space-between label + percentage
- `.habits-progress-bar` — 6px tall track
- `.habits-progress-fill` — animated fill (transitions `width`)
- `.habits-daily-section` — list of habit toggle rows
- `.habits-toggle-row` — space-between row with label + switch
- `.habits-toggle-label` — flex-1 habit name
- `.habits-loading` — centered loading text
- `.habits-skeleton` / `.habits-skeleton-text` / `.habits-skeleton-pct` / `.habits-skeleton-bar` — skeleton shimmer elements

### Confirm Modal
- `.confirm-modal-overlay` — fixed full-screen dim overlay (z-index 100)
- `.confirm-modal` — centered card, max 320px
- `.confirm-modal-message` — bold message text
- `.confirm-modal-actions` — flex row of action buttons
- `.confirm-modal-cancel` / `.confirm-modal-confirm` — equal-width buttons

### Summary Page
- `.summary-header-row` — space-between flex row with month selector
- `.summary-month-select` — auto-width select, max 180px
- **Card wrapper** — use `<Card as="section">` (see `components/Card/`); `.summary-card` has been removed
- `.summary-card-inner` — full-width inner column with `gap: 0.5rem`; used inside `<Card>` for summary content
- `.summary-section-title` — section heading
- `.summary-row` — space-between label/value pair
- `.summary-row-label` / `.summary-row-value` — row cells
- `.summary-subtotals` — subtotal rows with small gap
- `.summary-row-total` — total row with top padding/margin
- `.summary-saldo-amount` — bold balance amount
- `.summary-saldo-negative` — red balance (uses `--destructive`)
- `.summary-saldo-positive` — green balance (uses `--accent`)
- `.summary-charts-grid` — 1-col grid (2-col at ≥640px)
- `.summary-chart-container` — individual chart card
- `.summary-chart-title` — 0.8rem chart heading
- `.summary-chart-legend` — flex-wrap legend row
- `.summary-chart-legend-item` — legend entry (dot + label)
- `.summary-chart-legend-dot` — 8×8px colored circle

---

## orc-theme.css — Orc/RTS Theme

All selectors are scoped to `[data-theme="orc"]`. Aesthetic: Warcraft-style wooden boards, pixel fonts (`Press Start 2P` and `VT323`), chiseled bevel borders.

### Key Visual Patterns
- **Page background**: tiled `/images/bg.jpg`
- **Panel frames**: three-slice board images (`board-top.png`, `board-center.png`, `board-bottom.png`)
- **Bevel borders**: `border-color: var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)` (top-left highlight, bottom-right shadow). Pressed state reverses this.
- **Text shadows**: `1px 1px 0 rgba(0,0,0,0.5)` for readability on textured backgrounds
- **Primary font**: `'Press Start 2P'` at small sizes (0.5rem–1rem)
- **Secondary font**: `'VT323'` at larger pixel sizes (14px–18px) for body text in lists

### Category Grid Animations
- `.category-grid--collapsing` → cards fly to deck with stagger (`collapse-to-deck` keyframes)
- `.category-grid--expanding` → cards fan out from deck (`expand-from-deck` keyframes)
- Stagger delay uses `--card-index` CSS custom property set per card

### Expense List Specific
- Row planks use `board-center.png` as background texture
- Swipe actions: edit=`--primary`, delete=`--destructive`, both with pixel fonts
- Amount colors: income=`--accent` (green), expense=`--fg` (gold/tan)
- FAB: 50×50px image with drop-shadow, hover lifts with `translateY(-2px)`
- Search bar: `--muted` background with dark inset border when open

---

## material-theme.css — Material Design Theme

All selectors are scoped to `[data-theme="material"]`. Aesthetic: clean cards, elevation shadows, rounded corners, system fonts.

### Key Visual Patterns
- **Page background**: flat `--bg` (near-white)
- **Panel**: top/bottom frames hidden (`display: none`), center frame is a white card with `border-radius: 12px` and `box-shadow`
- **Buttons**: `border-radius: 8px`, elevation shadow, no border
- **Inputs**: `border-radius: 8px`, colored focus ring using `--primary` at 15% opacity
- **Toggles**: rounded pill with white active segment and shadow
- **Focus ring**: `box-shadow: 0 0 0 3px oklch(0.49 0.16 275 / 0.15)` on inputs

### Category Grid Animations
- Simpler than Orc: `mat-fade-out` / `mat-fade-in` with subtle scale (0.95→1)

### Expense List Specific
- Rows: white background, `border-radius: 8px`, card shadow
- Body has `padding: 0 12px` for card gutters
- Swipe actions: rounded right corners matching the row card
- Amount colors: income=`--accent`, expense=`--destructive`
- FAB: 56×56px, `border-radius: 16px`, filled with `--primary`, elevated shadow
- Search bar: `--muted` pill background with `border-radius: 18px` when open

---

## Card Component (`components/Card/`)

The de-facto content container used across pages. Structural rules live in `components/Card/base.css`; visual rules per theme live in `orc-theme.css` / `material-theme.css`.

### Usage
```tsx
import { Card } from '../components/Card/Card';

<Card>…</Card>                  // renders <div class="card">
<Card as="section">…</Card>     // renders <section class="card">
<Card className="extra">…</Card> // merges extra class
```

### Base classes (structural — `components/Card/base.css`)
- `.card` — `width: 100%`, `padding: 12px`, `display: flex; flex-direction: column`
- `.card-section + .card-section` — auto top margin between stacked sections
- `.card-row` — space-between flex row for label/value pairs

### Typography classes (visual — defined in theme files)
These are scoped to the Card component. **Do not use them outside `<Card>`.**

| Class | Role |
|---|---|
| `.card-title` | Bold heading / label — primary emphasis |
| `.card-text` | Body text — secondary description |
| `.card-meta` | Small muted text — dates, notes, subtitles |
| `.card-amount` | Numerical value, tabular |
| `.card-amount--income` | Income amount color (green) |
| `.card-amount--expense` | Expense amount color (red/orange) |

### Where styles live
- **Base/default** (material-style): `components/Card/base.css` — unscoped, applies to all themes
- **Orc** (override): `styles/orc-theme.css` under `[data-theme="orc"]` — board texture, pixel borders, `Press Start 2P` fonts

---

## Adding a New Theme

1. Add CSS variables to `../index.css` under `[data-theme="your-theme"]`
2. Create `your-theme.css` in this directory following the same selector pattern
3. Import it in `../main.tsx` (or wherever theme CSS is imported)
4. Add the theme key to `ThemeContext.tsx`

The minimal set of classes to implement for a complete theme: `.page-bg`, `.panel-frame-*`, `.page-title`, `.btn` (+ variants), `.input-field`, `.field-label`, `.toggle-container`, `.toggle-btn` (+ variants), `.category-icon`, `.switch-toggle`, `.switch-thumb`, `.expense-row-plank`, `.expense-list-fab`, `.card` (+ `.card-title`, `.card-text`, `.card-meta`, `.card-amount`).
