# GitHub Project Import — Design

**Date:** 2026-03-12
**Status:** Approved

## Summary

One-way import of GitHub Projects V2 data into Shodoboard via the existing AI intake conversation. Users authenticate with GitHub OAuth, pick a project, and the items are fed to Claude's intake flow for outcome-driven transformation.

## Approach

**GitHub OAuth App + Server-Side Token** — standard OAuth flow, token stored server-side in Firestore. Chosen over GitHub App (overkill for read-only import) and client-side PKCE (doesn't simplify due to CORS).

## OAuth Flow

1. Register a GitHub OAuth App (github.com/settings/developers)
2. Callback URL: `{SHODOBOARD_URL}/api/auth/github/callback`
3. User clicks "Import from GitHub" → redirect to GitHub authorization URL
4. Scopes: `read:project, repo` (read Projects V2 + private repo issues)
5. GitHub redirects back with auth code
6. Server exchanges code for access token via `POST https://github.com/login/oauth/access_token`
7. Token stored in Firestore: `users/{uid}/githubToken`
8. User redirected to project picker

Token is read-only, used only server-side, never sent to client.

## Project Picker UI

Page: `/import/github`

1. Fetch user's Projects V2 via GitHub GraphQL API (`viewer { projectsV2 }`)
2. Display as cards: project title, item count, last updated
3. User selects a project
4. Fetch all items: title, body, status/column, labels, assignees, linked issue descriptions
5. Show summary: "Found N items in M columns — ready to start coaching session?"
6. User confirms → redirected to `/intake` with GitHub data pre-loaded

No column mapping — raw data goes to the AI intake for outcome-driven transformation.

## Intake Integration

1. GitHub data passed to `/intake` via a temporary Firestore document ID (or sessionStorage)
2. Intake API formats the data as structured text for Claude: titles, descriptions, statuses, labels
3. Additional prompt context: "The user imported this from a GitHub Project. The column names and statuses reflect their current workflow, not necessarily outcome-driven thinking."
4. Conversation proceeds as normal — Claude asks about goals, outcomes, challenges framing
5. **Metadata preserved:** Work items store `githubIssueUrl` for linking back to the original issue (displayed as a small GitHub icon on cards)

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/github` | GET | Initiates OAuth — redirects to GitHub |
| `/api/auth/github/callback` | GET | Handles callback, stores token, redirects to picker |
| `/api/github/projects` | POST | Fetches user's Projects V2 list |
| `/api/github/project-items` | POST | Fetches all items from a specific project |

## Data Flow

```
[Dashboard] → "Import from GitHub"
  → /api/auth/github → GitHub OAuth → /api/auth/github/callback
  → /import/github (picker page)
  → /api/github/projects → show list
  → user picks one → /api/github/project-items → fetch items
  → summary screen → confirm
  → /intake (with github data ref)
  → existing intake flow with github-formatted backlog
  → board created with githubIssueUrl on work items
```

## Environment Variables

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Scope

**In scope (MVP):**
- GitHub OAuth with read-only project access
- Projects V2 only (GraphQL API)
- One-time import into intake conversation
- `githubIssueUrl` metadata on created work items
- "Import from GitHub" button on landing page alongside existing options

**Out of scope:**
- Two-way sync
- Classic Projects support
- Ongoing/live connection
- Multi-project import
- Webhooks
- GitHub App installation flow
