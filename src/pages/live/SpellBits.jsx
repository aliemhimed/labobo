import { useState } from 'react';
import { SPELLS, spellName } from '../../lib/spells.js';

/* Power-up pieces for friends' rooms (phone and projector). Every visual
   effect is a still image: no motion, so reduced-motion is always safe. */

/** A spell as a small sticker card. */
export function SpellCard({ id, onClick, children }) {
  const s = SPELLS[id];
  if (!s) return null;
  const inner = (
    <>
      <span className="lv-spell-name">{s.name}{s.rare ? <em className="lv-spell-rare">Rare</em> : null}</span>
      <span className="lv-spell-effect">{s.effect}</span>
      {children}
    </>
  );
  const cls = `lv-spell${s.rare ? ' is-rare' : ''}`;
  return onClick
    ? <button type="button" className={cls} onClick={onClick}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

/** The streak, the held spell and the Antidote badge. */
export function SpellBar({ spells }) {
  const streak = spells.streak || 0;
  return (
    <div className="lv-spellbar" aria-label="Power-ups">
      {spells.held ? (
        <span>Power-up: <b>{spellName(spells.held)}</b></span>
      ) : (
        <span>{streak > 0 ? `${streak} in a row. ` : ''}Answer 3 in a row to earn a power-up</span>
      )}
      {spells.shield ? <span className="lv-badge">Antidote ready</span> : null}
    </div>
  );
}

/** "Pick a power-up": the 2 or 3 cards the player has earned. */
export function CardSheet({ cards, onPick, busy, error }) {
  return (
    <section className="lv-sheet" role="dialog" aria-labelledby="lv-sheet-h" aria-modal="false">
      <h2 id="lv-sheet-h">Pick a power-up</h2>
      <p className="live-muted">You answered 3 in a row. Keep one card.</p>
      <div className="lv-sheet-cards">
        {cards.map((id, i) => (
          <button key={`${id}-${i}`} type="button" className={`lv-spell${SPELLS[id]?.rare ? ' is-rare' : ''}`} disabled={busy} onClick={() => onPick(i)}>
            <span className="lv-spell-name">{spellName(id)}{SPELLS[id]?.rare ? <em className="lv-spell-rare">Rare</em> : null}</span>
            <span className="lv-spell-effect">{SPELLS[id]?.effect}</span>
          </button>
        ))}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}

const lineFor = (out, held, target) => {
  const name = spellName(held);
  switch (out.status) {
    case 'ok':
      if (SPELLS[held]?.kind === 'instant') return `${name}: points taken from ${target}.`;
      if (SPELLS[held]?.kind === 'shield') return 'Antidote is ready. It blocks the next spell cast on you.';
      if (SPELLS[held]?.kind === 'self') return `${name} is on. It acts on the next question.`;
      return `${name} cast on ${target}. It acts on the next question.`;
    case 'blocked': return `${target}'s Antidote blocked it. Your spell is used up.`;
    case 'target_busy': return `${target} was already hit for the next question. Pick another friend.`;
    case 'not_now': return 'You can only use a power-up between questions.';
    case 'no_more_questions': return 'That was the last question, so there is nothing left to use it on.';
    case 'nothing_held': return 'You have no power-up to use.';
    case 'bad_target': return 'You cannot pick that player.';
    case 'already': return 'You already used this power-up for the next question.';
    default: return 'It did not work. Try again.';
  }
};

/** Between questions: use the held spell, choosing a friend for attacks. */
export function CastPanel({ spells, act }) {
  const [choosing, setChoosing] = useState(false);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');
  const held = spells.held;
  const kind = spells.held_kind || SPELLS[held]?.kind;

  const [flown, setFlown] = useState(null);
  async function cast(who) {
    setBusy(true); setErr('');
    try {
      const out = await act('cast', who ? { target: who.user_id } : {});
      if (out?.status === 'ok' || out?.status === 'blocked') setFlown(held);
      setLine(lineFor(out || {}, held, who?.shown));
      setChoosing(false); setTarget(null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (!held) {
    return line ? (
      <div className="lv-cast-done">
        {flown ? <div className="lv-flyaway" aria-hidden="true"><SpellCard id={flown} /></div> : null}
        <p className="live-status lv-stamp" role="status">{line}</p>
      </div>
    ) : null;
  }
  const targets = [...(spells.targets || [])].sort((a, b) => b.score - a.score);
  const direct = kind === 'self' || kind === 'shield';
  return (
    <section className="lv-cast" aria-labelledby="lv-cast-h">
      <h2 id="lv-cast-h">Your power-up</h2>
      <SpellCard id={held} />
      {SPELLS[held]?.explanation ? <p className="live-muted">{SPELLS[held].explanation}</p> : null}
      {!choosing ? (
        <button type="button" className="btn primary block" disabled={busy}
                onClick={() => (direct ? cast(null) : setChoosing(true))}>
          {busy ? 'Using…' : `Use ${spellName(held)}`}
        </button>
      ) : (
        <>
          <p className="lv-cast-ask">Choose a friend</p>
          {targets.length ? (
            <ul className="lv-targets">
              {targets.map((t) => (
                <li key={t.user_id}>
                  <button type="button" disabled={t.busy || busy} aria-pressed={target?.user_id === t.user_id} onClick={() => setTarget(t)}>
                    <b>{t.shown}</b>
                    <span>{t.busy ? 'already hit' : `${t.score} points`}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="live-muted">No friends to pick right now.</p>}
          <div className="lv-cast-actions">
            <button type="button" className="btn" disabled={busy} onClick={() => { setChoosing(false); setTarget(null); }}>Cancel</button>
            <button type="button" className="btn primary" disabled={busy || !target} onClick={() => cast(target)}>
              {target ? `Cast on ${target.shown}` : 'Pick a friend'}
            </button>
          </div>
        </>
      )}
      <p className="live-muted">{kind === 'instant' ? 'It works at once.' : 'It acts on the next question.'}</p>
      {line ? <p className="live-status" role="status">{line}</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
    </section>
  );
}

/** At the top of a question: who cast what on you, and what it means. */
export function EffectBanner({ effects }) {
  if (!effects?.length) return null;
  return (
    <div className="lv-effects" role="status">
      {effects.map((e, i) => {
        const s = SPELLS[e.spell];
        const own = e.kind === 'self';
        return (
          <p key={`${e.spell}-${i}`}>
            <b>{own ? `You used ${spellName(e.spell)}` : `${e.by || 'A friend'} cast ${spellName(e.spell)} on you`}</b>
            {s ? <span>{s.explanation ? `${s.explanation} ` : ''}{s.effect}.</span> : null}
          </p>
        );
      })}
    </div>
  );
}

/** Spells for the next question, as "Ace → Cataract → Omar". */
export function CastList({ casts, big = false, title = 'Spells for the next question' }) {
  if (!casts?.length) return null;
  return (
    <div className={`lv-casts${big ? ' is-big' : ''}`}>
      <h2>{title}</h2>
      <ul>
        {casts.map((c, i) => <li key={i}><b>{c.by}</b> → {spellName(c.spell)} → <b>{c.target}</b></li>)}
      </ul>
    </div>
  );
}

/** The sentence for a 'spell' room event. */
export function spellEventText(p) {
  if (!p?.spell) return '';
  const name = spellName(p.spell);
  if (p.blocked) return `${p.target}'s Antidote blocked ${p.by}'s ${name}`;
  if (p.spell === 'point_steal') return p.amount > 0 ? `${p.by} stole ${p.amount} points from ${p.target}` : `${p.by} tried to steal points from ${p.target}`;
  if (!p.target) return `${p.by} has ${name} ready`;
  return `${p.by} cast ${name} on ${p.target}`;
}
