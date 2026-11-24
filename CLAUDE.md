# Labobo — repo map

Medical MCQ study site (studywithlabobo.online) for EU Tbilisi students. React 19 + Vite front end, Netlify Functions back end, Supabase (live project `boukmowybmtfqkinuvqj`). Deployed by Netlify from `main` (`npm run build` → `dist/`).

Go straight to the file below instead of searching. For anything not listed, `graphify query "<question>"` first.

| Need | Where |
|---|---|
| Subjects, their tables, topic display names | `src/lib/subjects.js` |
| Which tables the API may read | `ALLOWED_TABLES` in `netlify/functions/questions.js` |
| API routes (`/api/*` → function) | `netlify.toml` redirects, `netlify/functions/*.js` |
| Shared function helpers (CORS, auth, access/lock, devices, uni email) | `netlify/functions/_lib/` |
| Access / subscriptions / lock time | `netlify/functions/_lib/access.js`, `access.js`, `payments.js`, `src/lib/access.js`, `src/hooks/useAccess.js` |
| Quiz engine and views | `src/quiz/` (`QuizEngine.jsx`, `QuizView.jsx`, `StudyView.jsx`, `Guides.jsx`) |
| Pages and routing | `src/App.jsx`, `src/pages/` |
| Admin panel | `src/pages/AdminPage.jsx`, `src/components/admin/`, `netlify/functions/admin.js` (+ `ai-admin.js`) |
| Supabase client / config | `src/lib/supabaseClient.js`, `src/lib/supabaseConfig.js` |
| Database schema (tables, policies, grants) | `supabase/SCHEMA.md` (refresh: run `supabase/schema-snapshot.sql` with `execute_sql`, after every migration) |
| Study guides | `study-guides/<subject>/<part>/*.html`, CSS `study-guides/lb-guide.css`, rules `study-guides/PROMPT.md` |
| Publishing guides | `npm run guides` (build.cjs checks, publish.cjs uploads to Supabase; no deploy needed) |
| Lecture → questions + guide | `/labobo-lecture` skill (`.claude/skills/labobo-lecture/`), reader agent `.claude/agents/lecture-reader.md` |

## Rules that bite
- A new question table needs a migration with a grant, the timed-lock policy and `free_topics` rows, plus an `ALLOWED_TABLES` entry.
- Never print `.env`; production writes use `PROD_SUPA_SERVICE_KEY` from it.
- Read `supabase/SCHEMA.md` instead of calling `list_tables`; check the live database only when the schema file may be stale.
- Don't open `dist/`, `node_modules/`, `graphify-out/cache/`, `study-guides/img/` or lock files.
