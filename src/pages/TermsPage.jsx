import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FREE_LECTURES, PASS_PRICE } from '../lib/access.js';
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_PROFILE } from '../lib/contact.js';

/* Terms, refunds and privacy on one page. Public: linked from the sign-in
   screen and the subscribe dialog, so it must open without an account. */

const UPDATED = '13 November 2026';
const TRIAL_DAYS = 3;
const REFUND_DAYS = 3;

export default function TermsPage() {
  useEffect(() => { document.title = 'Terms, refunds and privacy — Studywith Labobo'; }, []);

  return (
    <>
      <header className="appbar">
        <Link to="/" className="wordmark">
          <img src="/theme/app-icon.webp" alt="" width="40" height="40" />
          <span>Studywith <b>Labobo</b></span>
        </Link>
      </header>

      <main className="terms">
        <h1>Terms, refunds and privacy</h1>
        <p className="terms-updated">Last updated {UPDATED}</p>

        <p>
          Studywith Labobo is an independent study tool with practice questions for medical students. It is
          not run by, or affiliated with, any university. By using the site you agree to what is written here.
          Questions about any of it: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or{' '}
          <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">@{INSTAGRAM_HANDLE}</a> on Instagram.
        </p>

        <h2>The free plan</h2>
        <p>
          Every account can use the first {FREE_LECTURES} lectures of each subject in every mode, the weekly
          leaderboard and the reviews, without paying.
        </p>

        <h2>The pass</h2>
        <ul>
          <li>A pass costs {PASS_PRICE} and opens every lecture of every subject on the site.</li>
          <li>It runs until the end of the current semester. The exact end date is shown in your account under Subscription once the pass is on.</li>
          <li>You pay by bank transfer, write your personal reference in the payment description and upload the receipt under Subscription. Our team checks each payment and switches the pass on within 24 hours. No card details are entered on this site.</li>
          <li>A pass belongs to the account it was switched on for and cannot be moved to another account.</li>
        </ul>

        <h2>The free trial</h2>
        <p>
          An account signed in with a university address (@eu.edu.ge) can try full access for {TRIAL_DAYS} days,
          once. The {TRIAL_DAYS} days start when you press the button and cannot be paused. Each university
          address gets one trial, also if the account is deleted and created again.
        </p>

        <h2>Refunds</h2>
        <ul>
          <li>If you paid and we have not switched your pass on yet, tell us and we refund you in full.</li>
          <li>Within {REFUND_DAYS} days of your pass being switched on you can ask for a full refund for any reason. Your pass is switched off when the refund is sent.</li>
          <li>After {REFUND_DAYS} days we do not refund a pass, unless the site was unavailable for a large part of the time you paid for.</li>
          <li>Refunds go back the same way the payment came. Ask at {CONTACT_EMAIL} or on Instagram.</li>
        </ul>

        <h2>One student, one account</h2>
        <ul>
          <li>An account, and a pass, is for one student only. Sharing your login with other people is not allowed. This keeps the price low and the leaderboard fair for everyone.</li>
          <li>You can use your account on one phone and on one larger device (a laptop or a tablet). A second phone, or a second laptop or tablet, is blocked until you sign out of the first one.</li>
          <li>If an account is clearly being shared, we may switch its pass off without a refund.</li>
        </ul>

        <h2>The questions</h2>
        <ul>
          <li>The questions and explanations are written for practice. They are not official exam material and we cannot promise any exam result.</li>
          <li>We work to keep them correct, but mistakes happen. Use the Report a problem button on a question and we will fix it.</li>
          <li>Please do not copy, scrape or republish the question bank.</li>
        </ul>

        <h2>Your data</h2>
        <ul>
          <li><b>What we keep:</b> your name and email address from signing in, your semester, your quiz results and study progress, the days you visited, and any review, leaderboard name or question report you send.</li>
          <li><b>Payments:</b> we keep the receipt you upload, a note of who paid, when, and until when the pass runs. Receipts are stored privately and only our team can open them. We do not see or store card numbers.</li>
          <li><b>Why:</b> to save your progress across devices, run the leaderboard, improve the questions and manage passes. We do not sell your data or show adverts.</li>
          <li><b>Services we use:</b> Supabase stores accounts and progress, Netlify hosts the site, Google provides sign-in if you choose it, and GoatCounter counts page visits without cookies or personal profiles.</li>
          <li><b>Deleting it:</b> write to {CONTACT_EMAIL} from your account's address and we delete your account and everything linked to it.</li>
        </ul>

        <h2>Changes</h2>
        <p>
          If these terms change in a way that matters to you, we announce it on the home page before it takes
          effect. A pass you already paid for keeps the terms it was bought under.
        </p>

        <p><Link className="btn" to="/">Back to Labobo</Link></p>
      </main>
    </>
  );
}
