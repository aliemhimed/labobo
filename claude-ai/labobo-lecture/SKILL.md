---
name: "labobo-lecture"
description: "Turn a lecture into Labobo content: MCQs inserted into Supabase, a study guide, and Nano Banana picture prompts. Use when Ali gives a lecture and asks for Labobo questions, a guide, or \"do this lecture\"."
---

# Labobo lecture: questions, study guide and pictures

Labobo (studywithlabobo.online) is a medical MCQ study site for first- and second-year medical students at European University, Tbilisi. For every lecture the user hands over, produce all three things in the same session, without being asked for each:

1. questions, inserted into the live Supabase question bank;
2. a study guide for the same lecture, ready to publish;
3. Nano Banana prompts for the pictures the guide needs.

This skill works both in Claude Code inside the repo and in a claude.ai chat. The "Setup" section says how to get the repo, the sources and the database in each case.

## Setup

**Repo** (`aliemhimed/labobo`)
- Claude Code inside the repo: use the working copy.
- claude.ai: attach it with `add_repo` (owner `aliemhimed`, repo `labobo`, read access), then `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/aliemhimed/labobo.git`. Ask for push access only if the user asks for a push.

**Database**: the Supabase connector, live project `boukmowybmtfqkinuvqj` (`execute_sql`). Works the same in both places.

**Course materials** live on the user's computer under `C:\Users\AliEm\Documents\eu\Sem 1\` (also `Sem 2`, `Sem 4`): per subject, a `PPTs` folder with the lecture decks, the syllabus at the subject root, `books` with the textbooks and `pastpapers`.
- Claude Code on that computer: read them directly.
- claude.ai: use the files attached in the chat first. If something else is needed (syllabus, book, course index), use the remote-devices tools: `get_device_info` / `device_list_dir` to find it, `device_stage_files` to bring it into the workspace, or `device_bash` if present. If the computer isn't connected, ask the user to attach the syllabus entry and book pages, or to open the chat in the desktop app and add the `eu` folder.

## What the user sends

Something like: **"Lecture 4, Glycolysis, table gct2_biochemistry, 20 questions"**, plus the lecture file or its name.

- No question count given: write 30.
- No table given: work it out from the lecture and the tables below; ask only if it is unclear.
- Topic label: look at the `topic` values already in that table and follow the same pattern exactly (for example `Biochem Wk 1: Water, pH & Buffers`, `Histo Lec 2: Microscopy`). If the user gives a label, use theirs. The guide and the questions must use the identical label.

Valid tables are the ones in `ALLOWED_TABLES` in `netlify/functions/questions.js`. A table that does not exist yet needs its own migration with a grant, the timed-lock policy and `free_topics` rows: stop and tell the user.

## Sources

### Saving tokens

Raw decks and whole books are the most expensive thing in a Labobo session. Read as little raw material as possible:

- **Text, never page images.** Use the course index's `lectures/` file when there is one. Otherwise turn the deck into slide-numbered text first: in Claude Code run `node .claude/skills/labobo-lecture/deck-to-text.cjs "<deck>"` (it writes `_text/<name>.md` next to the deck); in claude.ai run the same script from the cloned repo on an attached deck, or through `device_bash` on the user's computer. Look at a slide picture only when the text says the slide is mostly pictures and its title suggests it teaches something.
- **Books: search, don't read.** `grep -n "term"` the page-marked book text, then read only the pages around the hits, or the syllabus excerpt file.
- **Claude Code only:** send the reading to the `lecture-reader` agent (Sonnet), which returns a slide-numbered fact sheet; write the questions and guide from that sheet and open the deck only to check a doubtful fact.
- **Database:** take table and column names from `supabase/SCHEMA.md` in the repo instead of listing tables. When checking existing questions, select only `topic, q` for the nearby topics, not whole rows.
- One lecture per chat. Start a new chat for the next lecture instead of carrying the old one's material along.

### Course index

