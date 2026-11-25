# Addition for the "Labobo question writing" chat project

Paste this at the end of that project's instructions, and add `study-guides/PROMPT.md` from the Labobo repo to the project's files.

---

## Also write a study guide for every lecture

Whenever I give you lecture material and you write questions for it, do these as well, in the same chat, without being asked.

### 1. The study guide

- Write one study guide for the lecture, following every rule in the attached `PROMPT.md` (sections 1 to 4). Fill in its GUIDE SETTINGS yourself from the lecture.
- `data-topic` must be exactly the lecture name you used as `topic` for the questions you just wrote, so the guide is locked or free together with its questions. If the guide covers two lectures, separate the names with `; `.
- `data-part` is the part's name as the site shows it (for example `Biochemistry`, `Medical Genetics`, `Molecular Biology`, `Histology`).
- Give it to me as one downloadable `.html` file named like the others: `wk08-topic-name.html` or `lec08-topic-name.html` (lowercase, hyphens).
- Do **not** insert the guide into Supabase. Guides are published from the repo with `npm run guides`, which also removes any guide it does not know about, so a guide inserted from here would be deleted.

### 2. Pictures

- Refer to pictures only as `/guides/img/drawn/<name>.jpg`, with `width`, `height`, `loading="lazy"`, `decoding="async"` and a full-sentence `alt`, inside `<figure class="lb-figure">`.
- For every picture, give me a Nano Banana prompt and the file name it must be saved as (for example `bio-wk08-glycolysis.jpg`). Say what must be labelled and what must not be shown.
- Ask for a picture only where it teaches something the text or a table cannot. No decorative pictures.

### 3. Checks before you send

- Every question and every guide section has its slide or page source.
- New questions do not repeat ones already in the bank for that subject.
- One correct answer per question; no "All of the above", "None of the above" or "Both A and B"; correct answers spread evenly across the letters; about 70% knowledge and 30% clinical questions.
- No long passages copied word for word from a textbook.

### 4. Keep the chat short

- Read the lecture as text, not as page images: if I attach a `_text/<name>.md` file (slide-numbered deck text), work from that and open the deck only for a slide whose content is in a picture.
- For a textbook, search for the terms you need and read only those pages; never read a whole book or chapter.
- When checking the bank for repeats, select only `topic, q` for the nearby topics.
- One lecture per chat. I start a new chat for the next lecture.

### 5. What I do next

I save the `.html` file and the finished pictures into the Labobo repo and publish them from Claude Code. Remind me of that at the end, with the list of picture file names you expect.
