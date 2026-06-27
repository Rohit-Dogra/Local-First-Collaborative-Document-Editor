# CollabDocs — Local-First Collaborative Document Editor

> **House of Edtech — Fullstack Developer Assignment 2 (v2.1)**

| | |
|---|---|
| **Name** | _Your Name Here_ |
| **GitHub** | https://github.com/your-username/collab-doc-editor |
| **LinkedIn** | https://linkedin.com/in/your-profile |
| **Live Demo** | _Deploy to Vercel and paste URL here_ |

---

## Overview

CollabDocs is a **local-first** document editor built with **Next.js 16**, **React**, **PostgreSQL**, and **IndexedDB**.

- Edit documents **instantly offline** — no network on the critical path
- **Background sync** pushes/pulls changes when online
- **Deterministic conflict resolution** via Lamport clocks + client ID tiebreaker
- **Version snapshots** with safe restore (does not destroy shared history)
- **Auth & roles**: Owner, Editor, Viewer (viewers cannot push edits)
- **AI assistant**: improve, summarize, grammar, continue writing

---

## Architecture (Simple Explanation)

```
┌─────────────┐     instant read/write      ┌──────────────┐
│   React UI  │ ◄──────────────────────────►│  IndexedDB   │
└──────┬──────┘                             │ (local truth)│
       │                                     └──────┬───────┘
       │ debounced edits                            │
       ▼                                            │ sync queue
┌─────────────┐         push/pull            ┌──────▼───────┐
│ Sync Engine │ ◄───────────────────────────►│  Next.js API │
└─────────────┘                              └──────┬───────┘
                                                    │
                                                    ▼
                                             ┌──────────────┐
                                             │  PostgreSQL  │
                                             └──────────────┘
```

### Conflict Resolution (`src/lib/sync/merge.ts`)

1. Each edit creates **INSERT/DELETE operations** with a Lamport clock
2. All ops are sorted by: `lamport → clientId → sequence`
3. Same sort order = same merged document (deterministic)
4. Duplicate op IDs are ignored (idempotent sync)

### Version Restore

Restore does **not** delete history. It creates new operations that transform the current doc to the snapshot state. Other collaborators merge these like any other edit.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Local storage | Dexie.js (IndexedDB) |
| Backend | Next.js API Routes, Auth.js |
| Database | PostgreSQL + Prisma ORM |
| AI | Vercel AI SDK + OpenAI |
| Tests | Vitest |
| CI/CD | GitHub Actions → Vercel |

---

## Getting Started

### Requirements

- Node.js **20.9+**
- PostgreSQL 14+

### 1. Install

```bash
cd collab-doc-editor
npm install
cp .env.example .env
```

### 2. Configure `.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/collab_docs"
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_URL="http://127.0.0.1:3000"   # local dev only
OPENAI_API_KEY="sk-..."   # optional, for AI features
```

### 3. Database

```bash
npm run db:push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

### Demo Accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| demo@collabdocs.app | password123 | Owner |
| editor@collabdocs.app | password123 | Editor |
| viewer@collabdocs.app | password123 | Viewer |

---

## Testing Offline Sync

1. Open a document as **demo@collabdocs.app**
2. Open DevTools → Network → set **Offline**
3. Edit text — changes save instantly (IndexedDB)
4. Go back **Online** — sync bar shows pending changes, then "All changes saved"
5. Open same doc as **editor@** in another browser — see merged content

---

## Security

### Payload size limits (`src/lib/validation/schemas.ts`)

| Limit | Value |
|-------|-------|
| Max ops per push | 100 |
| Max text per op | 10 KB |
| Max document size | 500 KB |
| Max request body | 512 KB |

These prevent malicious payloads from causing **OOM** on the server.

### Authorization

- JWT session via Auth.js
- Every API route checks `getDocumentAccess()`
- Viewers get **403** on sync push
- Prisma queries scoped to user's documents

### Row Level Security (RLS)

Application-level checks are primary. Optional PostgreSQL RLS policies are in `prisma/rls.sql` for defense-in-depth.

### Other mitigations

- Zod validation on all sync payloads
- Rate limiting (recommended for production — add middleware)
- Content-Length check before JSON parse
- bcrypt password hashing (cost 12)

---

## Deployment (Vercel / Netlify)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
3. Add env vars:
   - `DATABASE_URL` — Supabase/Neon PostgreSQL connection string
   - `AUTH_SECRET` — run `openssl rand -base64 32`
   - `AUTH_URL` — **your live site URL** (e.g. `https://your-app.netlify.app`), not localhost
   - `OPENAI_API_KEY` — optional
4. Run `npx prisma db push` against production DB
5. CI runs on every push (`.github/workflows/ci.yml`)

**Netlify:** `netlify.toml` is included. Set `AUTH_URL` in the Netlify dashboard to your deployed URL (Site settings → Environment variables).

---

## Project Structure

```
src/
├── app/                  # Next.js pages & API routes
├── components/           # UI (editor, sync bar, version panel, AI)
├── lib/
│   ├── sync/
│   │   ├── merge.ts      # ★ Deterministic merge logic
│   │   ├── engine.ts     # ★ Client sync engine
│   │   └── types.ts
│   ├── local-db/         # IndexedDB (Dexie)
│   ├── validation/       # Zod schemas + limits
│   └── auth.ts           # Auth.js config
└── middleware.ts         # Route protection
```

---

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm test           # Unit tests (merge engine)
npm run db:push    # Sync Prisma schema
npm run db:seed    # Demo users & document
```

---

## License

MIT — built for House of Edtech assignment submission.
