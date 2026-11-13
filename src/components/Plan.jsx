import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from './Dialog.jsx';
import { Cross, InstagramGlyph, Mail } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useAccess } from '../hooks/useAccess.js';
import {
  FREE_LECTURES, PASS_PRICE, formatDay, formatMoment,
  onOpenSubscribeDialog, openSubscribeDialog, startTrial,
} from '../lib/access.js';
import { fetchPayment, sendReceipt } from '../lib/payments.js';
import { CONTACT_EMAIL, INSTAGRAM_DM, INSTAGRAM_HANDLE } from '../lib/contact.js';

/* Everything a student sees about their plan: the lock on lectures their
   plan leaves out, the strip on the home page, and the dialog where they pay
   for a pass or start the free trial. What a plan may read is decided by the
   server; these components only show it.

   The *View components take plain data, so the dev-only preview page
   (src/pages/DevPlanPreview.jsx) can show every state without an account. */

const Lock = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

/** The lectures this subject holds that the student's plan does not include:
    [{ subject, topic, n }]. Provided by SubjectPage, empty elsewhere. */
export const LockedContext = createContext([]);
const useLocked = () => useContext(LockedContext);

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

// Locked lectures listed per part in a topic picker before "Show N more".
const LOCKED_PREVIEW = 3;

/** A subject's locked lectures inside a topic picker, next to the open ones,
    so a student sees exactly what a pass would add. Each opens the subscribe
    dialog. `as` picks the picker's own look: 'chip' (study mode) or 'row'
    (flashcards). */
export function LockedTopics({ subject, as = 'chip' }) {
  const locked = useLocked().filter((l) => l.subject === subject);
  // A part can hold a dozen or more locked lectures. Show the first few and
  // fold the rest away, so the next part's open lectures stay within reach.
  const [open, setOpen] = useState(false);
  if (!locked.length) return null;
  const shown = open || locked.length <= LOCKED_PREVIEW + 1 ? locked : locked.slice(0, LOCKED_PREVIEW);
  const hidden = locked.length - shown.length;
  const row = as === 'row';
  return (
    <>
      {shown.map((l) => (
        <button key={l.topic} type="button" className={row ? 'fc-topic is-locked' : 'sf-chip is-locked'}
                onClick={openSubscribeDialog} aria-label={`${l.topic}, ${plural(l.n, 'question')}, locked. Unlock with a pass`}>
          <Lock width="14" height="14" />
          <span>{l.topic}</span>
          <span className={row ? 'fc-n' : 'sf-n'}>{l.n}</span>
        </button>
      ))}
      {hidden > 0 ? (
        <button type="button" className={row ? 'fc-topic is-locked more' : 'sf-chip is-locked more'} onClick={() => setOpen(true)}>
          <span>Show {plural(hidden, 'more locked lecture')}</span>
        </button>
      ) : null}
    </>
  );
}

/** One line under a topic picker: how much more a pass would add here. */
export function LockedNote() {
  const locked = useLocked();
  if (!locked.length) return null;
  const questions = locked.reduce((sum, l) => sum + l.n, 0);
  return (
    <button type="button" className="locked-note" onClick={openSubscribeDialog}>
      <Lock />
      <span>
        <b>{plural(locked.length, 'more lecture')}</b> ({plural(questions, 'question')}) with a pass
      </span>
    </button>
  );
}

