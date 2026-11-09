import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { confirmed } from '../netlify/functions/rsvp.mjs';
const request = (data, origin = 'https://invitation.example') => new Request('https://invitation.example/api/rsvp', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(data)
});
test('Only explicit successful backend replies confirm receipt', () => {
  for (const reply of ['{"result":"success"}', '{"status":"success"}', '{"success":true}', '{"ok":true}', 'Success']) assert.equal(confirmed(reply), true);
  for (const reply of ['<html>Sign in</html>', '{"error":"denied"}', '{"status":"success","success":false}', '{}', '']) assert.equal(confirmed(reply), false);
});
test('Invalid submissions and cross-origin requests never reach Google', async () => {
  const before = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected upstream call'); };
  try {
    assert.equal((await handler(request({ name: '', attendance: 'yes' }))).status, 400);
    assert.equal((await handler(request({ name: 'Test', attendance: 'maybe' }))).status, 400);
    assert.equal((await handler(request({ name: 'Test', attendance: 'yes' }, 'https://other.example'))).status, 403);
    assert.equal((await handler(new Request('https://invitation.example/api/rsvp'))).status, 405);
  } finally { globalThis.fetch = before; }
});
test('Forwards original fields, confirms success, and rejects Google HTML errors', async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /^https:\/\/script.google.com\/macros\/s\//);
      assert.deepEqual(JSON.parse(options.body), { name: 'Test Guest', attendance: 'yes', message: 'Hello' });
      return new Response('{"result":"success"}');
    };
    assert.deepEqual(await (await handler(request({ name: ' Test Guest ', attendance: 'yes', message: ' Hello ' }))).json(), { ok: true });
    globalThis.fetch = async () => new Response('<html>Script error</html>');
    assert.equal((await handler(request({ name: 'Test', attendance: 'no' }))).status, 502);
    globalThis.fetch = async () => { throw new Error('Timeout'); };
    assert.equal((await handler(request({ name: 'Test', attendance: 'no' }))).status, 502);
  } finally { globalThis.fetch = before; }
});
