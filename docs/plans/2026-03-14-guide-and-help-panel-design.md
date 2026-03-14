# Guide Page & Help Panel Design

**Goal:** Give team members who receive a shared board link a way to understand what they're looking at, and provide ongoing reference for all users.

**Architecture:** Two surfaces sharing the same content structure — a standalone `/guide` page (shareable URL) and a "?" help panel slide-out in the board header.

---

## Audience

Primary: Team members who receive a board link and land on it cold.
Secondary: PMs and any user who wants a reference for board features.

The guide focuses on **reading the board** — not prescribing how teams should collaborate.

## Content Sections

### 1. What is Shodoboard?
One sentence: "A board that helps product teams focus on outcomes, not just shipping features."

### 2. Reading the Board
The core section. Two views exist (Tree and Kanban).

**Column flow (Kanban view):**
- Opportunities → Discovering → Ready for Building → Building → Shipped → Measuring
- Left side = discovery, right side = delivery, "Measuring" closes the loop

**Hierarchy (Tree view):**
- Goals → Outcomes → Work Items
- This structure is what makes it different from a regular kanban

### 3. Goals and Outcomes
Brief explanation of the hierarchy: Goals contain Outcomes, Outcomes contain Work Items. Outcomes describe behavior changes or measurable results, not just deliverables.

### 4. AI Coaching Features
- **Nudges** — yellow indicators on cards suggesting improvements
- **Sparring** — conversation with the AI coach about specific items or the whole board
- **Coaching Agenda** — prioritized list of focus areas the AI identifies
- These are optional but help teams stay outcome-focused

### 5. Working with the Board
Brief: drag cards between columns, click to edit details, toggle between Tree and Kanban views.

## Surface A: `/guide` Page

- Standalone route, shareable URL
- Clean scrollable single page, same visual style as landing page
- Phosphor icons, indigo palette
- No authentication required
- Link back to landing page at the bottom
- PM shares this alongside the board link

## Surface B: "?" Help Panel (Board Header)

- "?" icon button added to the BoardHeader (right side, near existing buttons)
- Opens a slide-out panel from the right side (mirrors Coaching Agenda from the left)
- Same content as `/guide` but in collapsible accordion sections for scannability
- Dismissible, always accessible via the "?" button
- Panel component: `HelpPanel.tsx`
- State managed in the board page (open/closed), not persisted

## Visual Style

Both surfaces use the existing design language:
- Phosphor icons (duotone weight) for section headers
- Indigo accent color
- Gray text hierarchy (900/500/400)
- Rounded cards/sections with subtle borders
- Dark mode support via existing Tailwind classes

## Shared Content

The actual guide text lives in a shared module (e.g. `src/lib/guide-content.ts`) as structured data — arrays of sections with title, icon, and content. Both the `/guide` page and `HelpPanel` render from this same source to avoid duplication.
