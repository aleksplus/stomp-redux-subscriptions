import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeEvery } from 'redux-saga/effects';

import { createErrorHandler } from '../src/handlersFactories';
import { createEnv, sleep, ERROR, START, STOP } from './sagaEnv';

const TIMEOUT = 200;

const watchErrors = (timeout = TIMEOUT) =>
  function* (): Generator<any, any, any> {
    yield takeEvery(ERROR, createErrorHandler(START, STOP, timeout));
  };

test('stops the subscription immediately and restarts it after the reconnect timeout', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchErrors());

  env.dispatch({ type: ERROR, payload: { id: 1 } });
  await sleep(50);

  // Stopped right away; the restart must not happen before the timeout,
  // which also proves the handler does not resolve its own take with the
  // stop action it just dispatched
  assert.deepEqual(env.payloadsOf(STOP), [{ id: 1 }]);
  assert.deepEqual(env.payloadsOf(START), []);

  await sleep(TIMEOUT + 100);
  assert.deepEqual(env.payloadsOf(START), [{ id: 1 }]);
});

test('gives up the restart when the same payload is stopped during the reconnect window', async () => {
  const env = createEnv();
  env.sagaMiddleware.run(watchErrors());

  env.dispatch({ type: ERROR, payload: { id: 1 } });
  await sleep(50);

  env.dispatch({ type: STOP, payload: { id: 1 } });
  await sleep(TIMEOUT + 150);

  assert.deepEqual(env.payloadsOf(START), []);
});

test('KNOWN RACE: a stop for a DIFFERENT payload also cancels the restart', async () => {
  // Characterizes review finding #1: the race resolves on take(STOP), which
  // matches by action type only, so an unrelated subscription's stop within
  // the window is mistaken for "we no longer subscribe" and this payload is
  // never restarted. Once the take filters by payload, flip this to assert
  // that exactly one START with { id: 1 } is dispatched.
  const env = createEnv();
  env.sagaMiddleware.run(watchErrors());

  env.dispatch({ type: ERROR, payload: { id: 1 } });
  await sleep(50);

  env.dispatch({ type: STOP, payload: { id: 999 } });
  await sleep(TIMEOUT + 150);

  assert.deepEqual(env.payloadsOf(START), []);
});

test('a second error during the window still leads to exactly one, delayed restart', async () => {
  // Characterizes review finding #2: overlapping handler instances (the
  // watcher uses takeEvery) - the second handler's stop resolves the first
  // handler's take, so only the second handler restarts, later than the
  // first window would have.
  const env = createEnv();
  env.sagaMiddleware.run(watchErrors());

  env.dispatch({ type: ERROR, payload: { id: 1 } }); // restart due at ~200
  await sleep(100);
  env.dispatch({ type: ERROR, payload: { id: 1 } }); // restart due at ~300
  await sleep(160); // t ~ 260: first window's deadline passed unused
  assert.deepEqual(env.payloadsOf(START), []);

  await sleep(TIMEOUT);
  assert.deepEqual(env.payloadsOf(START), [{ id: 1 }]);
});

test('dispatches every stop type when stopType is an array', async () => {
  const env = createEnv();
  const watchArrayStops = function* (): Generator<any, any, any> {
    yield takeEvery(
      ERROR,
      createErrorHandler(START, ['STOP_A', 'STOP_B'], 50),
    );
  };
  env.sagaMiddleware.run(watchArrayStops);

  env.dispatch({ type: ERROR, payload: { id: 1 } });
  await sleep(10);

  assert.deepEqual(env.payloadsOf('STOP_A'), [{ id: 1 }]);
  assert.deepEqual(env.payloadsOf('STOP_B'), [{ id: 1 }]);

  await sleep(100);
  assert.deepEqual(env.payloadsOf(START), [{ id: 1 }]);
});
