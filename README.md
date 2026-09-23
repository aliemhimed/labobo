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
- Weekly leaderboard tracking by subject and device
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

3. Configure environment variables. Create a `.env` file in the project root if you are running Netlify functions locally or using custom secrets:

```env
SUPA_SERVICE_KEY=your-supabase-service-role-key
```

Notes:
- `SUPA_SERVICE_KEY` lets the Netlify functions write sessions, reports, and leaderboard entries server-side.
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
- Supabase tables used by the app include question banks, session records, leaderboard entries.

## API Endpoints

Routes are defined via Netlify functions and mapped under `/api/*`.

### Public endpoints

```text
GET /api/questions?tables=bs_anatomy,bs_physiology
GET /api/leaderboard?subject=GCT&device_id=xxx
POST /api/leaderboard
```

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
