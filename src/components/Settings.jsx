import { useEffect, useState } from 'react';
import Dialog from './Dialog.jsx';
import { Cross } from './Icons.jsx';
import { onOpenSettingsDialog, setSetting, useSettings } from '../lib/settings.js';
import { getTheme, setTheme } from '../lib/storage.js';
import { applyTheme } from '../lib/theme.js';
import '../styles/overlays.css';

/* One row of the dialog: a label, a short hint and a segmented choice. */
function Choice({ id, label, hint, value, options, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-label" id={`${id}-label`}>{label}</div>
      {hint ? <p className="settings-hint">{hint}</p> : null}
      <div className="segmented settings-segmented" role="group" aria-labelledby={`${id}-label`}
           style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function SettingsDialog({ onClose }) {
  const settings = useSettings();
  const [theme, setThemeState] = useState(getTheme);

  function chooseTheme(t) {
    setTheme(t);
    applyTheme(t);
    setThemeState(t);
  }

  return (
    <Dialog onClose={onClose} labelledBy="settings-title">
      <div className="settings-head">
        <h2 id="settings-title">Settings</h2>
        <button type="button" className="settings-close" aria-label="Close" onClick={onClose}><Cross /></button>
      </div>

      <Choice id="set-reactions" label="Cat reactions"
              hint="The funny pictures that pop up after some answers. Never shown in exams."
              value={settings.reactions}
              options={[['often', 'Often'], ['sometimes', 'Sometimes'], ['off', 'Off']]}
              onChange={(v) => setSetting('reactions', v)} />

      <Choice id="set-motion" label="Reduce motion"
              hint="Turns off animations and moving effects. Helpful if motion makes you dizzy or unwell."
              value={settings.motion}
              options={[['device', 'Follow my device'], ['reduce', 'Always on']]}
              onChange={(v) => setSetting('motion', v)} />

      <Choice id="set-theme" label="Theme"
              value={theme}
              options={[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]}
              onChange={chooseTheme} />

      <p className="settings-note">Reactions and motion are saved to your account, so they follow you to other devices.</p>
    </Dialog>
  );
}

/** Mounted once (App.jsx); opens when the profile menu asks. */
export function SettingsDialogHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => onOpenSettingsDialog(() => setOpen(true)), []);
  if (!open) return null;
  return <SettingsDialog onClose={() => setOpen(false)} />;
}
