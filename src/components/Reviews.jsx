import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from './Dialog.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Cross } from './Icons.jsx';
import {
  ASK_FROM_DAY, dismissReviewCard, fetchApprovedReviews, fetchMyReview, joinedBeforeReviews, noteUseDay,
  onOpenReviewDialog, openReviewDialog, reviewCardDismissed, saveMyReview,
} from '../lib/reviews.js';

const MAX = 400;
// The wall stays hidden until there are enough reviews not to look empty.
const MIN_TO_SHOW = 3;
const TILTS = [-1.4, 1.1, -0.8, 1.5, -1.2, 0.9];
const FILLS = ['yellow', 'mint', 'blue', 'coral', 'violet', 'orange'];
const STATUS = {
  pending: 'Thanks! We read every review, and yours will appear on the home page once it’s approved.',
  approved: 'Your review is on the home page. Thank you!',
  hidden: 'Thanks for your feedback. We read it and it helps us improve.',
};

/** The signed-in student's own review (null if none yet). */
export function useMyReview() {
  return useQuery({
    queryKey: ['my-review'],
    queryFn: ({ signal }) => fetchMyReview(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

const StarRow = ({ n }) => (
  <span className="review-stars" aria-label={`${n} out of 5 stars`}>
    {'★'.repeat(n)}<span aria-hidden="true">{'★'.repeat(5 - n)}</span>
  </span>
);

function Stars({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={'star' + (n <= shown ? ' on' : '')}
                onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
          ★
        </button>
      ))}
    </div>
  );
}

/* Stars, the prompt in English and Arabic, and the text box. Shows the
   student's saved review (with an Edit button) when they already have one. */
function ReviewBody({ mine, onCancel }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(!mine);
  const [rating, setRating] = useState(mine?.rating || 0);
  const [body, setBody] = useState(mine?.body || '');
  const save = useMutation({
    mutationFn: () => saveMyReview({ rating, body: body.trim() }),
    onSuccess: (review) => {
      qc.setQueryData(['my-review'], review);
      setEditing(false);
    },
  });
  const saved = save.data || mine;

  if (!editing && saved) {
    return (
      <>
        <p className="review-mine"><StarRow n={saved.rating} /><span dir="auto">{saved.body}</span></p>
        <p className="review-status" role="status">{STATUS[saved.status] || STATUS.pending}</p>
        <button type="button" className="btn sm" onClick={() => setEditing(true)}>Edit my review</button>
      </>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (rating && body.trim()) save.mutate(); }}>
      <p className="review-lede">
        How is Labobo helping you study? Rate us and tell us in your own words. Every review helps us make it better.
      </p>
      <p className="review-lede" lang="ar" dir="rtl">
        كيف يساعدك لابوبو في دراستك؟ قيّمنا واكتب رأيك بكلماتك الخاصة، فكل تقييم يساعدنا على التحسين.
      </p>
      <Stars value={rating} onChange={setRating} />
      <label className="sr-only" htmlFor="review-body">Your review</label>
      <textarea id="review-body" rows={4} maxLength={MAX} dir="auto" value={body}
                placeholder="Write it your way… / اكتب بطريقتك…"
                onChange={(e) => setBody(e.target.value)} />
      <div className="review-actions">
        <span className="review-count">{MAX - body.length} characters left</span>
        {onCancel || saved ? (
          <button type="button" className="btn ghost sm"
                  onClick={() => (saved ? setEditing(false) : onCancel())}>Cancel</button>
        ) : null}
        <button type="submit" className="btn primary" disabled={!rating || !body.trim() || save.isPending}>
          {save.isPending ? 'Sending…' : 'Send review'}
        </button>
      </div>
      {!rating && body.trim() ? <p className="review-hint">Tap the stars to rate us.</p> : null}
      {save.isError ? <p className="form-error" role="alert">{save.error.message}</p> : null}
    </form>
  );
}

function Band({ titleId, onClose }) {
  return (
    <div className="review-band">
      <h2 id={titleId}>Leave us a review</h2>
      <p lang="ar" dir="rtl">شاركنا رأيك</p>
      {onClose ? (
        <button type="button" className="review-close" aria-label="Close" onClick={onClose}><Cross /></button>
      ) : null}
    </div>
  );
}

