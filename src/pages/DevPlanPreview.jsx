import { LockedContext, LockedLectures, LockedNote, PlanStripView, SubscribeView } from '../components/Plan.jsx';
import { DecidedList, PaymentCard } from '../components/admin/PaymentsTab.jsx';
import '../styles/quiz.css';
import '../styles/admin.css';

/* Development only (/dev/plan): every state of the subscription screens with
   made-up data, so they can be looked at without an account, a pass or the
   server functions. App.jsx only adds this route in `vite dev`; it is not in
   the built site. Nothing here saves or sends anything. */

const SOON = new Date(Date.now() + 2 * 86400e3).toISOString();
const RECENT = new Date(Date.now() - 40 * 60e3).toISOString();
const TRIAL = { days: 3, domain: 'eu.edu.ge', eligible: true, used: false, available: true };
const NO_TRIAL = { ...TRIAL, eligible: false, available: false };

const ACCESS = {
  before: { locked: false, lock_start: '2026-11-14T19:59:00Z', access: 'open', expires_at: null, trial: NO_TRIAL },
  free: { locked: true, access: 'none', expires_at: null, trial: NO_TRIAL },
  freeUni: { locked: true, access: 'none', expires_at: null, trial: TRIAL },
  trial: { locked: true, access: 'trial', expires_at: SOON, trial: { ...TRIAL, used: true, available: false } },
  pass: { locked: true, access: 'pass', expires_at: '2027-02-28T19:59:59Z', trial: NO_TRIAL },
};
const REF = 'LB-7K2QXM';
// Placeholders on purpose: the real accounts live in the payment_accounts
// table, not in this public code.
const ACCOUNTS = [
  { bank: 'Bank of Georgia', holder: 'Account name (placeholder)', iban: 'GE00BG0000000000000000' },
  { bank: 'TBC Bank', holder: 'Account name (placeholder)', iban: 'GE00TB0000000000000000' },
];
const PAYMENT = {
  none: { reference: REF, accounts: ACCOUNTS, request: null },
  pending: { reference: REF, accounts: ACCOUNTS, request: { status: 'pending', created_at: RECENT, decided_at: null, note: null } },
  rejected: { reference: REF, accounts: ACCOUNTS, request: { status: 'rejected', created_at: RECENT, decided_at: RECENT, note: 'The amount received was 10 lari, not 15.' } },
};

const LOCKED = [
  { subject: 'Biochemistry', topic: 'Biochem Lec 3: Gluconeogenesis', n: 71 },
  { subject: 'Biochemistry', topic: 'Biochem Lec 4: Pentose Phosphate Pathway and NADPH', n: 112 },
  { subject: 'Medical Genetics', topic: 'MG Lec 3: Human Genome Project', n: 28 },
  { subject: 'Medical Genetics', topic: 'MG Lec 4: Personal Genome Projects', n: 27 },
];

// A small drawn stand-in for an uploaded receipt.
const RECEIPT = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="380"><rect width="300" height="380" fill="#fff"/>'
  + '<text x="24" y="48" font-family="sans-serif" font-size="20" font-weight="700">Transfer receipt</text>'
  + '<text x="24" y="92" font-family="sans-serif" font-size="14">Amount: 15.00 GEL</text>'
  + '<text x="24" y="118" font-family="sans-serif" font-size="14">Description: LB-7K2QXM</text>'
  + '<text x="24" y="144" font-family="sans-serif" font-size="14">Status: Completed</text></svg>'
);
const WAITING = {
  id: 1, user_id: 'u1', reference: REF, status: 'pending', created_at: RECENT, username: 'Sample Student',
  email: 'sample.student@eu.edu.ge', semester: '2', is_pdf: false, receipt_url: RECEIPT,
};
const DECIDED = [
  { id: 2, user_id: 'u2', reference: 'LB-QH4M9T', status: 'approved', created_at: RECENT, decided_at: RECENT, decided_by: 'admin', username: 'Another Student', note: null },
  { id: 3, user_id: 'u3', reference: 'LB-2WXP7C', status: 'rejected', created_at: RECENT, decided_at: RECENT, decided_by: 'admin', username: 'Third Student', note: 'No payment with this reference arrived.' },
];

const noop = () => {};
const nothing = async () => false;

function Frame({ title, children, wide }) {
  return (
    <section className={'dev-frame' + (wide ? ' wide' : '')}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Subscribe({ access, payment }) {
  return (
    <div className="dialog dev-dialog">
      <SubscribeView access={access} payment={payment} email="student@gmail.com"
                     onStartTrial={noop} onSendReceipt={nothing} />
    </div>
  );
}

export default function DevPlanPreview() {
  return (
    <main className="dev-preview">
      <h1>Subscription screens</h1>
      <p className="lede">Made-up data, development only. Buttons here do not send anything.</p>

      <div className="dev-grid">
        <Frame title="Subscribe window: free plan, paying by transfer"><Subscribe access={ACCESS.free} payment={PAYMENT.none} /></Frame>
        <Frame title="After the receipt is sent"><Subscribe access={ACCESS.free} payment={PAYMENT.pending} /></Frame>
        <Frame title="Receipt rejected"><Subscribe access={ACCESS.free} payment={PAYMENT.rejected} /></Frame>
        <Frame title="University account: trial offered"><Subscribe access={ACCESS.freeUni} payment={PAYMENT.none} /></Frame>
        <Frame title="Pass switched on"><Subscribe access={ACCESS.pass} payment={PAYMENT.none} /></Frame>
        <Frame title="Before 14 November"><Subscribe access={ACCESS.before} payment={PAYMENT.none} /></Frame>
      </div>

      <Frame title="Home page strip: free, trial, pass" wide>
        <PlanStripView data={ACCESS.free} />
        <PlanStripView data={ACCESS.trial} />
        <PlanStripView data={ACCESS.pass} />
      </Frame>

      <Frame title="A subject's start screen and topic picker, free plan" wide>
        <LockedContext.Provider value={LOCKED}>
          <LockedLectures />
          <LockedNote />
        </LockedContext.Provider>
      </Frame>

      <Frame title="Admin: a receipt waiting, and decided ones" wide>
        <div className="adm-panel wide">
          <ul className="adm-payments">
            <PaymentCard item={WAITING} onApprove={noop} onReject={noop} />
          </ul>
        </div>
        <div className="adm-panel wide" style={{ marginTop: 18 }}>
          <DecidedList items={DECIDED} />
        </div>
      </Frame>
    </main>
  );
}
