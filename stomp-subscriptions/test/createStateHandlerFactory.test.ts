import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStateHandlerFactory } from '../src/createStateHandlerFactory';

const CONNECTION_ERROR = 'Connection-error, timeout';

const stompStub = (publishCalls?: any[]) =>
  ({
    publish: (call: any) => publishCalls?.push(call),
  } as any);

const heartbeat = (headers: Record<string, string>) => ({ headers } as any);

test('emits CONNECTION_ERROR when no heartbeat arrives within the timeout', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  createStateHandlerFactory((message) => emitted.push(message), 100);

  t.mock.timers.tick(99);
  assert.deepEqual(emitted, []);

  t.mock.timers.tick(1);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('heartbeat extends the deadline by the send guarantee (first heart-beat value)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  const onMessage = factory(stompStub());

  onMessage(heartbeat({ 'heart-beat': '5000,20000', 'reply-to': '/reply' }));

  // Budget is base timeout + sender's guaranteed send interval (5000), not the
  // second header value (20000)
  t.mock.timers.tick(100 + 5000 - 1);
  assert.deepEqual(emitted, []);

  t.mock.timers.tick(1);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('missing heart-beat header leaves the deadline at the base timeout', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  factory(stompStub())(heartbeat({ 'reply-to': '/reply' }));

  t.mock.timers.tick(99);
  assert.deepEqual(emitted, []);

  t.mock.timers.tick(1);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('send guarantee of 0 leaves the deadline at the base timeout', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  factory(stompStub())(heartbeat({ 'heart-beat': '0,20000' }));

  t.mock.timers.tick(100);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('non-numeric send interval falls back to the base timeout instead of firing immediately', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  factory(stompStub())(heartbeat({ 'heart-beat': 'soon,20000' }));

  // A garbage value must not turn the delay into NaN (setTimeout(NaN) fires
  // on the next tick)
  t.mock.timers.tick(1);
  assert.deepEqual(emitted, []);

  t.mock.timers.tick(100);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('empty send interval falls back to the base timeout', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  factory(stompStub())(heartbeat({ 'heart-beat': ',20000' }));

  t.mock.timers.tick(100);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('every heartbeat re-arms the deadline from scratch', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );
  const onMessage = factory(stompStub());

  onMessage(heartbeat({ 'heart-beat': '100,100' }));
  t.mock.timers.tick(90);

  // Deadline is now 90 + 100 + 100 = 290, not 200 + anything accumulated
  onMessage(heartbeat({ 'heart-beat': '100,100' }));
  t.mock.timers.tick(199);
  assert.deepEqual(emitted, []);

  t.mock.timers.tick(1);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('cleanup cancels the initial watchdog', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );

  factory.cleanup();
  t.mock.timers.tick(10_000_000);
  assert.deepEqual(emitted, []);
});

test('cleanup cancels a watchdog that a heartbeat re-armed', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const emitted: any[] = [];
  const factory = createStateHandlerFactory(
    (message) => emitted.push(message),
    100,
  );

  factory(stompStub())(heartbeat({ 'heart-beat': '1000,1000' }));
  factory.cleanup();
  t.mock.timers.tick(10_000_000);
  assert.deepEqual(emitted, []);
});

test('replies to the reply-to destination', () => {
  const publishCalls: any[] = [];
  const factory = createStateHandlerFactory(() => undefined, 100);

  factory(stompStub(publishCalls))(
    heartbeat({ 'heart-beat': '1000,1000', 'reply-to': '/queue/reply' }),
  );

  assert.deepEqual(publishCalls, [{ destination: '/queue/reply', body: '' }]);
});

test('does not publish a reply when the reply-to header is missing', () => {
  const publishCalls: any[] = [];
  const factory = createStateHandlerFactory(() => undefined, 100);

  factory(stompStub(publishCalls))(heartbeat({ 'heart-beat': '1000,1000' }));

  assert.deepEqual(publishCalls, []);
});
