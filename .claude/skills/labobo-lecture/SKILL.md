---
name: labobo-lecture
description: Turn a lecture into Labobo content - multiple-choice questions inserted into Supabase, a study guide for the same lecture, and Nano Banana picture prompts. Use whenever the user gives a lecture (slides, PDF, or a lecture name) and asks for questions, a guide, or "do this lecture" for Labobo.
---

# Labobo lecture: questions, study guide and pictures

Labobo is a medical MCQ study site for first- and second-year medical students at European University, Tbilisi. For every lecture the user hands over, produce all three things in the same session, without being asked for each:

1. questions, inserted into the live Supabase question bank;
2. a study guide for the same lecture, published to Supabase;
3. Nano Banana prompts for the pictures the guide needs.

## What the user sends

Something like: **"Lecture 4, Glycolysis, table gct2_biochemistry, 20 questions"**, plus the lecture file or its name.

- No question count given: write 30.
- No table given: work it out from the lecture and the tables below; ask only if it is unclear.
- Topic label: look at the `topic` values already in that table and follow the same pattern exactly (for example `Biochem Wk 1: Water, pH & Buffers`, `Histo Lec 2: Microscopy`). If the user gives a label, use theirs. The guide and the questions must use the identical label.

Valid tables are the ones in `ALLOWED_TABLES` in `netlify/functions/questions.js`. A table that does not exist yet needs its own migration with a grant, the timed-lock policy and `free_topics` rows: stop and tell the user.

## Sources

Course materials are under `C:\Users\AliEm\Documents\eu\Sem 1\` (also `Sem 2`, `Sem 4`): per subject, a `PPTs` folder with the lecture decks, the syllabus at the subject root, `books` with the textbooks and `pastpapers`.

**Start from the course index when the subject has one** (built so far: GCT II, at `Documents\eu\Sem 2\GCT2\_index\`, and all of Semester 4, GCT IV and Body Systems IV, at `Documents\eu\Sem 4\_index\`; read its `README.md`). The Semester 4 index has its own scripts: `sources/sem4-weeks.cjs` + `node sources/build-map.cjs` instead of `gct2-weeks.cjs`, and some deck PDFs need `sources/degly.cjs` because their fonts are embedded by glyph id. Its `syllabus-map.md` gives, per week, the deck as slide-numbered text (`lectures/`), the topic label, the syllabus topics, and an excerpt file with exactly the syllabus book pages (`excerpts/`); `exam-profile.md` says how the exams are written and how hard to pitch the questions; `books/` holds whole textbooks as page-marked text for gap filling. A week's **Notes** line overrides the steps below (for example "BOOK ONLY": write from the excerpt and ignore the deck). A new deck: extract it with the same slide-text format and add the week to `sources/gct2-weeks.cjs`, then run `node sources/build-index.cjs` there. Pictures that carry content in a deck are only in the .pptx: unzip `ppt/media` and look at them.

### Saving tokens: text first, a Sonnet reader, then write

Raw decks and books are the most expensive thing in a Labobo session. Do the reading cheaply:

1. **Text, never page images.** If the subject has a course index, its `lectures/` file is the deck text. Otherwise run
   `node .claude/skills/labobo-lecture/deck-to-text.cjs "<deck or folder>"`
   which writes `_text/<name>.md` next to the deck (slide-numbered, with picture file names and speaker notes) and skips decks already done. It warns when a deck's text is scrambled (run `degly.cjs`) or when most slides are pictures only (the content is in the pictures, so they must be looked at).
2. **Send the reading to the `lecture-reader` agent** (`.claude/agents/lecture-reader.md`, runs on Sonnet). Give it the lecture name, the deck text path, the syllabus file, the book excerpt or book file with the pages to check, the past papers, and the pictures worth looking at. It returns a slide-numbered fact sheet with the syllabus entry, gaps, slide/book conflicts and past-paper hits. Steps 1 to 4 below are its job; check its **Gaps** and **Conflicts** sections yourself.
3. **Write Parts A and B from the fact sheet.** Open the deck text or a picture yourself only to check a doubtful fact, a conflict, or a picture for the guide. Do not re-read the whole deck.
4. **Mechanical steps** (checking the existing topic labels and questions, the insert, the row count, `build.cjs`, `npm run guides`) need no judgement. When the questions are already in the data script, they can be handed to a Sonnet `general-purpose` agent (`model: sonnet`) with the exact commands.

Small decks (under about 15 teaching slides of text) are cheaper to read directly than to send to the agent.

### Source steps (done by the reader)

1. **Syllabus first.** Find this lecture's entry (by number or title): the topics it should cover and the book or chapters it names. No entry: say so in the checks and carry on.
2. **Read the whole lecture.** Note which syllabus topics it covers well and which are missing or thin.
3. **Fill gaps from the named book only.** If the book the syllabus names is in `books`, read the relevant section. If it is not there, do not substitute another book; work from the lecture.
4. **Past papers**, when the subject has them: note which facts have been examined and how the questions were worded.

## Part A: the questions

**Content**
- Every question is answerable from the lecture or, for the gaps in step 3, from the named book, and stays inside this lecture's syllabus topics.
- Cover almost every teaching slide, spread in proportion to how much of the lecture each section takes.
- If the lecture and the book disagree, follow the lecture and mention the disagreement in the explanation. If a slide is clearly wrong, tell the user.
- Too little material for the number asked: write fewer and say so. No padding.
- Level: about half recall, about a third understanding, the rest application. Overall about 70% knowledge and 30% clinical questions.
- Before writing, read the questions already in that table for this topic and nearby ones. Do not repeat or lightly reword them.

**Format**
- Exactly 4 options, exactly one best answer.
- No "all of the above", "none of the above" or "both A and B".
- Options are the same kind of thing and similar in length; the correct one must not stand out.
- Wrong options are believable: common confusions, related structures, the right idea in the wrong place.
- Never write "according to this lecture", "in the slides" or similar. The stem makes sense without the options.
- No questions that depend on a picture unless the user asks for them.
- Decide the answer positions first so they are spread evenly across 0 to 3 with no pattern and no long runs.

**Explanations**: 1 to 3 sentences on why the answer is right and why the tempting wrong option is wrong. Proper notation (Ca²⁺, H⁺, →).

**Show the user before inserting**
- A numbered review list: question, options A) to D), then `✅ C` and the explanation, with the slide or page each question came from.
- Checks, one line each: syllabus entry found and its topics; gaps and book use (which question numbers); answer spread A/B/C/D; coverage by lecture section; knowledge/clinical split; anything to double-check.

**Insert** once the user says go, with the Supabase tools into the live project `boukmowybmtfqkinuvqj`, in this form:

```sql
insert into TABLE_NAME (ord, topic, q, options, answer, explanation)
select
  (select coalesce(max(ord), 0) from TABLE_NAME) + v.n,
  v.topic, v.q, v.options::jsonb, v.answer, v.explanation