/* On the home page, depending on where the student is:
     - had an account before reviews launched         -> asked straight away
     - signed up after, fewer than 3 days of use       -> nothing
     - already reviewed                               -> nothing
     - 3rd day onwards, never closed the card         -> the full card, with an X
     - closed the card without reviewing              -> a small "Give us a review" button
   Whoever has reviewed finds "Edit my review" in the profile menu instead. */
export function ReviewPrompt({ activeDays = 0 }) {
  const { user } = useAuth();
  const { data: mine, isLoading, isError } = useMyReview();
  const [useDays] = useState(noteUseDay);
  const [dismissed, setDismissed] = useState(reviewCardDismissed);
  // Keep the card on screen after sending, to show the thank-you.
  const [sentHere, setSentHere] = useState(false);

  useEffect(() => { if (mine === null) setSentHere(false); }, [mine]);

  if (isLoading || isError) return null;
  const eligible = joinedBeforeReviews(user?.created_at) || Math.max(useDays, activeDays) >= ASK_FROM_DAY;
  if (!eligible && !sentHere) return null;
  if (mine && !sentHere) return null;

  if (dismissed && !sentHere) {
    return (
      <button type="button" className="review-pill" onClick={openReviewDialog}>
        <span aria-hidden="true">⭐</span> Give us a review
      </button>
    );
  }

  return (
    <section className="review-form" aria-labelledby="review-card-title"
             onSubmitCapture={() => setSentHere(true)}>
      <Band titleId="review-card-title" onClose={() => { dismissReviewCard(); setDismissed(true); setSentHere(false); }} />
      <div className="review-inner"><ReviewBody mine={mine} /></div>
    </section>
  );
}

/* Mounted once in App: the review form as a dialog, opened from the profile
   menu or the small home-page button. */
export function ReviewDialogHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => onOpenReviewDialog(() => setOpen(true)), []);
  if (!open) return null;
  return <ReviewDialog onClose={() => setOpen(false)} />;
}

function ReviewDialog({ onClose }) {
  const { data: mine, isLoading } = useMyReview();
  return (
    <Dialog onClose={onClose} labelledBy="review-dialog-title">
      <div className="review-form in-dialog">
        <Band titleId="review-dialog-title" onClose={onClose} />
        <div className="review-inner">
          {isLoading ? <p className="review-lede">Loading…</p> : <ReviewBody mine={mine} onCancel={onClose} />}
        </div>
      </div>
    </Dialog>
  );
}

function useApprovedReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: ({ signal }) => fetchApprovedReviews(signal),
    staleTime: 5 * 60_000,
    retry: false,
  }).data || [];
}

/* One approved review under the streak card (desktop and iPad; CSS hides it
   on phones). A different one, picked at random, each time the page opens. */
export function ReviewNote() {
  const items = useApprovedReviews();
  const pick = useMemo(() => Math.random(), []);
  if (items.length < MIN_TO_SHOW) return null;
  const r = items[Math.floor(pick * items.length)];
  return (
    <figure className="side-review">
      <StarRow n={r.rating} />
      <blockquote dir="auto">{r.body}</blockquote>
      <figcaption>{r.name}</figcaption>
    </figure>
  );
}

/* Approved reviews as sticky notes, at the bottom of the home page. */
export function ReviewWall() {
  const items = useApprovedReviews();
  if (items.length < MIN_TO_SHOW) return null;

  return (
    <section className="review-wall" aria-labelledby="review-wall-title">
      <h2 id="review-wall-title" className="section-title">What students say</h2>
      <ul className="review-notes">
        {items.slice(0, 12).map((r, i) => (
          <li key={r.id} className={'review-note fill-' + FILLS[i % FILLS.length]}
              style={{ '--tilt': TILTS[i % TILTS.length] + 'deg' }}>
            <StarRow n={r.rating} />
            <p dir="auto">{r.body}</p>
            <b>{r.name}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
