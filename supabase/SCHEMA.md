# Live database schema (Supabase `boukmowybmtfqkinuvqj`, `public`)

Snapshot taken 2026-11-24 from the live database; client_errors, push_subscriptions, option_notes and the Labobo Live tables added 2026-11-26. Read this instead of calling `list_tables`. To refresh it, run `supabase/schema-snapshot.sql` with the Supabase `execute_sql` tool and replace everything below this header with the `md` value it returns. Refresh after every migration.

## Tables
Column notation: `name type`, `!` not null, `=default`. Tables with the same columns share a line.

### Question banks
- **gct2_biochemistry, gct2_genetics, gct2_histology, gct2_molecular_biology, gct3_biochemistry, gct3_biophysics, gct3_immunology, gct4_immunology, gct4_microbiology, gct_biochemistry, gct_genetics, gct_histology, gct_molecular_biology**: id bigint!, ord integer!, topic text, q text!, options jsonb!, answer integer!, explanation text='', image text='', images jsonb='[]', created_at timestamptz=now()
- **bs2_anatomy, bs2_imaging, bs2_physiology, bs4_anatomy, bs4_imaging, bs4_physiology, bs_anatomy, bs_imaging, bs_physiology, medicine_art**: same, but topic text!
- **history_of_medicine, medical_chemistry, medical_physics, scientific_reasoning**: same, but topic text!, ord integer (nullable)
- **clinical_skills, clinical_skills_2**: id bigint!, ord integer!, topic text!, display_topic text!, q text!, options jsonb!, answer integer!, explanation text='', image text='', images jsonb='[]', created_at timestamptz=now()

- **All question banks** also have option_notes jsonb!='{}' (added 2026-11-26): why each wrong option is wrong, { "<option index>": "note" }. Filled for GCT I and Body Systems I lectures 8+ (scripts/option-notes.cjs).

### App tables
- **admin_log**: id bigint!, at timestamptz!=now(), admin_email text!, action text!, target text, details jsonb!='{}'
- **announcements**: id bigint!, message text!, tone text!='info', semester text, starts_at timestamptz!=now(), ends_at timestamptz, created_at timestamptz!=now(), created_by text
- **client_errors**: id bigint!, at timestamptz!=now(), user_id text, kind text!='error', message text!, stack text, url text, user_agent text, release text, fingerprint text! — browser crash reports (netlify/functions/client-error.js, admin Errors tab)
- **daily_sets**: user_id uuid!, subject text!, mode text!, day date!, scope text!, question_ids text[]!, created_at timestamptz!=now()
- **daily_visits**: user_id text!, day date!, hits integer!=1, first_seen timestamptz!=now(), last_seen timestamptz!=now()
- **free_topics**: tb text!, topic text!
- **leaderboard_entries**: id bigint!, device_id text!, handle text!, subject text!, score_pct numeric!, total_questions integer!, week_start date!, completed_at timestamptz=now(), time_seconds integer
- **payment_accounts**: id bigint!, bank text!, holder text!, iban text!, position integer!=0, active boolean!=true
- **payment_requests**: id bigint!, user_id uuid!, reference text!, receipt_path text!, status text!='pending', created_at timestamptz!=now(), decided_at timestamptz, decided_by text, note text
- **push_subscriptions**: endpoint text! (pk), user_id uuid!, p256dh text, auth text, remind_hour smallint!=19, tz text!='Asia/Tbilisi', created_at timestamptz!=now(), last_sent date, failures smallint!=0 — daily study reminder (push.js, push-reminders.js)
- **profiles**: id uuid!, username text, email text, semester text, created_at timestamptz!=now(), updated_at timestamptz!=now()
- **question_reports**: id bigint!, question_text text, subject text, topic text, reason text, note text, device_id text, reported_at timestamptz=now(), created_at timestamptz=now(), question_id text, resolved_at timestamptz, resolved_by text
- **question_stats**: question_id text!, attempts integer!=0, picks jsonb!='{}', last_at timestamptz!=now()
- **rate_limit_hits**: user_id text!, action text!, created_at timestamptz!=now(), id bigint!
- **reviews**: id bigint!, user_id text!, name text!, rating smallint!, body text!, status text!='pending', created_at timestamptz!=now(), updated_at timestamptz!=now(), decided_at timestamptz, decided_by text, anonymous boolean!=false
- **sessions**: id uuid!=gen_random_uuid(), device_id text!, subject text, mode text, score integer, total integer, completed_at timestamptz, pct numeric, handle text, created_at timestamptz=now()
- **study_activity**: user_id text!, day date!, bank text!, topic text!, mode text!, answered integer!=0, correct integer!=0, first_at timestamptz!=now(), last_at timestamptz!=now()
- **study_guide_sets**: subject text!, scope text!, note text!, parts text[]!, updated_at timestamptz!=now()
- **study_guides**: subject text!, path text!, ord integer!, part text!, folder text!, slug text!, lecture integer, label text!, title text!, lede text!='', topics text[]!='{}', tb text, minutes integer!=5, videos integer!=0, pictures integer!=0, quiz integer!=0, html text!, updated_at timestamptz!=now()
- **study_seen**: user_id text!, question_id text!, first_at timestamptz!=now()
- **subscriptions**: user_id uuid!, expires_at timestamptz!, granted_at timestamptz!=now(), granted_by text, note text
- **trials**: email text!, user_id uuid!, started_at timestamptz!=now(), expires_at timestamptz!
- **university_emails**: user_id uuid!, email text!, verified_at timestamptz, code_hash text, code_expires_at timestamptz, attempts integer!=0, sent_at timestamptz
- **user_devices**: user_id uuid!, slot text!, device_id text!, label text, first_seen timestamptz!=now(), last_seen timestamptz!=now(), switched_at timestamptz, net_hash text, split_hits integer!=0, last_split_at timestamptz
- **user_progress**: user_id text!, prefix text!, data jsonb!='{}', version integer!=1, updated_at timestamptz!=now()