from (values
  (1, 'Biochem Lec 4: Glycolysis', 'Question text?', '["Option A", "Option B", "Option C", "Option D"]', 2, 'Explanation.')
) as v(n, topic, q, options, answer, explanation);
```

Leave out `id`: the GCT II tables (and others) generate it themselves and reject a value. `answer` is the 0-based position and must match the ✅ letter. Double every apostrophe in text values. `n` runs 1, 2, 3 with no gaps. Afterwards, count the rows for the topic to confirm.

A new lecture is locked (pass only) unless its topic is in `free_topics`. Do not add it there unless the user asks.

## Part B: the study guide

- Write it while the lecture is fresh, from the same sources. Content and structure follow `study-guides/PROMPT.md` sections 1 to 3 (every teaching slide covered, no invented numbers, "Watch out" boxes for slide/book disagreements, 8 to 12 check-yourself questions that are different from the bank questions, a slide map).
- For the markup, copy an existing guide in `study-guides/gct/` as the model, not PROMPT.md section 4: guides in the repo have **no `<style>` element** (the site loads `study-guides/lb-guide.css`) and use the same `lb-` component classes.
- The root is `<article class="lb-guide" ...>` with `data-part` (the part's name as the site shows it), `data-lectures` and `data-topic` set to the exact question topic label (two lectures: join with `; `).
- Save it as `study-guides/<subject>/<part>/<wkNN or lecNN>-<short-name>.html`, where `<subject>` is the site's subject key (`gct`, `gct-2`, ... as in `src/lib/subjects.js`). For a book-only lecture, the slide map lists book pages (`data-pages`) instead of slides.
- Keep the questions as a small data script next to the course's other Labobo question files (example: `Sem 2\GCT2\Bio chem\Labobo questions\lec07-hemostasis.cjs`): running it checks the options and writes both the review list and the SQL, so the letters and the `answer` numbers cannot drift apart. Check that the correct answer is not usually the longest option.
- Every section carries its slide numbers in the slide map. No long passages copied word for word from a textbook.

**Publish**
1. `node study-guides/build.cjs` checks the guide; fix anything it reports.
2. Make sure the guide is covered by `PUBLISH` in `study-guides/publish.cjs` (the subject, its `include` rule and its `tables` map). Widen it if not.
3. `npm run guides` publishes text and pictures to the live Supabase project. No Netlify deploy is needed. It needs `PROD_SUPA_SERVICE_KEY` in `.env`; never print that file.
4. Check `https://studywithlabobo.online/api/guide?catalog=1` lists the new guide.

Publish the guide only when its pictures are in place, or leave the picture out of the guide for now. `publish.cjs` stops if a guide points at a picture that is not on disk.

## Part C: pictures

- Ask for a picture only where it teaches something text or a table cannot. Prefer a good slide picture when one exists.
- For each one, give the user a Nano Banana prompt in the format used in `study-guides/image-prompts.md` (aspect ratio, what to draw, every label spelled out, what not to show) and a **Save as** name like `bio-wk08-glycolysis.jpg`. The user generates them and puts them in `study-guides/img/incoming/`.
- When the pictures come back, look at each one. Reject any with wrong anatomy, a wrong or misspelled label, or an arrow pointing the wrong way, and give a correction prompt. AI medical pictures are the highest-risk part of the content.
- Move the accepted ones to `study-guides/img/drawn/`, reference them in the guide as `/guides/img/drawn/<name>.jpg` inside `<figure class="lb-figure">` with `width`, `height`, `loading="lazy"`, `decoding="async"` and a full-sentence `alt`, then publish.
- A picture that is replaced later gets a new file name: browsers keep the old one for a week.

## Before finishing

- Re-read every question: the ✅ answer is correct, no other option is defensible, the inserted `answer` matches.
- Tell the user what was inserted (table, topic, count), whether the guide is live, and which pictures are still waiting.
- Do not commit or push unless the user asks. The guide `.html` files are worth committing in a batch later; publishing does not depend on it.
