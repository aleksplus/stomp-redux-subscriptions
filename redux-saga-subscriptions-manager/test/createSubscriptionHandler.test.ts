import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeEvery } from 'redux-saga/effects';

import { createSubscriptionHandler } from '../src/handlersFactories';
import {
  createEnv,
  sleep,
  payloadMatchingSelector,
  SUBS,
  START,
  STOP,
  SUBSCRIPTIONS_SUBSCRIBE,
  SUBSCRIPTIONS_UNSUBSCRIBE,
} from './sagaEnv';

const watchSubs = (startType = START, stopType: string | string[] = STOP) =>
  function* (): Generator<any, any, any> {
    yield takeEvery(
      SUBS,
      createSubscriptionHandler(
        payloadMatchingSelector as any,
        startType,
        stopType,
      ) as any,
    );
  };

const subscribe = (env: ReturnType<typeof createEnv>, payload: any) =>
  env.dispatch({ type: SUBS, method: SUBSCRIPTIONS_SUBSCRIBE, payload });

const unsubscribe = (env: ReturnType<typeof createEnv>, payload: any) =>
  env.dispatch({ type: SUBS, method: SUBSCRIPTIONS_UNSUBSCRIBE, payload });

test('dispatches START once, on the first subscribe for a payload', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchSubs());

  subscribe(env, { id: 1 });
  await sleep(20);
  subscribe(env, { id: 1 });
  await sleep(20);

  assert.deepEqual(env.payloadsOf(START), [{ id: 1 }]);
});

test('dispatches START separately per distinct payload', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchSubs());

  subscribe(env, { id: 1 });
  await sleep(20);
  subscribe(env, { id: 2 });
  await sleep(20);

  assert.deepEqual(env.payloadsOf(START), [{ id: 1 }, { id: 2 }]);
});

test('dispatches STOP only when the last subscriber for a payload leaves', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchSubs());

  subscribe(env, { id: 1 });
  await sleep(20);
  subscribe(env, { id: 1 });
  await sleep(20);

  unsubscribe(env, { id: 1 });
  await sleep(20);
  assert.deepEqual(env.payloadsOf(STOP), []);

  unsubscribe(env, { id: 1 });
  await sleep(20);
  assert.deepEqual(env.payloadsOf(STOP), [{ id: 1 }]);
});

test('dispatches every stop type when stopType is an array', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchSubs(START, ['STOP_A', 'STOP_B']));

  subscribe(env, { id: 1 });
  await sleep(20);
  unsubscribe(env, { id: 1 });
  await sleep(20);

  assert.deepEqual(env.payloadsOf('STOP_A'), [{ id: 1 }]);
  assert.deepEqual(env.payloadsOf('STOP_B'), [{ id: 1 }]);
});