/** The subject's locked lectures, listed by part, on its start screen. */
export function LockedLectures() {
  const locked = useLocked();
  if (!locked.length) return null;

  const bySubject = new Map();
  for (const l of locked) {
    if (!bySubject.has(l.subject)) bySubject.set(l.subject, []);
    bySubject.get(l.subject).push(l);
  }
  const questions = locked.reduce((sum, l) => sum + l.n, 0);

  return (
    <section className="locked" aria-labelledby="locked-title">
      <div className="locked-head">
        <div>
          <h2 id="locked-title" className="section-title">Locked lectures</h2>
          <p className="locked-lede">
            The first {FREE_LECTURES} lectures of each part are free. A pass opens the other{' '}
            {plural(locked.length, 'lecture')}, {plural(questions, 'question')} in this subject.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={openSubscribeDialog}>Unlock everything</button>
      </div>
      {[...bySubject].map(([subject, items]) => (
        <div key={subject} className="locked-group">
          {bySubject.size > 1 ? <h3>{subject}</h3> : null}
          <ul className="locked-list">
            {items.map((l) => (
              <li key={l.topic}>
                <Lock />
                <span className="locked-topic">{l.topic}</span>
                <span className="locked-n">{l.n}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** The home page strip for a given plan. Nothing before subscriptions start. */
export function PlanStripView({ data }) {
  if (!data || !data.locked) return null;

  if (data.access === 'pass') {
    return <p className="plan-strip pass"><b>Full access</b> Your pass runs until {formatDay(data.expires_at)}.</p>;
  }
  if (data.access === 'trial') {
    return (
      <div className="plan-strip trial">
        <p><b>Free trial</b> Everything is open until {formatMoment(data.expires_at)}.</p>
        <button type="button" className="btn sm primary" onClick={openSubscribeDialog}>Keep full access</button>
      </div>
    );
  }
  return (
    <div className="plan-strip free">
      <p>
        <b>Free plan</b> The first {FREE_LECTURES} lectures of every subject are open. A pass opens all of them
        for {PASS_PRICE}.
      </p>
      <button type="button" className="btn sm primary" onClick={openSubscribeDialog}>Unlock everything</button>
    </div>
  );
}

export function PlanStrip() {
  const { data } = useAccess();
  return <PlanStripView data={data} />;
}

/* ── The subscribe dialog ─────────────────────────────────────────── */

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the text is on screen to copy by hand */ }
  }
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ContactButtons({ mailto }) {
  return (
    <div className="subscribe-contact">
      <a className="help-option ig" href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer">
        <span className="help-icon" aria-hidden="true"><InstagramGlyph /></span>
        <span className="help-text"><b>Message us on Instagram</b><span>@{INSTAGRAM_HANDLE}</span></span>
      </a>
      <a className="help-option mail" href={mailto}>
        <span className="help-icon" aria-hidden="true"><Mail /></span>
        <span className="help-text"><b>Email us</b><span>{CONTACT_EMAIL}</span></span>
      </a>
    </div>
  );
}

/* Paying by bank transfer: the accounts (from the payment_accounts table, so
   they can change without a deploy), the student's reference, and the
   receipt upload. `onSend(file)` uploads; `sending` and `error` report on it. */
function TransferSteps({ accounts, reference, onSend, sending, error }) {
  const [file, setFile] = useState(null);
  return (
    <ol className="subscribe-steps pay">
      <li>
        <span>Send <b>{PASS_PRICE}</b> by bank transfer to one of these accounts.</span>
        <ul className="pay-accounts">
          {accounts.map((a) => (
            <li key={a.iban}>
              <b>{a.bank}</b>
              <span>{a.holder}</span>
              <span className="pay-iban"><code>{a.iban}</code><CopyButton text={a.iban} label={`${a.bank} account number`} /></span>
            </li>
          ))}
        </ul>
      </li>
      <li>
        <span>Write this reference in the payment description, so we know it is yours.</span>
        <p className="pay-reference"><code>{reference || '…'}</code>{reference ? <CopyButton text={reference} label="your reference" /> : null}</p>
      </li>
      <li>
        <span>Upload a screenshot or photo of the receipt, or the PDF from your bank.</span>
        <div className="pay-upload">
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Receipt file"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="button" className="btn primary" disabled={!file || sending} onClick={() => onSend(file)}>
            {sending ? 'Sending…' : 'Send receipt'}
          </button>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </li>
    </ol>
  );
}

/** The dialog's content for a given plan and payment state.
    access:  what /api/access returned
    payment: what /api/payments returned ({ reference, request }) */
export function SubscribeView({
  access, payment, email, loading, onClose,
  onStartTrial, trialBusy, trialError,
  onSendReceipt, sending, sendError,
}) {
  // After a receipt is in, the student can still choose to send another.
  const [resending, setResending] = useState(false);
  const request = payment?.request || null;
  const reference = payment?.reference || '';
  // No accounts (none set up, or the lookup failed): ask them to message us.
  const accounts = payment?.accounts || [];
  const waiting = request?.status === 'pending' && !resending;

  const hasFull = access?.access === 'pass' || access?.access === 'trial';
  const title = access && !access.locked ? 'Subscriptions are coming' : hasFull ? 'Your plan' : 'Unlock every lecture';
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Labobo pass ${reference}`.trim())}`
    + `&body=${encodeURIComponent(`Hi, I would like a Labobo pass.\nMy account email: ${email || ''}\nMy reference: ${reference}\n`)}`;

  return (
    <div className="subscribe">
      <div className="subscribe-head">
        <h2 id="subscribe-title">{title}</h2>
        {onClose ? <button type="button" className="help-close" aria-label="Close" onClick={onClose}><Cross /></button> : null}
      </div>

      {loading ? <p className="dialog-text">Loading…</p> : null}

      {access && !access.locked ? (
        <p className="dialog-text">
          Everything on Labobo is free until {formatMoment(access.lock_start)}. After that the first{' '}
          {FREE_LECTURES} lectures of every subject stay free, and the rest needs a pass.
        </p>
      ) : null}

      {access?.access === 'pass' ? (
        <p className="subscribe-status ok">You have full access until <b>{formatDay(access.expires_at)}</b>.</p>
      ) : null}
      {access?.access === 'trial' ? (
        <p className="subscribe-status">
          Your free trial is running. Everything is open until <b>{formatMoment(access.expires_at)}</b>.
        </p>
      ) : null}

      {access && access.access !== 'pass' ? (
        <>
          <p className="subscribe-price">
            <b>{PASS_PRICE}</b>
            <span>Every subject and every lecture, for the whole semester.</span>
          </p>

          {waiting ? (
            <div className="subscribe-status ok" role="status">
              <p>
                <b>Receipt received</b> on {formatMoment(request.created_at)}. Our team reviews every payment and
                switches your account on within 24 hours.
              </p>
              <p>
                Want it faster? Message us on Instagram or by email with your reference <b>{reference}</b>.
              </p>
            </div>
          ) : null}

          {request?.status === 'rejected' && !resending ? (
            <div className="subscribe-status bad" role="status">
              <p><b>We could not match your last receipt.</b>{request.note ? ` ${request.note}` : ''}</p>
              <p>Check the payment and send the receipt again, or message us and we will sort it out.</p>
            </div>
          ) : null}

          {!waiting && accounts.length ? (
            <>
              <TransferSteps accounts={accounts} reference={reference} sending={sending} error={sendError}
                             onSend={async (file) => { if (await onSendReceipt(file)) setResending(false); }} />
              <p className="subscribe-note">
                Our team reviews every payment and switches your account on within 24 hours. To be faster,
                message us on Instagram or by email once you have sent the receipt.
              </p>
            </>
          ) : null}

          {!waiting && !accounts.length ? (
            <ol className="subscribe-steps">
              <li>
                Message us on Instagram or by email and tell us the email of your account
                {email ? <>: <b className="subscribe-email">{email}</b></> : '.'}
              </li>
              <li>We reply with how to pay the {PASS_PRICE}.</li>
              <li>Once it arrives we switch your account on. Nothing to install or re-enter.</li>
            </ol>
          ) : null}

          <ContactButtons mailto={mailto} />
          {waiting ? (
            <button type="button" className="btn ghost sm subscribe-again" onClick={() => setResending(true)}>
              Send a different receipt
            </button>
          ) : null}
        </>
      ) : null}

      {access?.locked && access.access === 'none' ? (
        <TrialOffer trial={access.trial} busy={trialBusy} onStart={onStartTrial} />
      ) : null}
      {trialError ? <p className="form-error" role="alert">{trialError}</p> : null}

      <p className="subscribe-foot">
        <Link to="/terms" onClick={onClose}>Terms, refunds and privacy</Link>
      </p>
    </div>
  );
}

function TrialOffer({ trial, busy, onStart }) {
  if (!trial) return null;
  if (trial.available) {
    return (
      <div className="subscribe-trial">
        <p>
          <b>Try it first.</b> Your university account gets {trial.days} days of full access, once. The
          {' '}{trial.days} days start when you press the button.
        </p>
        <button type="button" className="btn" disabled={busy} onClick={onStart}>
          {busy ? 'Starting…' : `Start my free ${trial.days} days`}
        </button>
      </div>
    );
  }
  if (trial.used) {
    return <p className="subscribe-trial used">Your free {trial.days}-day trial has been used.</p>;
  }
  return (
    <p className="subscribe-trial used">
      <b>Free {trial.days}-day trial:</b> sign in with your university Google account (@{trial.domain}) to
      use it. It is a separate account from this one, so your progress here does not move across.
    </p>
  );
}

/** Mounted once for the signed-in app. Opens the dialog on request, and
    reloads the question banks whenever the student's plan changes (a trial
    started here, or a pass switched on from the admin dashboard), so locked
    lectures appear without a page reload. */
export function SubscribeDialogHost() {
  const [open, setOpen] = useState(false);
  const { data } = useAccess();
  const queryClient = useQueryClient();
  const lastKind = useRef(undefined);

  useEffect(() => onOpenSubscribeDialog(() => setOpen(true)), []);

  useEffect(() => {
    const kind = data ? `${data.locked}:${data.access}` : undefined;
    if (kind && lastKind.current && kind !== lastKind.current) {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    }
    if (kind) lastKind.current = kind;
  }, [data, queryClient]);

  if (!open) return null;
  return <SubscribeDialog onClose={() => setOpen(false)} />;
}

function SubscribeDialog({ onClose }) {
  const { user } = useAuth();
  const { data: access, isLoading } = useAccess();
  const queryClient = useQueryClient();
  const paymentKey = ['payment', user?.id];
  const { data: payment } = useQuery({
    queryKey: paymentKey,
    enabled: !!user,
    queryFn: ({ signal }) => fetchPayment(signal),
    // While a receipt is waiting, notice the approval without a reload.
    refetchInterval: (q) => (q.state.data?.request?.status === 'pending' ? 60_000 : false),
    retry: 1,
  });

  const trial = useMutation({
    mutationFn: startTrial,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['access'] });
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
  const receipt = useMutation({
    mutationFn: sendReceipt,
    onSuccess: (data) => queryClient.setQueryData(paymentKey, data),
  });

  // An approval shows up as a decided request: fetch the new plan with it.
  const status = payment?.request?.status;
  useEffect(() => {
    if (status === 'approved') queryClient.invalidateQueries({ queryKey: ['access'] });
  }, [status, queryClient]);

  return (
    <Dialog onClose={onClose} labelledBy="subscribe-title">
      <SubscribeView
        access={access} payment={payment} email={user?.email || ''} loading={isLoading} onClose={onClose}
        onStartTrial={() => trial.mutate()} trialBusy={trial.isPending}
        trialError={trial.isError ? trial.error.message : ''}
        onSendReceipt={(file) => receipt.mutateAsync(file).then(() => true, () => false)}
        sending={receipt.isPending} sendError={receipt.isError ? receipt.error.message : ''}
      />
    </Dialog>
  );
}
