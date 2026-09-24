# Labobo

Labobo is a browser-based medical study and exam platform that helps learners practice subject-based MCQs, review mistakes, track performance, and compete on weekly leaderboards. It blends a React frontend with Netlify serverless functions and Supabase data access so question banks and leaderboard data can be served without exposing backend secrets directly to the browser.

## Tech Stack

- React + Vite for the client application
- React Router for page navigation
- Netlify Functions for lightweight server-side APIs
- Supabase as the datastore for questions, sessions, leaderboard entries
- JavaScript / JSX for frontend logic and UI
- CSS custom styles for the app UI

## Key Features

- Subject-based question banks for medical and preclinical learning
- Study, practice, and exam modes with different feedback patterns
- Wrong-answer review flow to reinforce weak topics
- Weekly leaderboard tracking by subject and account
- User session and performance tracking
- Responsive single-page learning experience

## Repository Structure

```text
.
├── dist/                         # Production build output
├── netlify/
│   └── functions/               # Serverless APIs
│       ├── leaderboard.js       # Weekly leaderboard read/write API
│       ├── questions.js         # Question-bank proxy API
│       └── supa-insert.js       # Legacy or utility insertion endpoint
├── public/                      # Static assets and SPA entry
├── src/
│   ├── components/              # Reusable UI pieces
│   ├── hooks/                   # Client-side hooks
│   ├── lib/                     # Subject definitions and shared utilities
│   ├── pages/                   # Route-level views
│   ├── quiz/                    # Quiz engine and learning flows
│   ├── App.jsx                  # App routing / root composition
│   ├── main.jsx                 # App bootstrap
│   └── styles.css               # Global styling
├── .gitignore
├── index.html
├── netlify.toml                 # Netlify config and rewrites
├── package.json                 # Scripts and dependencies
├── package-lock.json
├── README.md
└── vite.config.js
```

## Getting Started / Prerequisites

Before running the app locally, make sure you have the following installed:

- Node.js 18+ or a compatible LTS version
- npm
- A Netlify account or local Netlify CLI (optional but recommended)
- Access to a Supabase project with the required tables and policies

## Installation & Usage

1. Clone the repository:

```bash
git clone https://github.com/aliemhimed/labobo.git
cd labobo
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables. Copy `.env.example` to `.env` in the project root if you are running Netlify functions locally:

```env
SUPA_SERVICE_KEY=your-supabase-service-role-key
```

Notes:
- `SUPA_SERVICE_KEY` is required for the Netlify functions to write sessions, reports, and leaderboard entries. Without it those writes return a 500 and the function log says `SUPA_SERVICE_KEY is not set`.
- Writes are rate-limited per user (reports 20/hour, quiz results 120/hour, leaderboard submissions 20/hour) and return 429 past the limit.
- The public read endpoints use the publishable Supabase key exposed to the app and Netlify functions.

4. Run the app locally:

```bash
npm run dev
```

5. If you want to test Netlify Function routing locally, run:

```bash
npx netlify dev
```

This will load the app and local function endpoints according to the configuration in `netlify.toml`.

## Environment and Configuration

The project relies on Netlify and Supabase configuration for runtime data.

Key configuration points:

- `netlify.toml` defines redirect rules and the local Netlify build settings.
- `netlify/functions/*.js` contain the serverless API endpoints.
- Supabase tables used by the app include question banks, user profiles, session records, question reports, and leaderboard entries.
- `leaderboard_entries`, `sessions`, and `question_reports` have no policies for the publishable key; only the functions (using `SUPA_SERVICE_KEY`) can read or write them.

## API Endpoints

Routes are defined via Netlify functions and mapped under `/api/*`.

```text
GET  /api/questions?tables=bs_anatomy,bs_physiology   # public
GET  /api/leaderboard?subject=GCT                    # signed in
POST /api/leaderboard                                # signed in
POST /api/supa-insert                                # signed in (sessions, question_reports)
```

Signed-in endpoints take the Supabase access token as `Authorization: Bearer <token>` and derive the user from it server-side; any user id in the request is ignored.

## Database backups

The Supabase project is on the Free plan, which has no restorable backups and pauses projects after a week without activity. `.github/workflows/db-backup.yml` runs nightly (and on demand from the Actions tab). It:

- pings the Supabase API so the project stays awake, and
- saves `schema.sql.gz` (every table, constraint, policy and function in `public`, no rows) and `questions.sql.gz` (all rows of every question bank) as an artifact kept for 30 days.

This repository is public, so its workflow artifacts are too. The backup therefore **never includes user data** (profiles, quiz sessions, leaderboard entries, question reports): question-bank tables are picked as "tables with an `answer` column", so a user-data table can't be included by accident.

**One-time setup:** in the Supabase dashboard open **Connect → Session pooler** and copy the connection URI with your database password filled in (the direct connection won't work from GitHub, which has no IPv6; reset the password under Database settings if you don't have it). Add it on GitHub under **Settings → Secrets and variables → Actions** as `SUPABASE_DB_URL`, then run the workflow once from the Actions tab.

**Restoring** (into a new Supabase project, or the same one if the tables are gone): download the artifact from the workflow run, unzip it, `gunzip` both files, then:

```bash
psql "$SUPABASE_DB_URL" -f schema.sql
psql "$SUPABASE_DB_URL" -f questions.sql
```

The schema dump covers `public` only, so in a new project also re-create the sign-up trigger (`on_auth_user_created` on `auth.users`) from `supabase/migrations/20260922020000_auth_profiles_semester2.sql`.

## Contributing

Contributions are welcome.

Recommended workflow:

```bash
git checkout -b feature/your-change
git add .
git commit -m "Add your feature"
git push origin feature/your-change
```

Then open a pull request with a clear summary of the change, testing notes, and screenshots when relevant.

## License

This project currently does not include a license file. If you plan to distribute or publish it, add an appropriate open-source license such as MIT or Apache-2.0 before release.

---

For local development, keep Supabase credentials and admin secrets in environment variables rather than hardcoding them into the repository or frontend code.
