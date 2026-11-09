import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
test('Every local media path exists with exact case', () => {
  for (const [, path] of html.matchAll(/(?:src|poster)="([^"]+)"/g)) {
    if (!path.startsWith('https:')) assert.ok(existsSync(new URL('../public/' + path, import.meta.url)), path);
  }
  assert.equal([...html.matchAll(/<section\b/g)].length, 10);
});
test('Tap starts music, reveals invitation at 3.5 seconds, and music can pause/resume', async () => {
  const nodes = new Map(), timers = [];
  function node(id) {
    if (!nodes.has(id)) {
      const events = {}, attributes = {}, classes = new Set();
      const element = { style: {}, paused: true, textContent: '',
        classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
        addEventListener: (type, callback) => (events[type] ||= []).push(callback),
        emit: async type => { for (const callback of events[type] || []) await callback(); },
        setAttribute: (key, value) => attributes[key] = value,
        removeAttribute: key => delete attributes[key],
        getAttribute: key => attributes[key],
        play: async () => { element.paused = false; await element.emit('play'); },
        pause: () => { element.paused = true; void element.emit('pause'); },
        remove() {}, focus() {}
      };
      nodes.set(id, element);
    }
    return nodes.get(id);
  }
  const context = {
    document: { getElementById: node, documentElement: { style: {} }, querySelectorAll: () => [], querySelector: node },
    window: { scrollTo() {} },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {}, setInterval() {},
    IntersectionObserver: class { observe() {} },
  };
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  await node('tap').emit('click');
  assert.equal(node('backgroundMusic').paused, false);
  assert.equal(node('site').classList.contains('invitation-visible'), false);
  const transition = timers.find(timer => timer.delay === 3500);
  assert.ok(transition, 'Transition must start at 3500ms');
  transition.callback();
  assert.ok(node('site').classList.contains('invitation-visible'));
  assert.ok(node('opening').classList.contains('hide'));
  assert.equal(node('site').getAttribute('inert'), undefined);
  timers.find(timer => timer.delay === 1150).callback();
  assert.equal(node('openingVideo').paused, true);
  await node('musicToggle').emit('click');
  assert.equal(node('backgroundMusic').paused, true);
  assert.equal(node('musicToggle').getAttribute('aria-label'), 'Play music');
  await node('musicToggle').emit('click');
  assert.equal(node('backgroundMusic').paused, false);
  assert.equal(node('musicToggle').getAttribute('aria-label'), 'Pause music');
});
