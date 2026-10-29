import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSubscription } from '../src/createSubscription';
import { getHandler } from '../src/handlersManager';

const CONNECTION_ERROR = 'Connection-error, timeout';

const createFakeStomp = () => {
  const subscriptionCallbacks = new Map<string, (message: any) => void>();
  const publishCalls: any[] = [];
  const subscribeCalls: any[] = [];
  return {
    connected: true,
    publishCalls,
    publish: (call: any) => {
      publishCalls.push(call);
    },
    subscribe: (
      destination: string,
      cb: (message: any) => void,
      headers: any,
    ) => {
      subscribeCalls.push({ destination, headers });
      subscriptionCallbacks.set(String(headers.id), cb);
    },
    unsubscribe: (id: string) => {
      subscriptionCallbacks.delete(String(id));
    },
    subscriptionCallbacks,
    subscribeCalls,
  };
};

// stomp.ts routes incoming frames through onUnhandledMessage ->
// getHandler(message.headers.subscription), so tests deliver the same way.
const deliver = (subId: string, message: any) => {
  const handler = getHandler(subId);
  if (!handler) {
    throw new Error(`no live message handler for ${subId}`);
  }
  handler(message);
};

const heartbeatFrame = (heartBeat: string) => ({
  body: JSON.stringify({ heartBeat: true }),
  headers: { 'heart-beat': heartBeat, 'reply-to': '/reply' },
});

test('registers the stomp subscription and routes heartbeats through the state handler', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const stomp = createFakeStomp();
  const emitted: any[] = [];
  createSubscription(
    stomp as any,
    { entity: '/data', subId: 'sub-1' },
    (message) => emitted.push(message),
    100,
  );

  assert.deepEqual(stomp.subscribeCalls, [
    { destination: '/data', headers: { id: 'sub-1' } },
  ]);

  deliver('sub-1', heartbeatFrame('50,50'));

  assert.deepEqual(stomp.publishCalls, [{ destination: '/reply', body: '' }]);
  assert.deepEqual(emitted, []);

  // Watchdog armed by the heartbeat: deadline is base timeout + 50
  t.mock.timers.tick(100 + 50);
  assert.deepEqual(emitted, [{ error: CONNECTION_ERROR }]);
});

test('emits parsed data messages', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const stomp = createFakeStomp();
  const emitted: any[] = [];
  createSubscription(
    stomp as any,
    { entity: '/data', subId: 'sub-2' },
    (message) => emitted.push(message),
    100,
  );

  deliver('sub-2', { body: JSON.stringify({ value: 42 }), headers: {} });

  assert.deepEqual(emitted, [{ value: 42 }]);
});

test('unsubscribe cancels the connection watchdog', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const stomp = createFakeStomp();
  const emitted: any[] = [];
  const subscription = createSubscription(
    stomp as any,
    { entity: '/data', subId: 'sub-3' },
    (message) => emitted.push(message),
    100,
  );

  // Re-arm the watchdog via a heartbeat, then tear the subscription down
  deliver('sub-3', heartbeatFrame('100,100'));
  subscription.unsubscribe();

  t.mock.timers.tick(10_000_000);
  assert.deepEqual(emitted, []);
});

test('unsubscribe removes the stomp subscription and the message handler', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const stomp = createFakeStomp();
  const subscription = createSubscription(
    stomp as any,
    { entity: '/data', subId: 'sub-4' },
    () => undefined,
    100,
  );

  subscription.unsubscribe();

  assert.equal(stomp.subscriptionCallbacks.size, 0);
  assert.equal(getHandler('sub-4'), undefined);
});

test('emits an error immediately when stomp is not connected', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const stomp = { ...createFakeStomp(), connected: false };
  const emitted: any[] = [];
  const subscription = createSubscription(
    stomp as any,
    { entity: '/data', subId: 'sub-5' },
    (message) => emitted.push(message),
    100,
  );

  assert.equal(emitted.length, 1);
  assert.ok(emitted[0] instanceof Error);
  assert.equal((emitted[0] as Error).message, "Stomp isn't connected");

  // Unsubscribing a subscription that never started must not throw, and no
  // watchdog may exist for it
  subscription.unsubscribe();
  t.mock.timers.tick(10_000_000);
  assert.equal(emitted.length, 1);
});
