# Graph Report - labobo  (2026-09-30)

## Corpus Check
- 102 files · ~540,493 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 527 nodes · 1118 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df5c5583`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `dbHeaders()` - 17 edges
2. `useAuth()` - 16 edges
3. `authHeader()` - 15 edges
4. `request()` - 13 edges
5. `json()` - 12 edges
6. `fail()` - 12 edges
7. `ago()` - 12 edges
8. `useProfile()` - 12 edges
9. `Labobo` - 12 edges
10. `rest()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `countTable()` --calls--> `anonHeaders()`  [EXTRACTED]
  netlify/functions/questions.js → netlify/functions/_lib/common.js
- `record()` --calls--> `dbHeaders()`  [EXTRACTED]
  netlify/functions/visit.js → netlify/functions/_lib/common.js
- `AuthGate()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/AuthGate.jsx → src/lib/auth.jsx
- `SemesterGate()` --calls--> `useProfile()`  [EXTRACTED]
  src/components/AuthGate.jsx → src/hooks/useProfile.js
- `AnnouncementsTab()` --calls--> `useConfirm()`  [EXTRACTED]
  src/components/admin/AnnouncementsTab.jsx → src/components/Confirm.jsx

## Import Cycles
- None detected.

## Communities (25 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (70): announcementsView(), authUsers(), BANK_TABLES, bankRows(), BANKS, count(), createAnnouncement(), csv() (+62 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (32): ChevronLeft(), useHistory(), useWrong(), useTopicKeys(), recordAnswers(), subscribe(), buildQuizQuestions(), distribute() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (36): ThemeToggle(), cache, clearProgress(), dropNumericKeys(), errorListeners, getLeaderboardPrefs(), getSubjectSummary(), getTheme() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (52): AnnouncementsTab(), AUDIENCE, Composer(), KEY, TONES, ago(), DayBars(), HBars() (+44 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (11): base, Check(), ChevronRight(), Cross(), Flag(), useEqualOptionHeights(), useQuizShortcuts(), LETTERS (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): BoardDialog(), REASONS, ReportModal(), useToast(), fetchBoard(), fmtCountdown(), request(), submitScore() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (28): isEmptyProgress(), maxDate(), mergeFlashcards(), mergeHistory(), mergeProgress(), mergeWrong(), sameProgress(), stable() (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource-variable/bricolage-grotesque, @fontsource-variable/figtree, react, react-dom, react-router-dom, @supabase/auth-js, @supabase/postgrest-js (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (16): ToastContext, ToastProvider(), NO_QUESTIONS, questionsQuery(), useQuestions(), buildSubjectIndex(), fetchTableCounts(), loadQuestions() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): getStorageVersion(), dayIndex(), readStudyLog(), ALL_QUESTION_TABLES, BS_TOPIC_MAP, SUBJECTS, ALL_SUBJECTS, bubbleText() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (6): AuthGate(), SemesterGate(), recordVisit(), AdminPage, LEGACY, SubjectPage

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (9): useLeaderboard(), ProfileMenu(), SEMESTER_LABEL, useProfile(), useSetSemester(), useAuth(), SelectSemesterPage(), SEMESTERS (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (9): InstallPrompt(), useInstallMode(), installMode(), isIos(), isStandalone(), listeners, notify(), promptInstall() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): AuthContext, AuthProvider(), redirectTo(), signInWithGoogle(), signInWithPassword(), signOut(), signUpWithPassword(), flushProgress() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): Admin dashboard, API Endpoints, Contributing, Database backups, Environment and Configuration, Getting Started / Prerequisites, Installation & Usage, Key Features (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (9): pick(), preloaded, preloadOne(), useMeme(), MEME_CONFIG, RIGHT_CAPTIONS, RIGHT_MEMES, WRONG_CAPTIONS (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (7): convert(), kb(), One-off asset optimiser (Pillow). Run from the repo root:      python scripts/, src -> dest as WebP (animated stays animated). Returns (before, after) KB., report(), save_static(), theme_asset()

### Community 17 - "Community 17"
Cohesion: 0.60
Nodes (4): containsProfanity(), normalize(), patterns, validateHandle()

## Knowledge Gaps
- **102 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 11` to `Community 1`, `Community 3`, `Community 5`, `Community 9`, `Community 10`, `Community 13`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `authHeader()` connect `Community 3` to `Community 1`, `Community 10`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `useProfile()` connect `Community 11` to `Community 9`, `Community 10`, `Community 5`, `Community 1`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05056179775280899 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08200290275761973 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07342995169082125 - nodes in this community are weakly interconnected._