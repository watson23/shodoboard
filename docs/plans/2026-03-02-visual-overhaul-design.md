# Shodoboard Visual Overhaul + Quick Polish

## Context

After building the pilot with coaching agenda, mirror moment, and pitch deck export, testing revealed that the board itself is hard to parse. Goals, outcomes, and work items all look too similar. The 6-column kanban is overwhelming on first view. Nudge banners add visual noise. Workshop participants need to understand the board structure at a glance.

## Design

### 1. Tab-Based View System

Add a view toggle in the board header with two equal tabs:

- **"Hierarkia"** — CSS card tree showing goal→outcome→item hierarchy (DEFAULT after board creation)
- **"Board"** — the current 6-column kanban with drag-drop

Both tabs always available. The Coaching Agenda sidebar, Export, and other header actions work from both views.

**Implementation**: A `viewMode` state in Board.tsx (`"hierarchy" | "kanban"`), defaulting to `"hierarchy"` for real boards. Demo board keeps `"kanban"` as default since it has seed data already placed in columns.

### 2. Hierarchy Tree View (New Component)

A vertical card tree rendered with CSS flexbox and pseudo-element connectors.

**Three visual levels:**

| Level | Background | Icon | Typography | Size |
|-------|-----------|------|------------|------|
| Goal | Deep indigo (bg-indigo-600), white text | Flag (Phosphor) | text-lg font-bold | Full width, prominent |
| Outcome | White card, 3px indigo left border | Target (Phosphor) | text-sm font-semibold | Medium card, shows measure |
| Item | White card, subtle border | Type badge | text-xs | Compact, inline |

**Layout structure:**
```
┌──────────────── GOAL CARD (full width) ─────────────────┐
│ 🏁 Kasvata konversiota 30%            Q2 2026 mennessä  │
│ Mittarit: MAU, konversioprosentti, NPS                   │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
┌───────────┴──────────┐  ┌───────────┴──────────┐
│ ◎ OUTCOME            │  │ ◎ OUTCOME            │
│ Kassaprosessi tuntuu │  │ Kävijät löytävät     │
│ luotettavalta        │  │ tuotteen nopeammin   │
│ 📏 Cart completion   │  │ ⚠️ Mittari puuttuu!  │
│    rate > 70%        │  │                      │
├──────────────────────┤  ├──────────────────────┤
│ [Del] Maksusivu      │  │ [Del] Hakutoiminto   │
│ [Dis] Analyysit  ■   │  │ [Dis] Tutkimus      │
│ [Del] SDK-päivitys   │  │                      │
└──────────────────────┘  └──────────────────────┘

⚠️ Ilman yhteyttä (3 itemiä)
┌─────────┐ ┌─────────┐ ┌─────────┐
│ API-int │ │ Raportti│ │ Mobiili │
└─────────┘ └─────────┘ └─────────┘
```

**Connector lines:** CSS pseudo-elements with `border-left` and `border-top` to create tree branches. A vertical line drops from the goal card, then horizontal lines fan out to each outcome.

**Items inside outcome cards:** Items are listed inside the outcome card as compact rows (not separate cards with connectors). Each item row shows:
- Type badge: teal pill "Discovery" or purple pill "Delivery"
- Title text
- Column status as a small colored dot (green=shipped, blue=building, gray=opportunities)
- Nudge dot indicator if a nudge targets this item

**Outcome cards show:**
- Statement (bold)
- Behavior change (small, gray)
- Measure of success, or ⚠️ warning in amber if missing
- Items list below a thin divider

**Missing measures highlighted:** Outcomes without `measureOfSuccess` get an amber left border instead of indigo, and show "⚠️ Mittari puuttuu!" prominently.

**Nudge indicators in tree view:** Small colored dots on the card edge (not full banners). Clicking a dot could open the nudge detail or sparring.

**Unlinked items section:** At the bottom, a distinct "⚠️ Ilman yhteyttä" section showing orphaned items as a horizontal row of compact cards.

### 3. Visual Improvements to Kanban View

While the kanban view mostly stays as-is, apply these improvements:
- Clearer visual distinction between goal header rows, outcome rows, and item cards
- Goal rows: deeper background color, larger text
- Outcome rows: indigo left border accent
- Reduce nudge banner visual weight (smaller text, softer background)

### 4. Quick Polish Fixes

**4a. Bilingual consent screen**
Add English translation below each Finnish paragraph on the consent screen. Use a subtle divider or smaller font for the English version. The consent remains a single screen, not a language toggle.

**4b. Shodoboard logo icon**
Replace the Kanban icon from Phosphor on the "Create your board" button with the existing Shodoboard SVG logo (`/icon.svg`). Also replace in any other places where the Kanban icon represents Shodoboard.

**4c. Dismissable nudges**
Add a dismiss button (X icon) to the expanded NudgeBadge view. Clicking it dispatches `DISMISS_NUDGE` (already exists in the reducer). Dismissed nudges should not reappear. The "Refresh nudges" button generates new nudges (replacing all existing ones).

## Files to modify

- `src/components/Board.tsx` — Add view toggle state, render tree view conditionally
- `src/components/BoardHeader.tsx` — Add Hierarkia/Board tab buttons
- `src/components/HierarchyView.tsx` — NEW: The tree view component
- `src/components/NudgeBadge.tsx` — Add dismiss button
- `src/app/intake/page.tsx` — Bilingual consent screen
- `src/components/IntakeConversation.tsx` — Replace Kanban icon
- `src/app/globals.css` — Tree connector CSS

## Verification

1. Navigate to a real board → default view is "Hierarkia" tree
2. Tree shows goals → outcomes → items with visual connectors
3. Missing measures show amber warning
4. Switch to "Board" tab → existing kanban works as before
5. Consent screen shows both Finnish and English
6. "Create your board" uses Shodoboard logo
7. Nudges can be dismissed with X button
8. Demo board at /board still works (defaults to kanban)
9. `npx next build` passes
