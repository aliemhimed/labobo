/* Client for /api/payments: the student's payment reference and the receipt
   they upload after a bank transfer (netlify/functions/payments.js). */
import { authHeader } from './supabaseClient.js';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 1800; // plenty to read a receipt, small enough to upload on mobile data

async function call(init = {}) {
  const res = await fetch('/api/payments', {
    ...init,
    headers: { ...(await authHeader()), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** { reference, request: { status, created_at, decided_at, note } | null } */
export const fetchPayment = (signal) => call({ signal });

/* Phone photos run to several megabytes. Redraw them at a readable size as a
   JPEG; if the browser can't decode the file, the original is tried as-is. */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.readAsDataURL(blob);
});

/** Uploads a receipt (a photo, a screenshot or a PDF) for an admin to check. */
export async function sendReceipt(file) {
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !file.type.startsWith('image/')) {
    throw new Error('Choose a photo or screenshot of the receipt, or a PDF.');
  }
  const blob = isPdf ? file : await shrink(file);
  if (blob.size > MAX_BYTES) throw new Error('That file is too large. Keep it under 4 MB.');
  return call({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: blob.type, data: await toBase64(blob) }),
  });
}
