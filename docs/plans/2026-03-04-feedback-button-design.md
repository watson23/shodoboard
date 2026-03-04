# Feedback Button Design

**Goal:** Enable early users to submit ideas, bugs, and questions with minimal friction directly from the board.

**Architecture:** Icon button in board header opens a lightweight modal. Feedback stored in a dedicated Firestore collection. Admin dashboard extended with a feedback section.

---

## Placement

- Icon-only button (`ChatCircleDots`) in the board header bar
- Positioned between export and theme toggle (meta-action zone)
- Muted styling matching other header icons (`text-indigo-200`)
- Tooltip: "Send feedback"

## Modal

Centered overlay modal (not a slide panel). Quick 5-second interaction:

- **Category pills:** `Idea` | `Bug` | `Question` (default: Idea, inline toggle)
- **Text area:** 3-4 rows, placeholder "What's on your mind?", auto-focused
- **Submit button:** "Send" — disabled while empty or submitting
- **Success state:** "Thanks!" message, auto-closes after 1.5s

No login required. Feedback is anonymous but tied to `boardId` for context.

## Data Flow

- `POST /api/feedback` — public endpoint (no auth), accepts `{ boardId, category, message }`
- Firestore collection `feedback` with fields: `boardId`, `productName`, `category`, `message`, `createdAt`, `userAgent`

## Admin Dashboard

- New summary card: "Feedback" (all-time count)
- New "Recent Feedback" section below boards table: last 20 items with timestamp, board name, category badge, message
- `GET /api/admin/feedback` — admin-protected endpoint

## Scope exclusions

No ratings, screenshots, email collection, or reply mechanism. One-way "drop a note" to keep the threshold low.