### Labobo Live (20261127000000_labobo_live.sql, added 2026-11-26)
- **teachers**: user_id uuid! (pk, auth.users), email text, granted_by text, granted_at timestamptz!=now() — granted in the admin Teachers tab
- **custom_questions**: id uuid!, owner uuid!, q text!, options jsonb! (2-6), answer integer!, explanation text!='', review_status text!='private' (private|pending|approved|rejected), created_at, updated_at
- **live_quizzes**: id uuid!, owner uuid!, title text!, subject text!='', settings jsonb!='{}', created_at, updated_at
- **live_quiz_items**: quiz_id uuid!, position integer!, source_table text, source_id bigint, custom_id uuid — either a bank ref or a custom question
- **live_rooms**: id uuid!, code text! (6 digits, unique among rooms not finished), host uuid!, quiz_id uuid, title text!, settings jsonb!, stage text!='lobby' (lobby|question|reveal|leaderboard|finished), current_q integer!=-1, total_q integer!, q_started_at, deadline, paused boolean!, paused_left_ms integer, locked boolean!, created_at, last_activity_at, finished_at
- **live_room_questions**: room_id uuid!, position integer!, q text!, options jsonb! (shuffled), answer integer!, explanation text!, image text!, source_table text, source_id bigint, custom_id uuid
- **live_players**: room_id uuid!, user_id uuid!, display_name text!, email text!, nickname text!, score integer!, correct integer!, total_ms bigint!, away_count integer!, kicked boolean!, joined_at, last_seen_at
- **live_answers**: room_id uuid!, position integer!, user_id uuid!, choice integer!, received_at timestamptz!, ms integer!, correct boolean!, points integer! (pk room_id, position, user_id: first answer wins)

### Backup and scratch tables (from one-off fixes; not used by the app)
bracket_fix_backup, semester4_length_fix_backup, gct4_immunology_options_backup_20261110, gct4_microbiology_options_backup_20261110, bs2_physiology_removed_20261110, qbank_fix_backup_20261111, semester1_quality_fix_backup, zz_done, zz_edits, zz_skip

## Row-level security policies
- **Every question bank except clinical_skills / clinical_skills_2** (all 27 tables above): `<table>_public_read` [SELECT to public] using `now() < '2026-11-14 19:59:00+00' OR EXISTS (select 1 from free_topics f where f.tb = '<table>' and f.topic = <table>.topic)` — the timed lock: free for everyone before the lock time, afterwards only topics listed in `free_topics` (paid access goes through the Netlify functions with the service key).
- **clinical_skills, clinical_skills_2**: same, but matching `free_topics.topic` against `coalesce(nullif(display_topic, ''), topic)`.
- **free_topics**: `free_topics_public_read` [SELECT to public] using true
- **profiles**: `profiles_select_own` [SELECT] and `profiles_update_own` [UPDATE] using `auth.uid() = id`
- **realtime.messages**: `live_listen` [SELECT to authenticated] using extension = broadcast and live_can_listen(realtime.topic()) — Labobo Live private channels live:<room> (host + players) and live-host:<room> (host only); no INSERT policy, so clients cannot send
- All other tables (Live tables included): RLS on, no policies — reached only by the Netlify functions with the service key.

## Grants to anon / authenticated
- Every question bank and `free_topics`: anon SELECT, authenticated SELECT
- `profiles`: authenticated SELECT
- Everything else: no grants

## Functions (public)
- admin_overview(p_tz text) SECDEF
- admin_study_overview(p_tz text) SECDEF
- admin_user_stats(p_user text, p_tz text) SECDEF
- admin_user_study(p_user text, p_tz text) SECDEF
- admin_users() SECDEF
- check_rate_limit(p_user text, p_action text, p_max integer, p_window_seconds integer)
- handle_new_user() SECDEF
- jsonb_add_counts(a jsonb, b jsonb)
- record_answers(p_items jsonb)
- record_study(p_user text, p_tz text, p_mode text, p_items jsonb)
- record_visit(p_user text)
- record_visit(p_user text, p_tz text)
- touch_profile_updated_at()
- zz_apply(p_tb text, p_e jsonb)
- live_* (Labobo Live; SECDEF, service_role only except live_can_listen(text) for authenticated): live_create_room, live_join, live_next, live_answer, live_close, live_show_board, live_finish, live_pause, live_moderate, live_away, live_state, live_results, live_history, live_hosted, live_can_listen, live_emit and helpers (live_shown_name, live_active_count, live_ranking, live_public_board, live_counts, live_open_question)