**Start from the course index when the subject has one** (built so far: GCT II, at `Documents\eu\Sem 2\GCT2\_index\`, and all of Semester 4, GCT IV and Body Systems IV, at `Documents\eu\Sem 4\_index\`; read its `README.md`). Its `syllabus-map.md` gives, per week, the deck as slide-numbered text (`lectures/`), the topic label, the syllabus topics, and an excerpt file with exactly the syllabus book pages (`excerpts/`); `exam-profile.md` says how the exams are written and how hard to pitch the questions; `books/` holds whole textbooks as page-marked text for gap filling. A week's **Notes** line overrides the steps below (for example "BOOK ONLY": write from the excerpt and ignore the deck). A new deck: extract it with the same slide-text format and add the week to `sources/gct2-weeks.cjs`, then run `node sources/build-index.cjs` there. Pictures that carry content in a deck are only in the .pptx: unzip `ppt/media` and look at them.

1. **Syllabus first.** Find this lecture's entry (by number or title): the topics it should cover and the book or chapters it names. No entry: say so in the checks and carry on.
2. **Read the whole lecture.** Note which syllabus topics it covers well and which are missing or thin.
3. **Fill gaps from the named book only.** If the book the syllabus names is available, read the relevant section. If it is not, do not substitute another book; work from the lecture.
4. **Past papers**, when the subject has them: note which facts have been examined and how the questions were worded.

## Part A: the questions

**Content**
- Every question is answerable from the lecture or, for the gaps in step 3, from the named book, and stays inside this lecture's syllabus topics.
- Cover almost every teaching slide, spread in proportion to how much of the lecture each section takes.
- If the lecture and the book disagree, follow the lecture and mention the disagreement in the explanation. If a slide is clearly wrong, tell the user.
- Too little material for the number asked: write fewer and say so. No padding.
- Level: about half recall, about a third understanding, the rest application. Overall about 70% knowledge and 30% clinical questions.
- Before writing, read the questions already in that table for this topic and nearby ones (`execute_sql`). Do not repeat or lightly reword them.

**Format**
- Exactly 4 options, exactly one best answer.
- No "all of the above", "none of the above" or "both A and B".
- Options are the same kind of thing and similar in length; the correct one must not stand out, and must not usually be the longest.
- Wrong options are believable: common confusions, related structures, the right idea in the wrong place.
- Never write "according to this lecture", "in the slides" or similar. The stem makes sense without the options.
- No questions that depend on a picture unless the user asks for them.
- Decide the answer positions first so they are spread evenly across 0 to 3 with no pattern and no long runs.

**Explanations**: 1 to 3 sentences on why the answer is right and why the tempting wrong option is wrong. Proper notation (Ca²⁺, H⁺, →).

**Keep the questions as a small data script** (example: `Sem 2\GCT2\Bio chem\Labobo questions\lec07-hemostasis.cjs`): running it checks the options and writes both the review list and the SQL, so the letters and the `answer` numbers cannot drift apart. In claude.ai, build it in the workspace and also save it to that folder on the user's computer when the computer is connected.

**Show the user before inserting**
- A numbered review list: question, options A) to D), then `✅ C` and the explanation, with the slide or page each question came from. For 20+ questions, send it as a file or artifact rather than one huge message.
- Checks, one line each: syllabus entry found and its topics; gaps and book use (which question numbers); answer spread A/B/C/D; coverage by lecture section; knowledge/clinical split; anything to double-check.

**Insert** only once the user says go, with `execute_sql` on project `boukmowybmtfqkinuvqj`, in this form:

```sql
insert into TABLE_NAME (ord, topic, q, options, answer, explanation)
select
  (select coalesce(max(ord), 0) from TABLE_NAME) + v.n,
  v.topic, v.q, v.options::jsonb, v.answer, v.explanation
from (values
  (1, 'Biochem Lec 4: Glycolysis', 'Question text?', '["Option A", "Option B", "Option C", "Option D"]', 2, 'Explanation.')
) as v(n, topic, q, options, answer, explanation);
```

Leave out `id`: the GCT II tables (and others) generate it themselves and reject a value. `answer` is the 0-based position and must match the ✅ letter. Double every apostrophe in text values. `n` runs 1, 2, 3 with no gaps. Run each insert once only. Afterwards, count the rows for the topic to confirm.

A new lecture is locked (pass only) unless its topic is in `free_topics`. Do not add it there unless the user asks.

## Part B: the study guide

- Write it while the lecture is fresh, from the same sources. Content and structure follow `study-guides/PROMPT.md` sections 1 to 3 (every teaching slide covered, no invented numbers, "Watch out" boxes for slide/book disagreements, 8 to 12 check-yourself questions that are different from the bank questions, a slide map).
- For the markup, copy an existing guide in `study-guides/gct/` as the model, not PROMPT.md section 4: guides in the repo have **no `<style>` element** (the site loads `study-guides/lb-guide.css`) and use the same `lb-` component classes.
- The root is `<article class="lb-guide" ...>` with `data-part` (the part's name as the site shows it), `data-lectures` and `data-topic` set to the exact question topic label (two lectures: join with `; `).
- Save it as `study-guides/<subject>/<part>/<wkNN or lecNN>-<short-name>.html`, where `<subject>` is the site's subject key (`gct`, `gct-2`, ... as in `src/lib/subjects.js`). For a book-only lecture, the slide map lists book pages (`data-pages`) instead of slides.
- Every section carries its slide numbers in the slide map. No long passages copied word for word from a textbook.
- Run `node study-guides/build.cjs` and fix anything it reports (missing pictures that live in Supabase rather than the repo are expected in a fresh clone).
- Look at the guide at phone width (390 px) before handing it over: nothing spills off the side.

**Publish**
1. Make sure the guide is covered by `PUBLISH` in `study-guides/publish.cjs` (the subject, its `include` rule and its `tables` map). Widen it if not.
2. Publishing (`npm run guides` / `node study-guides/publish.cjs --prod`) needs `PROD_SUPA_SERVICE_KEY` from the `.env` on the user's computer. Never print that file and never ask the user to paste the key into chat.
   - Claude Code on that computer: run it.
   - claude.ai with `device_bash` on the computer: put the guide in the repo there and run it from that folder.
   - Otherwise: send the user the guide `.html` (SendUserFile) and, if they ask, push it to a branch; tell them to run `npm run guides` on their computer.
3. Check `https://studywithlabobo.online/api/guide?catalog=1` lists the new guide.

Publish the guide only when its pictures are in place, or leave the picture out of the guide for now. `publish.cjs` stops if a guide points at a picture that is not on disk.

## Part C: pictures

- Ask for a picture only where it teaches something text or a table cannot. Prefer a good slide picture when one exists.
- For each one, give the user a Nano Banana prompt in the format used in `study-guides/image-prompts.md` (aspect ratio, what to draw, every label spelled out, what not to show) and a **Save as** name like `bio-wk08-glycolysis.jpg`. The user generates them and either puts them in `study-guides/img/incoming/` or attaches them in the chat.
- When the pictures come back, look at each one. Reject any with wrong anatomy, a wrong or misspelled label, or an arrow pointing the wrong way, and give a correction prompt. AI medical pictures are the highest-risk part of the content.
- Move the accepted ones to `study-guides/img/drawn/`, reference them in the guide as `/guides/img/drawn/<name>.jpg` inside `<figure class="lb-figure">` with `width`, `height`, `loading="lazy"`, `decoding="async"` and a full-sentence `alt`, then publish.
- A picture that is replaced later gets a new file name: browsers keep the old one for a week.

## Before finishing

- Re-read every question: the ✅ answer is correct, no other option is defensible, the inserted `answer` matches.
- Tell the user what was inserted (table, topic, count), whether the guide is live, and which pictures are still waiting.
- Do not commit or push unless the user asks. The guide `.html` files are worth committing in a batch later; publishing does not depend on it.