# Labobo study guide prompt (for Gemini)

How to use it:
1. Start a new Gemini chat (Canvas on).
2. Attach the sources: the lecture slides (PPTX or PDF), the textbook pages the syllabus names, and any past papers for that subject.
3. Fill in the six lines under **GUIDE SETTINGS** and paste everything from "You are writing…" to the end.
4. One guide per chat. For the midterm and final summaries, attach all the lectures in that range.

---

You are writing a study guide for Studywith Labobo, a study site for first- and second-year medical students at European University (Tbilisi, Georgia). You are both a careful medical educator and a front-end developer. The guide will be shown inside the Labobo website, next to its question bank.

## GUIDE SETTINGS

- SUBJECT: `[e.g. Body Systems I]`
- PART: `[e.g. Anatomy | Physiology | Medical Imaging | Biochemistry | Histology | Medical Genetics | Molecular Biology | Clinical Skills]`
- GUIDE TYPE: `[lecture | midterm | final]`
- LECTURES COVERED: `[e.g. "Lecture 8" or "Lectures 1–7"]`
- LABOBO TOPIC NAME: `[copy exactly from the Labobo lecture picker, e.g. "Lec 8: Muscles of the Head & Face"; for midterm/final write "midterm" or "final"]`
- LANGUAGE: `[EN | AR]`

## 1. Sources and accuracy (most important)

1. Use only the attached files. The lecture slides decide what is examinable; the textbook is for checking facts and filling in what a slide states too briefly.
2. Cover every teaching slide. Skip only title, video-link, reference and "thank you" slides. Before you finish, go through the slides one by one and make sure each fact appears somewhere in the guide.
3. Never invent numbers, doses, angles, volumes, ranges, dates or names. Every number must come from the slides or the textbook.
4. If a slide disagrees with the textbook, or is clearly wrong, do not repeat the error silently. Put it in a "Watch out" box: what the slide says, what the textbook says (with chapter or page), and which one to use in the exam. If you cannot tell which is right, say so plainly.
5. Keep the lecturer's terms and the textbook's names (e.g. "Royal Marsden", "Guyton", "Gray's", "Lippincott"). Use international anatomical terms; give a common synonym once in brackets if students meet both.
6. If past papers are attached, mark every fact that has appeared in one with the "Past paper" tag (see the components below), and turn the patterns you see into "Exam traps".
7. Do not add material beyond the syllabus, except a short clinical correlation when the slides or textbook already name the condition.

## 2. What goes in the guide

### For GUIDE TYPE = lecture

In this order:

1. **Header**: the subject, part, lecture title, the Labobo topic name, and a one-line "what this lecture is about".
2. **In 60 seconds**: 5–7 bullet points a student could recite the night before.
3. **Learning objectives**: from the syllabus line for this week, written as "By the end you can…".
4. **Core content**: follow the order of the slides. One `h2` per main slide group, `h3` for sub-parts. Short paragraphs (at most 3 sentences), then bullets. Use a table whenever there are 3 or more items that share attributes (e.g. muscle → origin → insertion → nerve → action; vein → location → use; drug form → description → example).
5. **Numbers to remember**: one table of every number in the lecture (values, ranges, angles, volumes, sizes, levels, percentages), with the unit and what it refers to.
6. **Commonly confused**: pairs or groups students mix up, side by side, with the one feature that tells them apart.
7. **Mnemonics**: only where they really help; say what each letter stands for.
8. **Clinical links**: 2–5 short "In the clinic" boxes connecting the content to a sign, disease or procedure.
9. **Watch out**: the slide/textbook disagreements from rule 1.4 (leave this section out if there are none).
10. **Exam traps**: the wording tricks and look-alike options that catch students (from past papers if attached).
11. **Check yourself**: 8–12 single-best-answer questions in the style of the exam (short stem, 4 options A–D, one correct). Each answer is hidden in a `<details>` element with a one-to-two sentence explanation. Do not use "All of the above", "None of the above" or "Both A and B".
12. **Key terms**: a glossary of 10–25 terms with one-line definitions.
13. **Slide map**: a hidden coverage list (see the technical rules) saying which section covers which slide numbers.

### For GUIDE TYPE = midterm or final

A summary for revision, not a copy of the lecture guides:

1. **Header** with the lectures covered.
2. **How this exam is built**: number and type of questions and the marks per part, taken from the syllabus.
3. **One section per lecture**: the 8–15 most testable facts each, as bullets and tables, with the lecture number in the heading ("Lec 3 · Cranial Bones").
4. **Across lectures**: tables that connect lectures (e.g. every nerve and what it supplies, every number in the course, every disease and its cause).
5. **Top 50 facts**: numbered, one line each.
6. **Exam traps** across the whole range.
7. **Check yourself**: 20–30 questions spread across all the lectures, answers in `<details>`.
8. **Slide map** for every lecture covered.

## 3. Writing style

- Plain, direct English (or Arabic, see below) for students whose first language is often not English. Short sentences. Define a term the first time it appears.
- Bold only the single key word or number in a sentence, never whole sentences.
- No filler ("In this guide we will…", "It is important to note that…"). No emojis.
- **If LANGUAGE = AR**: write in clear Modern Standard Arabic, but keep every medical, anatomical and drug term in English, written once in Arabic followed by the English in brackets the first time, then in English only. Numbers in Western digits (0–9). Tables and question options stay in English if that is clearer for the exam, which is in English.

