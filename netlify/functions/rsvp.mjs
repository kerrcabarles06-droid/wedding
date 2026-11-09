// Same-origin bridge: a browser no-cors response cannot confirm an RSVP.
const originalEndpoint = 'https://script.google.com/macros/s/AKfycbyLRI8kUNLz7ly7vC14TcL2C0jQVFaF2pgXdTILBW9QsdDpnT2J5OnKMdjk1oWEBEUb/exec';
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
export function confirmed(text) {
  try {
    const data = JSON.parse(text);
    if (data.error || data.success === false || data.ok === false) return false;
    return data.success === true || data.ok === true ||
      data.status === 'success' || data.result === 'success';
  } catch {
    return /^success$/i.test(text.trim());
  }
}
export default async function handler(request) {
  if (request.method !== 'POST') return json({ ok: false }, 405);
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
    return json({ ok: false }, 403);
  let data;
  try {
    const body = await request.text();
    if (body.length > 12000) return json({ ok: false }, 413);
    data = JSON.parse(body);
  } catch { return json({ ok: false }, 400); }
  if (typeof data?.name !== 'string' || !data.name.trim() || data.name.trim().length > 150 ||
      !['yes', 'no'].includes(data.attendance) ||
      (data.message != null && (typeof data.message !== 'string' || data.message.length > 2000)))
    return json({ ok: false }, 400);
  const endpoint = process.env.RSVP_ENDPOINT || originalEndpoint;
  // Limit destinations to Google Apps Script; never expose a general proxy.
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint))
    return json({ ok: false }, 503);
  try {
    const result = await fetch(endpoint, {
      method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ name: data.name.trim(), attendance: data.attendance, message: (data.message || '').trim() })
    });
    const text = await result.text();
    if (!result.ok || !confirmed(text)) return json({ ok: false, unconfirmed: true }, 502);
    return json({ ok: true });
  } catch { return json({ ok: false, unconfirmed: true }, 502); }
}
