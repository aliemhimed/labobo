/* Sends which option was picked for each question of a finished quiz, for
   the admin dashboard's question stats (see netlify/functions/answers.js).
   Fire and forget: a failure must never affect the quiz. */
import { authHeader } from './supabaseClient.js';

export async function recordAnswers(items) {
  const list = items.filter((x) => x.id).slice(0, 250);
  if (!list.length) return;
  try {
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ items: list }),
    });
  } catch {
    /* offline or functions not running */
  }
}
