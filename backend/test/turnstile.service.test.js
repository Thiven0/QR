const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TURNSTILE_ENABLED = 'true';
process.env.TURNSTILE_MODE = 'simulated';

const turnstile = require('../src/services/turnstile.service');

test('simula la apertura y el cierre sin hardware conectado', async () => {
  const before = await turnstile.getStatus();
  assert.equal(before.mode, 'simulated');
  assert.equal(before.isOpen, false);

  const opened = await turnstile.open();
  assert.equal(opened.success, true);
  assert.equal(opened.response, 'OPENED');
  assert.equal(opened.isOpen, true);
  assert.ok(opened.lastResponseAt);

  const closed = await turnstile.close();
  assert.equal(closed.success, true);
  assert.equal(closed.response, 'CLOSED');
  assert.equal(closed.isOpen, false);
});

test('interpreta las respuestas diagnosticadas del firmware', () => {
  turnstile.handleLine('READY:TURNSTILE_V2:5000');
  turnstile.handleLine('OPENED:5000');
  assert.equal(turnstile.isOpen, true);

  turnstile.handleLine('CLOSED:AUTO');
  assert.equal(turnstile.isOpen, false);
});