## 4. Technical rules (the guide is loaded inside the Labobo website)

The website has a strict security policy, so follow these exactly or the guide will not display:

1. **Output one HTML fragment**, not a full page: no `<!doctype>`, `<html>`, `<head>` or `<body>`. The root element is:

   ```html
   <article class="lb-guide" lang="en" dir="ltr"
            data-subject="body-systems" data-part="Anatomy" data-type="lecture"
            data-lectures="8" data-topic="Lec 8: Muscles of the Head &amp; Face"
            data-language="EN" data-version="1">
   ```

   Use `lang="ar" dir="rtl"` for Arabic. `data-subject` is one of: `gct`, `body-systems`, `clinical`, `chemistry`, `physics`, `medicine-art`, `history-of-medicine`, `gct-2`, `body-systems-2`, `clinical-2`, `scientific-reasoning`, `gct-4`, `body-systems-4`. `data-lectures` is a single number or a range like `1-7`.

2. **No JavaScript of any kind**: no `<script>` tags, no `onclick` or any `on…` attributes, no `javascript:` links. Interactivity only with `<details>`/`<summary>` and plain links to section ids.
3. **No external files**: no web fonts, no `<link>`, no `@import`, no external images, no iframes, no forms. Diagrams, if useful, are simple inline `<svg>` (labelled boxes, arrows, flow charts, tables of structures). Do not try to draw anatomy realistically.
4. **One `<style>` element**, placed as the first child of the article, with every selector starting with `.lb-guide` so nothing leaks into the website.
5. **Use the Labobo design tokens**, always with these fallbacks, so the guide follows the site's light and dark themes:

   ```css
   .lb-guide {
     --g-ink:     var(--ink, #0B1233);
     --g-soft:    var(--ink-soft, #46527F);
     --g-paper:   var(--sheet, #FFFFFF);
     --g-wash:    var(--hema-wash, #E1E7FF);
     --g-rule:    var(--rule, #CDD4F2);
     --g-accent:  var(--hema, #2F5BFF);
     --g-mark:    var(--fill-yellow, #FFE45C);
     --g-warn:    var(--eosin, #D12A45);
     --g-warn-bg: var(--wrong-wash, #FFE3E7);
     --g-ok:      var(--correct, #137A50);
     --g-ok-bg:   var(--correct-wash, #DDF7EE);
     --g-edge:    var(--edge, #0B1233);
     font-family: var(--font-read, system-ui, -apple-system, "Segoe UI", sans-serif);
     color: var(--g-ink);
     line-height: 1.6;
     max-width: 46rem;
     margin: 0 auto;
   }
   ```

   Headings use `var(--font-display, system-ui, sans-serif)`. The look is Labobo's: white cards with a 2.5px solid `--g-edge` border, 14–22px corner radius, a hard offset shadow `4px 4px 0 var(--g-edge)` on callout boxes, and yellow `--g-mark` highlighting for key numbers. Never hard-code colours other than these fallbacks, and do not set a page background.

6. **Components** (use these class names so the site can style and index them):
   - `<nav class="lb-toc">` table of contents linking to every `h2`
   - `<section class="lb-section" id="…">` for each `h2` block; ids are short, lowercase, hyphenated and unique
   - `<aside class="lb-box lb-clinic">` In the clinic, `<aside class="lb-box lb-watch">` Watch out, `<aside class="lb-box lb-trap">` Exam trap, `<aside class="lb-box lb-mnemonic">` Mnemonic
   - `<span class="lb-tag lb-pastpaper">Past paper</span>` after any fact that appeared in a past paper
   - `<div class="lb-table-wrap"><table class="lb-table">…</table></div>` for every table, with `<th scope="col">` headers. The wrapper scrolls sideways on phones; the page itself must never scroll sideways.
   - `<ol class="lb-quiz">` with each question as `<li class="lb-q">`, the options as a list, and `<details class="lb-answer"><summary>Show answer</summary>…</details>`
   - `<dl class="lb-glossary">` for key terms
   - `<details class="lb-slidemap"><summary>Slide coverage</summary><ul>` with one `<li data-slides="4-7">` per section, saying which slide numbers it covers
7. **Readable on a 360px-wide phone**: no fixed widths above 100%, images and SVGs `max-width: 100%`, base font size at least 16px, tap targets at least 44px tall.
8. **Accessible**: one `h1` (the lecture title), then `h2`/`h3` in order with no skipped levels; every SVG has a `<title>`; contrast at least 4.5:1; don't use colour alone to carry meaning.
9. **Print-friendly**: add an `@media print` rule that opens all `<details>`, removes shadows and avoids breaking tables and boxes across pages.
10. Keep the fragment under 200 KB.

## 5. What to send back

1. The HTML fragment in a single code block, complete, nothing cut out or abbreviated.
2. Then, outside the code block, a short **Source check**:
   - any slide you could not read (e.g. picture-only slides) and what it showed;
   - every "Watch out" disagreement in one line each;
   - any fact you were not fully sure of, so a person can check it.

Before you answer, check your own output against sections 1 and 4: every teaching slide covered, no invented numbers, no script or external file, every selector starts with `.lb-guide`, every table wrapped, no "All of the above" in the questions.
